/**
 * pages-training.js — Training Mandatory Control (v2.5)
 * Field kontrol: Nama Inspector · Nama Training · Next Due Training (+ tanggal, sertifikat, penyelenggara)
 * Reminder otomatis via WhatsApp/Email: H-30, H-7, H-1, hari H, lalu tiap 7 hari setelah overdue (bisa diubah)
 */
const TR_NORM = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const TR_ADD_MONTHS = (ymd, n) => {
  const p = String(ymd).split('-').map(Number); if (p.length < 3 || !p[0]) return '';
  const d = new Date(Date.UTC(p[0], p[1] - 1 + n, 1)), last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(p[2], last)); return d.toISOString().substring(0, 10);
};
const TR_BADGE = { Valid: 'b-ok', 'Due Soon': 'b-warn', Overdue: 'b-err', 'Belum Terjadwal': 'b-pend' };
const trSisa = (r) => {
  if (r.sisaHari === '' || r.sisaHari === null || r.sisaHari === undefined) return '<span class="muted">—</span>';
  const d = Number(r.sisaHari), cls = d < 0 ? 'b-err' : r.status === 'Due Soon' ? 'b-warn' : 'b-ok';
  return '<span class="badge nc ' + cls + ' num">' + (d < 0 ? 'terlambat ' + UI.num(-d) + ' hr' : d === 0 ? 'HARI INI' : UI.num(d) + ' hari lagi') + '</span>';
};

function openTrainingForm(rec, preset, master, facets, onSaved) {
  const { h, icon } = UI;
  const isNew = !rec || !rec.trainingId, v = Object.assign({}, rec || {}, preset || {});
  const names = Array.from(new Set((facets.userInspectors || []).concat(facets.inspectors || [], (App.lookups && App.lookups.inspectors) || []))).sort();
  const trainings = Array.from(new Set(master.map(m => m.nama).concat(facets.trainings || [])));
  const m = UI.modal({ title: (isNew ? 'Tambah Training Inspector' : (preset && preset._perpanjang ? 'Perpanjang Training' : 'Edit Training ' + h(rec.trainingId))), size: 'lg', body:
    '<div class="form-grid">' +
    '<div class="field"><label for="tInsp">Nama Inspector <span class="req">*</span></label><input class="input" id="tInsp" list="tDlI" value="' + h(v.inspector || '') + '" placeholder="Pilih / ketik nama"><datalist id="tDlI">' + names.map(n => '<option value="' + h(n) + '">').join('') + '</datalist><span class="hint">No WA diambil dari User Management / CRM Kontak dengan nama yang sama.</span></div>' +
    '<div class="field"><label for="tTrn">Nama Training <span class="req">*</span></label><input class="input" id="tTrn" list="tDlT" value="' + h(v.training || '') + '" placeholder="mis. Basic QC Inspection"><datalist id="tDlT">' + trainings.map(n => '<option value="' + h(n) + '">').join('') + '</datalist><span class="hint" id="tTrnHint"></span></div>' +
    '<div class="field"><label for="tLast">Tanggal Training (terakhir)</label><input class="input" id="tLast" type="date" value="' + h(v.lastDate || '') + '"></div>' +
    '<div class="field"><label for="tDue">Next Due Training <span class="req">*</span></label><input class="input" id="tDue" type="date" value="' + h(v.nextDue || '') + '"><span class="hint" id="tDueHint">Jadwal reminder WA dihitung dari tanggal ini.</span></div>' +
    '<div class="field"><label for="tCert">No Sertifikat</label><input class="input" id="tCert" value="' + h(v.sertifikat || '') + '"></div>' +
    '<div class="field"><label for="tProv">Penyelenggara</label><input class="input" id="tProv" value="' + h(v.provider || '') + '" placeholder="Internal / LSP / vendor"></div>' +
    '<div class="field span2"><label for="tNote">Catatan</label><textarea class="input" id="tNote" rows="2">' + h(v.catatan || '') + '</textarea></div></div>',
    footer: '<button class="btn btn-ghost" data-c>Batal</button><button class="btn btn-primary" id="tSave" data-busy="Menyimpan…">' + icon('check') + 'Simpan</button>' });
  m.el.querySelector('[data-c]').onclick = m.close;
  let dueAuto = isNew || !!(preset && preset._perpanjang);
  const sync = () => {
    const mm = master.find(x => TR_NORM(x.nama) === TR_NORM(UI.$('#tTrn').value));
    UI.$('#tTrnHint').innerHTML = mm ? '<span style="color:var(--ok)">● Training wajib</span> · masa berlaku ' + mm.bulan + ' bulan' : (UI.$('#tTrn').value ? 'Training tambahan (bukan master wajib)' : '');
    if (mm && dueAuto && UI.$('#tLast').value) { UI.$('#tDue').value = TR_ADD_MONTHS(UI.$('#tLast').value, mm.bulan); UI.$('#tDueHint').textContent = 'Otomatis: tanggal training + ' + mm.bulan + ' bulan (boleh diubah).'; }
  };
  ['#tTrn', '#tLast'].forEach(s => UI.$(s).addEventListener('input', sync));
  UI.$('#tDue').addEventListener('input', () => { dueAuto = false; UI.$('#tDueHint').textContent = 'Jadwal reminder WA dihitung dari tanggal ini.'; });
  sync();
  UI.$('#tSave').onclick = () => UI.busy(UI.$('#tSave'), async () => {
    const t = { trainingId: isNew ? '' : rec.trainingId, inspector: UI.$('#tInsp').value.trim(), training: UI.$('#tTrn').value.trim(), lastDate: UI.$('#tLast').value, nextDue: UI.$('#tDue').value,
      sertifikat: UI.$('#tCert').value.trim(), provider: UI.$('#tProv').value.trim(), catatan: UI.$('#tNote').value.trim() };
    if (!t.inspector || !t.training) { UI.toast('Nama Inspector dan Nama Training wajib diisi.', 'error'); return; }
    const res = await API.call('training.save', { training: t });
    if (UI.showResult(res)) { m.close(); onSaved && onSaved(); }
  });
}

function openTrainingSettings(st, onSaved) {
  const { h, icon } = UI;
  const rows = (st.master || []).map(x => Object.assign({}, x));
  const m = UI.modal({ title: icon('sliders') + ' Pengaturan Training Mandatory', size: 'lg', body:
    '<h3 class="sec-title" style="font-size:14px;margin:0 0 8px">Master training wajib</h3><p class="small t2" style="margin:0 0 10px">Training wajib untuk setiap inspector beserta masa berlakunya. Next Due dihitung otomatis dari tanggal training.</p>' +
    '<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Nama training</th><th style="width:150px">Masa berlaku (bulan)</th><th style="width:44px"></th></tr></thead><tbody id="msBody"></tbody></table></div>' +
    '<button class="btn btn-ghost btn-sm" id="msAdd" style="margin-top:8px">' + icon('plus') + 'Tambah training wajib</button>' +
    '<div class="form-grid" style="margin-top:18px"><div class="field"><label for="msRem">Reminder WA sebelum next due (H-n)</label><input class="input" id="msRem" value="' + h((st.reminderHari || [30, 7, 1]).join(',')) + '"><span class="hint">Pisahkan koma, mis. 30,7,1. Reminder juga dikirim pada hari H.</span></div>' +
    '<div class="field"><label for="msOver">Ulangi reminder setelah overdue tiap (hari)</label><input class="input" id="msOver" type="number" min="1" max="60" value="' + h(st.overdueUlang || 7) + '"></div></div>' +
    '<div class="notice">' + icon('message') + '<div>Penerima: inspector (No WA dari User Management/CRM) + rekap harian ke Admin & Superadmin. Kanal & template pesan diatur di <a href="#/notifikasi">WhatsApp & Notifikasi</a> (event <b>Reminder Training Mandatory</b>). Status saat ini: ' +
    (st.notifAktif ? '<b style="color:var(--ok)">notifikasi aktif</b>' : '<b style="color:var(--err)">notifikasi nonaktif</b>') + (st.matriksWa === false ? ' · WA untuk event ini dimatikan di matriks' : '') + '.</div></div>',
    footer: '<button class="btn btn-ghost" data-c>Batal</button><button class="btn btn-primary" id="msSave" data-busy="Menyimpan…">' + icon('check') + 'Simpan pengaturan</button>' });
  m.el.querySelector('[data-c]').onclick = m.close;
  const draw = () => {
    UI.$('#msBody').innerHTML = rows.map((x, i) => '<tr><td><input class="input" data-n="' + i + '" value="' + h(x.nama) + '"></td><td><input class="input" type="number" min="1" max="120" data-b="' + i + '" value="' + h(x.bulan) + '"></td>' +
      '<td><button class="icon-btn" data-del="' + i + '" aria-label="Hapus" style="color:var(--err)">' + icon('trash') + '</button></td></tr>').join('') || '<tr><td colspan="3" class="muted small">Belum ada training wajib.</td></tr>';
    UI.$$('[data-n]', m.el).forEach(x => x.oninput = () => { rows[+x.dataset.n].nama = x.value; });
    UI.$$('[data-b]', m.el).forEach(x => x.oninput = () => { rows[+x.dataset.b].bulan = x.value; });
    UI.$$('[data-del]', m.el).forEach(x => x.onclick = () => { rows.splice(+x.dataset.del, 1); draw(); });
  };
  draw();
  UI.$('#msAdd').onclick = () => { rows.push({ nama: '', bulan: 12 }); draw(); const ins = UI.$$('[data-n]', m.el); if (ins.length) ins[ins.length - 1].focus(); };
  UI.$('#msSave').onclick = () => UI.busy(UI.$('#msSave'), async () => {
    const res = await API.call('training.settings', { master: rows.filter(x => String(x.nama).trim()), reminderHari: UI.$('#msRem').value, overdueUlang: UI.$('#msOver').value });
    if (UI.showResult(res)) { m.close(); onSaved && onSaved(); }
  });
}

Pages.training = {
  crumb: 'Training Mandatory Control', group: 'Quality & Compliance',
  defaults: () => ({ q: '', inspector: '', training: '', status: '', page: 1, per: 25, sort: 'nextDue', dir: 'asc' }),
  paramsOf: (st) => ({ q: st.q, inspector: st.inspector, training: st.training, status: st.status, page: st.page, per: st.per, sort: st.sort, dir: st.dir }),
  prefetch: () => ({ action: 'training.list', data: Pages.training.paramsOf(Object.assign(Pages.training.defaults(), Pages.training._st || {})) }),
  async render(el, r, ctx) {
    const { h, icon, num, pct, $ } = UI;
    const canEdit = App.can(App.ADM), isSA = App.can(App.SAO);
    const st = Object.assign(Pages.training.defaults(), Pages.training._st || {});
    if (Object.keys(r.q).length) Object.assign(st, { q: '', inspector: '', training: '', status: '', page: 1 }, r.q);
    Pages.training._st = st;
    const sel = new Set();
    let data = null;
    el.innerHTML =
      '<div class="ph"><div class="ph-title"><div class="eyebrow"><span>Quality & Compliance</span><span>• ISO 9001 §7.2 Kompetensi</span></div>' +
      '<h1>Training Mandatory Control</h1><p>Kontrol kompetensi inspector: nama training, next due, dan reminder otomatis via WhatsApp sebelum & sesudah jatuh tempo.</p></div>' +
      '<div class="ph-actions"><button class="btn btn-outline" id="trPrint">' + icon('printer') + 'Cetak Rekap (PDF)</button>' +
      (canEdit ? '<a class="btn btn-outline" href="#/import?ds=training">' + icon('sheet') + 'Import Excel</a><button class="btn btn-outline" id="trSet">' + icon('sliders') + 'Pengaturan</button><button class="btn btn-primary" id="trAdd">' + icon('plus') + 'Tambah Training</button>' : '') + '</div></div>' +
      '<div class="grid g4 mb" id="trKpi">' + Array.from({ length: 4 }, () => '<div class="kpi plain"><div class="skel" style="width:50%"></div><div class="skel" style="height:34px;margin-top:12px;width:40%"></div></div>').join('') + '</div>' +
      '<div id="trInfo"></div>' +
      '<section class="card mb flush"><div class="pad card-h" style="margin:0"><div><h2 class="sec-title">' + icon('award') + 'Matriks Inspector × Training Wajib</h2><div class="sec-sub">Hijau = valid · kuning = jatuh tempo ≤ H-' + '<span id="trH">30</span> · merah = overdue · abu = belum tercatat' + (canEdit ? ' · klik sel untuk isi/perbarui' : '') + '</div></div><span class="small muted" id="trMxNote"></span></div>' +
      '<div class="tbl-wrap"><table class="tbl dense tr-matrix"><thead id="trMxHead"></thead><tbody id="trMxBody">' + UI.skelRows(4, 6) + '</tbody></table></div></section>' +
      '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px"><div class="tabs" id="trTabs" role="tablist"></div>' +
      '<div class="filterbar" style="flex:1;justify-content:flex-end"><div class="input-icon" style="flex:0 1 300px">' + icon('search') + '<input class="input" id="trQ" placeholder="Cari inspector, training, sertifikat…" value="' + h(st.q) + '"></div>' +
      '<select class="select soft" id="trFi" aria-label="Inspector"></select><select class="select soft" id="trFt" aria-label="Training"></select></div></div>' +
      '<div class="card flush"><div id="trBulk"></div><div class="tbl-wrap"><table class="tbl"><thead id="trHead"></thead><tbody id="trBody">' + UI.skelRows(6, 9) + '</tbody></table></div><div id="trPager"></div></div>';

    const params = () => Pages.training.paramsOf(st);
    const reload = () => { API.invalidate(['training.list', 'getLookups']); App.loadLookups(); load(); };
    const openForm = (rec, preset) => openTrainingForm(rec, preset, (data && data.settings.master) || [], (data && data.facets) || {}, reload);
    const bulk = () => {
      $('#trBulk').innerHTML = sel.size && canEdit ? '<div class="bulkbar"><b>' + sel.size + ' dipilih</b><button class="btn btn-primary btn-xs" id="trRem" data-busy="Mengantre…">' + icon('send', 'sm') + 'Kirim reminder WA sekarang</button>' +
        (isSA ? '<button class="btn btn-soft-danger btn-xs" id="trDelSel">' + icon('trash', 'sm') + 'Hapus</button>' : '') + '<button class="btn btn-ghost btn-xs" id="trClr">Batal pilih</button></div>' : '';
      if (!sel.size || !canEdit) return;
      $('#trRem').onclick = (e) => UI.busy(e.currentTarget, async () => { const res = await API.call('training.remind', { ids: Array.from(sel) }); if (UI.showResult(res)) { if (res.data.tanpaKontak && res.data.tanpaKontak.length) UI.toast('Tanpa nomor WA/email: ' + res.data.tanpaKontak.join(', '), 'warn', 8000); sel.clear(); reload(); } });
      if (isSA) $('#trDelSel').onclick = () => del(Array.from(sel));
      $('#trClr').onclick = () => { sel.clear(); draw(data); };
    };
    const del = async (ids) => {
      const reason = await UI.confirm({ title: 'Hapus ' + ids.length + ' data training?', danger: true, okText: 'Hapus', input: true, inputLabel: 'Alasan penghapusan', message: 'Data di-soft delete dan tercatat di audit log. Reminder untuk data ini berhenti.' });
      if (!reason) return;
      const res = await API.call('training.delete', { ids, reason });
      if (UI.showResult(res)) { sel.clear(); reload(); }
    };
    const draw = (d) => {
      if (!ctx.isCurrent()) return;
      data = d; const k = d.kpi, S = d.settings, H = (S.reminderHari && S.reminderHari[0]) || 30;
      $('#trH').textContent = H;
      $('#trKpi').innerHTML =
        '<div class="kpi plain ' + (k.compliance >= 95 ? 'c-ok' : '') + '"><div class="kpi-top"><span class="kpi-label">Kepatuhan Training Wajib</span><span class="kpi-ico ok">' + icon('shield') + '</span></div><div class="kpi-val">' + pct(k.compliance) + '</div>' +
          '<div class="bar ok"><i style="width:' + Math.min(100, k.compliance) + '%"></i></div><div class="kpi-foot"><span>' + num(k.patuh) + ' dari ' + num(k.inspectors) + ' inspector patuh penuh</span>' + (k.kurang ? '<span class="muted">' + num(k.kurang) + ' belum tercatat</span>' : '') + '</div></div>' +
        '<div class="kpi plain click" data-st="Valid"><div class="kpi-top"><span class="kpi-label">Valid</span><span class="kpi-ico ok">' + icon('checkc') + '</span></div><div class="kpi-val">' + num(k.valid) + '<span class="unit">record</span></div><div class="kpi-foot"><span>Next due > H-' + H + '</span></div></div>' +
        '<div class="kpi plain c-warn click" data-st="Due Soon"><div class="kpi-top"><span class="kpi-label">Due Soon (≤ H-' + H + ')</span><span class="kpi-ico warn">' + icon('calendar') + '</span></div><div class="kpi-val">' + num(k.dueSoon) + '<span class="unit">record</span></div><div class="kpi-foot"><span>Menerima reminder WA H-' + (S.reminderHari || []).join(', H-') + '</span></div></div>' +
        '<div class="kpi plain c-err click" data-st="Overdue"><div class="kpi-top"><span class="kpi-label">Overdue</span><span class="kpi-ico err">' + icon('alertc') + '</span></div><div class="kpi-val">' + num(k.overdue) + '<span class="unit">record</span></div><div class="kpi-foot"><span>Reminder ulang tiap ' + S.overdueUlang + ' hari</span>' + (k.tanpaWa ? '<span style="color:var(--err)">' + num(k.tanpaWa) + ' tanpa No WA</span>' : '') + '</div></div>';
      UI.$$('#trKpi [data-st]').forEach(c => c.onclick = () => { st.status = st.status === c.dataset.st ? '' : c.dataset.st; st.page = 1; load(); });
      $('#trInfo').innerHTML = '<div class="notice ' + (S.notifAktif && S.matriksWa !== false ? '' : 'warn') + '" style="margin-top:0">' + icon(S.notifAktif ? 'message' : 'alert') + '<div><b>Reminder otomatis</b> — WhatsApp/Email ke inspector pada H-' + (S.reminderHari || []).join(', H-') + ', hari H, lalu tiap ' + S.overdueUlang + ' hari setelah overdue; rekap harian ke Admin & Superadmin. ' +
        (S.notifAktif ? (S.matriksWa === false ? 'WA untuk event ini dimatikan di matriks notifikasi.' : 'Status: <b style="color:var(--ok)">aktif</b>.') : 'Status: <b style="color:var(--err)">nonaktif</b> — aktifkan saklar WhatsApp/Email di menu ' + (canEdit ? '<a href="#/notifikasi">WhatsApp & Notifikasi</a>' : 'WhatsApp & Notifikasi') + '.') + '</div></div>';
      // Matriks
      const M = d.matrix, wajib = {}; M.wajib.forEach(w => { wajib[TR_NORM(w)] = 1; });
      $('#trMxNote').textContent = M.inspectors.length + ' inspector · ' + M.wajib.length + ' training wajib';
      $('#trMxHead').innerHTML = '<tr><th>Inspector</th>' + M.trainings.map(t => '<th class="c" title="' + h(t) + '">' + h(t) + (wajib[TR_NORM(t)] ? ' <span class="req">*</span>' : '') + '</th>').join('') + '<th class="c">Wajib terpenuhi</th></tr>';
      const per = {}; M.perInspector.forEach(x => { per[x.inspector] = x; });
      $('#trMxBody').innerHTML = M.inspectors.length ? M.inspectors.map(n => '<tr><td class="nw"><div class="who"><span class="mini-av">' + h(UI.initials(n)) + '</span><b>' + h(n) + '</b></div></td>' +
        M.trainings.map(t => {
          const c = M.cell[TR_NORM(n) + '|' + TR_NORM(t)];
          if (!c) return '<td class="c"><button class="mx-cell none" data-mx-i="' + h(n) + '" data-mx-t="' + h(t) + '" ' + (canEdit ? '' : 'disabled') + ' title="Belum tercatat">' + (wajib[TR_NORM(t)] ? '—' : '·') + '</button></td>';
          return '<td class="c"><button class="mx-cell ' + (TR_BADGE[c.status] || 'b-pend') + '" data-mx-id="' + h(c.id) + '" ' + (canEdit ? '' : 'disabled') + ' title="' + h(c.status) + ' · next due ' + h(c.nextDue) + '">' + UI.date(c.nextDue) + '</button></td>';
        }).join('') +
        '<td class="c"><span class="badge nc ' + (per[n] && per[n].patuh ? 'b-ok' : 'b-warn') + '">' + (per[n] ? per[n].ok + ' / ' + per[n].total : '—') + '</span></td></tr>').join('') :
        '<tr><td colspan="' + (M.trainings.length + 2) + '">' + UI.empty('Belum ada data training. ' + (canEdit ? 'Klik Tambah Training atau Import Excel.' : ''), 'award') + '</td></tr>';
      // Tabs & filter
      const T = d.tabs;
      $('#trTabs').innerHTML = [['', 'Semua', T.all, ''], ['Valid', 'Valid', T.Valid, ''], ['Due Soon', 'Due Soon', T['Due Soon'], 'warn'], ['Overdue', 'Overdue', T.Overdue, 'err']]
        .map(t => '<button class="tab ' + (st.status === t[0] ? 'on' : '') + '" data-t="' + t[0] + '" role="tab" aria-selected="' + (st.status === t[0]) + '">' + t[1] + '<span class="n ' + (st.status === t[0] ? '' : t[3]) + '">' + num(t[2]) + '</span></button>').join('');
      UI.$$('#trTabs [data-t]').forEach(b => b.onclick = () => { st.status = b.dataset.t; st.page = 1; load(); });
      $('#trFi').innerHTML = UI.opts(d.facets.inspectors, st.inspector, 'Semua inspector');
      $('#trFt').innerHTML = UI.opts(d.facets.trainings, st.training, 'Semua training');
      // Tabel
      $('#trHead').innerHTML = '<tr>' + (canEdit ? '<th style="width:34px"><input type="checkbox" id="trAll" aria-label="Pilih semua"></th>' : '') + UI.thSort('Nama Inspector', 'inspector', st) + UI.thSort('Nama Training', 'training', st) +
        UI.thSort('Tgl Training', 'lastDate', st) + UI.thSort('Next Due', 'nextDue', st) + UI.thSort('Sisa', 'sisaHari', st) + UI.thSort('Status', 'status', st) + '<th>Sertifikat</th><th>Reminder terakhir</th><th>Kontak</th>' + (canEdit ? '<th class="r">Aksi</th>' : '') + '</tr>';
      UI.bindSort($('#trHead'), st, load);
      const all = $('#trAll'); if (all) all.onchange = () => { d.rows.forEach(x => all.checked ? sel.add(x.trainingId) : sel.delete(x.trainingId)); draw(d); };
      $('#trBody').innerHTML = d.rows.length ? d.rows.map(x => {
        const rem = String(x.reminderTerakhir || '').split('|');
        return '<tr class="' + (sel.has(x.trainingId) ? 'sel ' : '') + (x.status === 'Overdue' ? 'row-err' : '') + '" data-id="' + h(x.trainingId) + '">' +
          (canEdit ? '<td><input type="checkbox" data-sel ' + (sel.has(x.trainingId) ? 'checked' : '') + ' aria-label="Pilih"></td>' : '') +
          '<td class="nw"><div class="who"><span class="mini-av">' + h(UI.initials(x.inspector)) + '</span><b>' + h(x.inspector) + '</b></div></td>' +
          '<td style="min-width:190px"><div class="cell-2"><b>' + h(x.training) + '</b><div class="s">' + (x.wajib ? '<span style="color:var(--ok)">● wajib</span>' : 'tambahan') + (x.provider ? ' · ' + h(x.provider) : '') + '</div></div></td>' +
          '<td class="nw small">' + UI.date(x.lastDate) + '</td><td class="nw"><b>' + UI.date(x.nextDue) + '</b></td><td class="nw">' + trSisa(x) + '</td>' +
          '<td><span class="badge ' + (TR_BADGE[x.status] || 'b-pend') + '">' + h(x.status) + '</span></td><td class="mono small">' + h(x.sertifikat || '—') + '</td>' +
          '<td class="small nw">' + (rem[0] ? '<b>' + h(rem[0]) + '</b> · ' + UI.date(rem[1]) : '<span class="muted">—</span>') + '</td>' +
          '<td class="nw small">' + (x.waAda ? '<span class="wa-badge ya">✓ WA</span>' : '<span class="wa-badge tidak" title="No WA tidak ditemukan di User/CRM">✕ WA</span>') + (x.emailAda ? ' ' + icon('mail', 'sm') : '') + '</td>' +
          (canEdit ? '<td class="r nw"><button class="icon-btn" data-ext title="Perpanjang (training ulang)" aria-label="Perpanjang">' + icon('refresh') + '</button><button class="icon-btn" data-edit title="Edit" aria-label="Edit">' + icon('edit') + '</button>' +
            (isSA ? '<button class="icon-btn" data-del title="Hapus" aria-label="Hapus" style="color:var(--err)">' + icon('trash') + '</button>' : '') + '</td>' : '') + '</tr>';
      }).join('') : '<tr><td colspan="11">' + UI.empty('Tidak ada data training yang cocok.', 'search') + '</td></tr>';
      const pg = $('#trPager'); pg.innerHTML = ''; pg.appendChild(UI.pager(d, (p, pr) => { st.page = p; st.per = pr; load(); }, { perOptions: [25, 50, 100], noun: 'training' }));
      bulk();
    };
    $('#trBody').addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-id]'); if (!tr || !data) return;
      const rec = data.rows.find(x => x.trainingId === tr.dataset.id);
      if (e.target.closest('[data-sel]')) { e.target.checked ? sel.add(rec.trainingId) : sel.delete(rec.trainingId); tr.classList.toggle('sel', e.target.checked); bulk(); return; }
      if (e.target.closest('[data-edit]')) openForm(rec);
      if (e.target.closest('[data-ext]')) openForm(rec, { lastDate: UI.todayYmd(), nextDue: '', sertifikat: '', _perpanjang: true });
      if (e.target.closest('[data-del]')) del([rec.trainingId]);
    });
    $('#trMxBody').addEventListener('click', async (e) => {
      const b = e.target.closest('.mx-cell'); if (!b || b.disabled || !canEdit) return;
      if (b.dataset.mxId) {
        let rec = data.rows.find(x => x.trainingId === b.dataset.mxId);
        if (!rec) { const res = await API.call('training.list', { q: '', page: 1, per: 500 }, { silent: true }); rec = res.success ? res.data.rows.find(x => x.trainingId === b.dataset.mxId) : null; }
        if (rec) openForm(rec);
      } else openForm(null, { inspector: b.dataset.mxI, training: b.dataset.mxT });
    });
    const load = async () => { try { await API.swr('training.list', params(), draw); } catch (e) { UI.showResult(e); } };
    $('#trQ').addEventListener('input', UI.debounce(() => { st.q = $('#trQ').value.trim(); st.page = 1; load(); }));
    $('#trFi').onchange = () => { st.inspector = $('#trFi').value; st.page = 1; load(); };
    $('#trFt').onchange = () => { st.training = $('#trFt').value; st.page = 1; load(); };
    $('#trPrint').onclick = () => UI.cetak('TRAINING_MATRIX', { q: st.q, inspector: st.inspector, training: st.training, status: st.status });
    if (canEdit) {
      $('#trAdd').onclick = () => openForm(null);
      $('#trSet').onclick = () => data && openTrainingSettings(data.settings, reload);
    }
    await load();
  }
};
