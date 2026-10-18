/**
 * pages-laporan.js — Laporan Finding (§5.3), Laporan Per Customer (§5.4), Laporan Periode (§5.5)
 */
const FD_FORM = [
  ['noNotif', 'No Notif (kosongkan = otomatis)', 'text'], ['tglMrir', 'Tanggal MRIR', 'date', 1], ['subject', 'Subject / Kategori', 'subject', 1], ['status', 'Status', 'fstatus', 1],
  ['po', 'No Purchase Order', 'text', 1], ['purchaser', 'Nama Purchaser', 'purchaser'], ['material', 'Material', 'text'], ['qty', 'Qty Item', 'number'],
  ['inspector', 'Inspector', 'inspector', 1], ['picUnit', 'PIC Unit (unit kerja purchaser)', 'pic', 1], ['area', 'Area Penyimpanan', 'area', 1], ['lokasi', 'Lokasi (Rak/Floor)', 'text', 1],
  ['updateStatus', 'Update Status (tanggal)', 'date'], ['desc', 'Deskripsi temuan', 'textarea']
];
/** Pilihan select selalu memuat nilai saat ini (mis. PIC Unit "TMC" dari Excel yang belum ada di Master Data) */
const optsCur = (arr, cur) => (cur && (arr || []).indexOf(cur) === -1 ? (arr || []).concat([cur]) : (arr || []));
function openFindingForm(f, onSaved) {
  const { h, icon } = UI; const L = App.lookups || {};
  const isNew = !f, v = f || { status: 'Open', tglMrir: UI.todayYmd() };
  const dl = (id, arr) => '<datalist id="' + id + '">' + (arr || []).map(x => '<option value="' + h(x) + '">').join('') + '</datalist>';
  const field = ([k, label, type, req]) => {
    const val = v[k] === undefined || v[k] === null ? '' : v[k];
    let inp;
    if (type === 'textarea') inp = '<textarea class="input" id="ff_' + k + '" rows="3">' + h(val) + '</textarea>';
    else if (type === 'subject') inp = '<select class="select" id="ff_' + k + '">' + UI.opts(optsCur(L.subjects, val), val, '— pilih —') + '</select>';
    else if (type === 'fstatus') inp = '<select class="select" id="ff_' + k + '">' + UI.opts(optsCur(L.findingStatus || ['Open', 'Closed'], val), val) + '</select>';
    else if (type === 'pic') inp = '<select class="select" id="ff_' + k + '">' + UI.opts(optsCur(L.picUnits, val), val, '— pilih —') + '</select>' + (App.can(App.ADM) ? '<span class="hint">Daftar PIC Unit diatur di <a href="#/master">Master Data</a>.</span>' : '');
    else if (type === 'inspector') inp = '<input class="input" id="ff_' + k + '" list="fdl_in" value="' + h(val) + '">' + dl('fdl_in', L.inspectors);
    else if (type === 'area') inp = '<input class="input" id="ff_' + k + '" list="fdl_ar" value="' + h(val) + '">' + dl('fdl_ar', L.areas);
    else if (type === 'purchaser') inp = '<input class="input" id="ff_' + k + '" list="fdl_pu" value="' + h(val) + '">' + dl('fdl_pu', L.purchasers);
    else inp = '<input class="input" id="ff_' + k + '" type="' + type + '" value="' + h(val) + '" ' + (k === 'noNotif' && !isNew ? 'disabled' : '') + '>';
    return '<div class="field ' + (type === 'textarea' ? 'span2' : '') + '"><label for="ff_' + k + '">' + h(label) + (req ? ' <span class="req">*</span>' : '') + '</label>' + inp + '</div>';
  };
  const m = UI.modal({ title: isNew ? 'Tambah Finding (MRIR)' : 'Edit Finding #' + h(f.noNotif), size: 'lg', body: '<div class="form-grid">' + FD_FORM.map(field).join('') + '</div>',
    footer: '<button class="btn btn-ghost" data-c>Batal</button><button class="btn btn-primary" id="ffSave" data-busy="Menyimpan…">' + icon('check') + 'Simpan Finding</button>' });
  m.el.querySelector('[data-c]').onclick = m.close;
  UI.$$('a[href="#/master"]', m.el).forEach(a => a.onclick = () => m.close());
  UI.$('#ffSave').onclick = () => UI.busy(UI.$('#ffSave'), async () => {
    const out = { _isNew: isNew };
    FD_FORM.forEach(([k]) => { const el = UI.$('#ff_' + k); if (el && !el.disabled) out[k] = el.value.trim(); });
    if (!isNew) { out.noNotif = f.noNotif; out.originalNoNotif = f.noNotif; }
    const miss = FD_FORM.filter(d => d[3] && !out[d[0]]); if (miss.length) { UI.toast('Wajib diisi: ' + miss.map(d => d[1]).join(', '), 'error', 6000); return; }
    const res = await API.call('saveFinding', { finding: out });
    if (UI.showResult(res)) { m.close(); API.invalidate(['getReportFinding', 'getDashboard', 'getFindingDetail', 'getReportCustomer', 'getReportPeriod', 'getData']); App.loadLookups(); onSaved && onSaved(res.data); }
  });
}
async function openFindingDetail(noNotif, onChanged) {
  const { h, icon, num } = UI;
  const m = UI.modal({ title: 'Finding #' + h(noNotif), size: 'lg', drawer: true, body: '<div class="skel" style="height:24px"></div><div class="skel" style="margin-top:12px"></div>' });
  const res = await API.call('getFindingDetail', { noNotif });
  if (!res.success) { m.close(); UI.showResult(res); return; }
  const { finding: f, materials, history } = res.data;
  const canEdit = App.can(App.ADM), isSA = App.can(App.SAO);
  const kv = (k, v, cls = '') => '<div class="kv-box ' + cls + '"><div class="k">' + k + '</div><div class="v">' + (v === '' || v === undefined || v === null ? '<span class="muted">—</span>' : v) + '</div></div>';
  const stList = (App.lookups && App.lookups.findingStatus) || ['Open', 'Under Investigation', 'Pending', 'Sent to Customer', 'Closed'];
  m.body.innerHTML =
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' + UI.fdBadge(f.status) + UI.agingBadge(f) + '<span class="badge b-info nc">' + h(f.subject) + '</span></div>' +
    '<div class="kv-grid">' + kv('Nama Purchaser', h(f.purchaser)) + kv('No Purchase Order', '<span class="mono">' + h(f.po) + '</span>') + kv('Inspector', h(f.inspector)) + kv('PIC Unit', h(f.picUnit)) +
    kv('Vendor', h(f.vendor)) + kv('Area Penyimpanan', h(f.area)) + kv('Lokasi (Rak/Floor)', h(f.lokasi)) + kv('Tanggal MRIR', UI.date(f.tglMrir)) + kv('Update Status', UI.date(f.updateStatus)) +
    kv('Qty Item', num(f.qty)) + kv('Material', '<span class="mono">' + h(f.material) + '</span>') + kv('Deskripsi temuan', h(f.desc), 'span2') + '</div>' +
    (canEdit ? '<div class="card pad-s mt" style="background:var(--alt);box-shadow:none"><b class="small">Ubah status cepat</b><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
      stList.filter(s => s !== f.status).map(s => '<button class="btn btn-outline btn-sm" data-qs="' + h(s) + '">' + h(s) + '</button>').join('') + '</div>' +
      (App.can(App.ADM) ? '<div class="xs muted" style="margin-top:8px">Daftar status diatur di Master Data.</div>' : '') + '</div>' : '') +
    '<h3 class="sec-title mt" style="font-size:14px">Material terkait PO (' + materials.length + ')</h3>' +
    (materials.length ? '<div class="tbl-wrap"><table class="tbl dense"><tbody>' + materials.map(o => '<tr class="click" data-md="' + h(o.id) + '"><td class="code-link">' + h(o.material) + '</td><td class="ellip">' + h(o.desc) + '</td><td class="r num nw">' + num(o.qty) + ' ' + h(o.unit) + '</td><td>' + UI.mriBadge(o.status) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="small muted">Tidak ada material dengan PO ini di Master Data.</p>') +
    '<h3 class="sec-title mt" style="font-size:14px;margin-bottom:10px">Riwayat</h3>' +
    (history.length ? '<ul class="timeline">' + history.map(a => '<li><div class="t">' + UI.dt(a.ts) + ' · ' + h(a.name) + ' · <b>' + h(a.action) + '</b></div><div class="small">' + h(a.details) + '</div></li>').join('') + '</ul>' : '<p class="small muted">Belum ada riwayat perubahan.</p>') +
    '<div style="display:flex;gap:8px;margin-top:20px;flex-wrap:wrap">' + (canEdit ? '<button class="btn btn-primary" id="fdEdit">' + icon('edit') + 'Edit finding</button>' : '') +
    (isSA ? '<button class="btn btn-soft-danger" id="fdDel">' + icon('trash') + 'Hapus</button>' : '') + '<button class="btn btn-outline" id="fdPrint">' + icon('printer') + 'Cetak MRIR (PDF)</button>' +
    '<a class="btn btn-ghost" href="#/inspeksi?q=' + encodeURIComponent(f.po) + '">' + icon('table') + 'Lihat item PO</a></div>';
  UI.$('#fdPrint').onclick = () => UI.cetak('NCR', { ref: f.noNotif });
  UI.$$('[data-md]', m.body).forEach(t => t.onclick = () => { m.close(); location.hash = '#/inspeksi/' + encodeURIComponent(t.dataset.md); });
  UI.$$('a[href^="#/inspeksi"]', m.body).forEach(a => a.addEventListener('click', () => m.close()));
  UI.$$('[data-qs]', m.body).forEach(b => b.onclick = () => UI.busy(b, async () => {
    const r = await API.call('saveFinding', { finding: { noNotif: f.noNotif, status: b.dataset.qs } });
    if (UI.showResult(r)) { m.close(); API.invalidate(['getReportFinding', 'getDashboard', 'getFindingDetail', 'getData']); App.loadLookups(); onChanged ? onChanged() : App.go(); }
  }));
  if (canEdit) UI.$('#fdEdit').onclick = () => { m.close(); openFindingForm(f, () => onChanged ? onChanged() : App.go()); };
  if (isSA) UI.$('#fdDel').onclick = async () => {
    const reason = await UI.confirm({ title: 'Hapus finding #' + f.noNotif + '?', danger: true, okText: 'Hapus', input: true, inputLabel: 'Alasan penghapusan', message: 'Finding akan di-soft delete dan tercatat di audit log.' });
    if (!reason) return;
    const r = await API.call('deleteFinding', { ids: [f.noNotif], reason });
    if (UI.showResult(r)) { m.close(); API.invalidate(); onChanged ? onChanged() : App.go(); }
  };
}

// ============================================================================
Pages.finding = {
  crumb: 'Laporan Finding (MRIR)', usesPeriod: true, group: 'Reports',
  defaults: () => ({ tab: 'all', q: '', subject: '', status: '', vendor: '', purchaser: '', area: '', pic: '', aging: '', from: '', to: '', page: 1, per: 10, sort: 'tglMrir', dir: 'desc' }),
  paramsOf: (st) => {
    const P = App.period, p = { q: st.q, subject: st.subject, status: st.status, vendor: st.vendor, purchaser: st.purchaser, area: st.area, pic: st.pic, aging: st.aging, tab: st.tab, page: st.page, per: st.per, sort: st.sort, dir: st.dir };
    if (st.from || st.to) Object.assign(p, { period: 'custom', from: st.from || '1900-01-01', to: st.to || UI.todayYmd() }); else Object.assign(p, { period: P.period, from: P.from, to: P.to });
    return p;
  },
  prefetch: () => ({ action: 'getReportFinding', data: Pages.finding.paramsOf(Object.assign(Pages.finding.defaults(), Pages.finding._st || {})) }),
  async render(el, r, ctx) {
    const { h, icon, num, pct, $ } = UI;
    const canEdit = App.can(App.ADM);
    const st = Object.assign(Pages.finding.defaults(), Pages.finding._st || {});
    const CLEAR = { tab: 'all', q: '', subject: '', status: '', vendor: '', purchaser: '', area: '', pic: '', aging: '', page: 1 };
    if (Object.keys(r.q).length) Object.assign(st, CLEAR, r.q);
    Pages.finding._st = st;
    const topN = Pages.finding._topN || 5;
    el.innerHTML =
      '<div class="ph"><div class="ph-title"><h1>Laporan Finding <span class="muted" style="font-weight:500;font-size:20px">(Material Receiving Inspection Report)</span></h1>' +
      '<p>Analisis temuan inspeksi (MRIR), purchaser & unit kerja yang paling banyak terkena finding, dan monitoring aging karantina material — ' + h(App.periodLabel()) + '.</p></div>' +
      '<div class="ph-actions"><button class="btn btn-outline" id="fPrint">' + icon('printer') + 'MRIR Summary (PDF)</button>' +
      '<button class="btn btn-outline" id="fExp" data-busy="Menyiapkan…">' + icon('download') + 'Export Excel</button>' + (canEdit ? '<button class="btn btn-primary" id="fAdd">' + icon('plus') + 'Tambah Finding</button>' : '') + '</div></div>' +
      '<div class="grid g4 mb" id="fKpi">' + Array.from({ length: 4 }, () => '<div class="kpi plain"><div class="skel" style="width:50%"></div><div class="skel" style="height:34px;margin-top:12px;width:40%"></div></div>').join('') + '</div>' +
      '<div class="grid g-8-4 mb"><div class="grid" style="gap:20px">' +
      '<section class="card"><div class="card-h"><div><h2 class="sec-title">' + icon('users') + 'Top Purchaser (finding terbanyak)</h2><div class="sec-sub">Klik nama untuk memfilter tabel</div></div>' +
      '<div style="display:flex;gap:10px;align-items:center"><span class="small muted" id="puTot"></span><div class="seg" id="puTop"><button data-n="5">Top 5</button><button data-n="10">Top 10</button></div></div></div><div id="fPurch"></div></section>' +
      '<section class="card flush"><div class="pad card-h" style="margin:0"><div><h2 class="sec-title">' + icon('sliders') + 'Statistik Unit Kerja Purchaser (PIC Unit)</h2><div class="sec-sub">Jumlah finding per unit kerja (mis. TME, TRS, TMC) — klik baris untuk memfilter</div></div></div>' +
      '<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>PIC Unit</th><th class="r">Finding</th><th style="min-width:120px">Porsi</th><th class="r">Belum closed</th><th class="r" id="thUrg">≥ 30 hari</th><th class="r">Closed</th><th class="r">Purchaser</th></tr></thead><tbody id="fUnit"></tbody></table></div></section></div>' +
      '<section class="card"><div class="card-h" style="margin-bottom:12px"><h2 class="sec-title">' + icon('filter') + 'Filter Finding Matrix</h2><button class="link-btn small" id="fReset">Reset all</button></div>' +
      '<div class="field" style="margin-bottom:10px"><label class="lbl up">Rentang Tanggal MRIR</label><div style="display:flex;gap:6px"><input type="date" class="input soft" id="fFrom" value="' + h(st.from) + '" aria-label="Dari"><input type="date" class="input soft" id="fTo" value="' + h(st.to) + '" aria-label="Sampai"></div><span class="hint">Kosong = mengikuti periode di atas</span></div>' +
      '<div class="field" style="margin-bottom:10px"><label class="lbl up" for="fSt">Status</label><select class="select soft" id="fSt"></select></div>' +
      '<div class="field" style="margin-bottom:10px"><label class="lbl up" for="fPu">Nama Purchaser</label><select class="select soft" id="fPu"></select></div>' +
      '<div class="field" style="margin-bottom:10px"><label class="lbl up" for="fPic">PIC Unit (unit kerja purchaser)</label><select class="select soft" id="fPic"></select></div>' +
      '<div class="field" style="margin-bottom:10px"><label class="lbl up" for="fSub">Subject / Finding type</label><select class="select soft" id="fSub"></select></div>' +
      '<div class="field" style="margin-bottom:10px"><label class="lbl up" for="fArea">Storage location / area</label><select class="select soft" id="fArea"></select></div>' +
      '<div class="field" style="margin-bottom:14px"><label class="lbl up" for="fVen">Vendor</label><select class="select soft" id="fVen"></select></div>' +
      '<button class="btn btn-primary btn-block" id="fApply">' + icon('sliders') + 'Terapkan Filter</button></section></div>' +
      '<div class="tabs-row"><div class="tabs scroll" id="fTabs" role="tablist"></div>' +
      '<div class="input-icon" style="flex:0 1 340px">' + icon('search') + '<input class="input" id="fq" placeholder="Cari no notif, PO, purchaser, inspector…" value="' + h(st.q) + '" aria-label="Cari finding"></div></div>' +
      '<div class="card flush"><div class="tbl-wrap"><table class="tbl"><thead id="fHead"></thead><tbody id="fBody">' + UI.skelRows(8, 9) + '</tbody></table></div><div id="fPager"></div></div>';

    const params = () => Pages.finding.paramsOf(st);
    let last = null;
    const drawPurch = () => {
      const d = last; if (!d) return;
      const n = Pages.finding._topN || 5, list = d.topPurchasers.slice(0, n), maxC = Math.max(1, ...list.map(x => x.count));
      UI.$$('#puTop button').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
      $('#puTot').textContent = num(d.purchaserCount) + ' purchaser';
      $('#fPurch').innerHTML = list.length ? list.map((x, i) => '<div class="dist-row ' + (st.purchaser === x.name ? 'active' : '') + '" data-pu="' + h(x.name) + '" tabindex="0" role="button"><div class="dist-name"><span class="rank">' + (i + 1) + '</span>' + h(x.name) +
        (x.unit ? ' <span class="badge b-info nc" style="margin-left:6px">' + h(x.unit) + '</span>' : '') + (x.urgent ? ' <span class="badge b-err nc">' + num(x.urgent) + ' ≥ ' + d.kpi.agingKritis + ' hr</span>' : '') + '</div>' +
        '<div class="dist-val">' + num(x.count) + '<span class="p">(' + pct(x.pct) + ') · ' + num(x.open) + ' open</span></div><div class="dist-bar"><i style="width:' + (x.count / maxC * 100) + '%;opacity:' + (1 - i * 0.06) + '"></i></div></div>').join('') : UI.empty('Tidak ada finding pada filter ini.');
      UI.$$('#fPurch [data-pu]').forEach(x => { const f = () => { st.purchaser = st.purchaser === x.dataset.pu ? '' : x.dataset.pu; st.page = 1; load(); }; x.onclick = f; x.onkeydown = (e) => { if (e.key === 'Enter') f(); }; });
    };
    const draw = (d) => {
      if (!ctx.isCurrent()) return;
      last = d; const k = d.kpi;
      $('#fKpi').innerHTML =
        '<div class="kpi plain click" data-tab="all"><div class="kpi-top"><span class="kpi-label">Total Findings</span><span class="kpi-ico">' + icon('archive') + '</span></div><div class="kpi-val">' + num(k.total) + (k.deltaMonth !== null ? UI.delta(k.deltaMonth, { invert: true, title: 'Bulan ini vs bulan lalu' }) : '') + '</div><div class="kpi-foot"><span>' + num(k.thisMonth) + ' finding tercatat bulan ini</span></div></div>' +
        '<div class="kpi plain click" data-tab="open"><div class="kpi-top"><span class="kpi-label">Belum Closed</span><span class="kpi-ico err">' + icon('alertc') + '</span></div><div class="kpi-val">' + num(k.open) + (k.urgent ? '<span class="badge b-err nc">! Action needed</span>' : '') + '</div>' +
          '<div class="kpi-foot"><span class="click-txt" data-aging="crit" style="color:var(--err)" title="Finding yang belum closed dengan umur sejak Tanggal MRIR ≥ ' + k.agingKritis + ' hari (batas diatur di System Config)">' + num(k.urgent) + ' finding open ≥ ' + k.agingKritis + ' hari</span></div></div>' +
        '<div class="kpi plain click" data-tab="closed"><div class="kpi-top"><span class="kpi-label">Closed / Resolved</span><span class="kpi-ico ok">' + icon('checkc') + '</span></div><div class="kpi-val">' + num(k.closed) + '<span class="badge b-pend nc">' + pct(k.closedRate) + ' rate</span></div><div class="kpi-foot"><span>Rata-rata durasi penyelesaian: ' + num(k.avgResolution, 1) + ' hari</span></div></div>' +
        '<div class="kpi plain"><div class="kpi-top"><span class="kpi-label">Avg Aging Quarantine</span><span class="kpi-ico">' + icon('clock') + '</span></div><div class="kpi-val">' + num(k.avgAging, 1) + '<span class="unit">hari</span>' + (k.avgAging >= k.agingWarn ? '<span class="badge b-warn nc">≥ ' + k.agingWarn + ' hr</span>' : '') + '</div><div class="kpi-foot"><span>Maks aging: ' + num(k.maxAging) + ' hari' + (k.maxRef ? ' (' + h(k.maxRef) + ')' : '') + '</span></div></div>';
      UI.$$('#fKpi [data-tab]').forEach(c => c.onclick = (e) => { if (e.target.closest('[data-aging]')) { Object.assign(st, { tab: 'open', aging: 'crit', page: 1 }); load(); return; } st.tab = c.dataset.tab; st.aging = ''; st.page = 1; load(); });
      drawPurch();
      // Statistik per PIC Unit
      $('#thUrg').textContent = '≥ ' + k.agingKritis + ' hari';
      const maxU = Math.max(1, ...d.picUnits.map(u => u.count));
      $('#fUnit').innerHTML = d.picUnits.length ? d.picUnits.map(u => '<tr class="click ' + (st.pic === u.unit ? 'sel' : '') + '" data-pic="' + h(u.unit) + '"><td><b>' + h(u.unit) + '</b></td><td class="r num"><b>' + num(u.count) + '</b></td>' +
        '<td><div style="display:flex;align-items:center;gap:6px"><div class="bar" style="flex:1;margin:0"><i style="width:' + (u.count / maxU * 100) + '%"></i></div><span class="xs muted num">' + pct(u.pct, 0) + '</span></div></td>' +
        '<td class="r num" style="' + (u.open ? 'color:var(--err);font-weight:600' : '') + '">' + num(u.open) + '</td><td class="r num">' + (u.urgent ? '<span class="badge b-err nc">' + num(u.urgent) + '</span>' : '0') + '</td><td class="r num">' + num(u.closed) + '</td><td class="r num">' + num(u.purchasers) + '</td></tr>').join('') :
        '<tr><td colspan="7">' + UI.empty('Tidak ada finding pada filter ini.') + '</td></tr>';
      UI.$$('#fUnit [data-pic]').forEach(x => x.onclick = () => { st.pic = st.pic === x.dataset.pic ? '' : x.dataset.pic; st.page = 1; load(); });
      const fc = d.facets;
      $('#fSub').innerHTML = UI.opts(fc.subjects, st.subject, 'Semua subject'); $('#fSt').innerHTML = UI.opts(fc.statuses, st.status, 'Semua status');
      $('#fPu').innerHTML = UI.opts(fc.purchasers, st.purchaser, 'Semua purchaser');
      $('#fArea').innerHTML = UI.opts(fc.areas, st.area, 'Semua area'); $('#fPic').innerHTML = UI.opts(fc.pics, st.pic, 'Semua PIC unit'); $('#fVen').innerHTML = UI.opts(fc.vendors, st.vendor, 'Semua vendor');
      // Tab per STATUS (mengikuti Master Data)
      $('#fTabs').innerHTML = d.tabs.map(t => {
        const tone = t.key === 'open' ? 'err' : t.key.indexOf('s:') === 0 && !t.closed ? (UI.fdTone(t.label) === 'b-err' ? 'err' : 'warn') : '';
        return '<button class="tab ' + (st.tab === t.key ? 'on' : '') + '" data-t="' + h(t.key) + '" role="tab" aria-selected="' + (st.tab === t.key) + '">' + h(t.label) + '<span class="n ' + (st.tab === t.key ? '' : tone) + '">' + num(t.n) + '</span></button>';
      }).join('');
      UI.$$('#fTabs [data-t]').forEach(b => b.onclick = () => { st.tab = b.dataset.t; st.page = 1; load(); });
      $('#fHead').innerHTML = '<tr>' + UI.thSort('No Notif', 'noNotif', st) + UI.thSort('Inspector', 'inspector', st) + UI.thSort('Subject / Category', 'subject', st) + UI.thSort('Purchaser · PIC Unit', 'purchaser', st) +
        UI.thSort('PO · Vendor', 'po', st) + UI.thSort('Storage Area & Rack', 'area', st) + UI.thSort('Tanggal MRIR', 'tglMrir', st) + UI.thSort('Status', 'status', st) + UI.thSort('Aging', 'aging', st, 'r') + '</tr>';
      UI.bindSort($('#fHead'), st, load);
      $('#fBody').innerHTML = d.rows.length ? d.rows.map(f => '<tr class="click ' + (f.agingLevel === 'crit' ? 'row-warn' : '') + '" data-nf="' + h(f.noNotif) + '"><td class="code-link nw">#' + h(f.noNotif) + '</td>' +
        '<td><div class="who"><span class="mini-av">' + h(UI.initials(f.inspector)) + '</span><span class="nw">' + h(f.inspector) + '</span></div></td>' +
        '<td><div class="cell-2"><b>' + h(f.subject) + '</b><div class="s ellip" style="max-width:200px">' + h(f.desc || '') + '</div></div></td>' +
        '<td><div class="cell-2"><span class="nw">' + (f.purchaser ? h(f.purchaser) : '<span class="muted">—</span>') + '</span><div class="s">' + h(f.picUnit || '') + '</div></div></td>' +
        '<td><div class="cell-2"><span class="mono muted">' + h(f.po) + '</span><div class="s ellip" style="max-width:180px" title="' + h(f.vendor) + '">' + h(f.vendor) + '</div></div></td>' +
        '<td class="ellip" style="max-width:200px"><span style="color:' + (/quarantine|karantina/i.test(f.area) ? 'var(--err)' : 'var(--primary)') + '">' + icon('pin', 'sm') + '</span> ' + h(f.area) + (f.lokasi ? ' / ' + h(f.lokasi) : '') + '</td>' +
        '<td class="nw small">' + UI.date(f.tglMrir) + '</td><td>' + UI.fdBadge(f.status) + '</td><td class="r nw">' + UI.agingBadge(f) + '</td></tr>').join('') :
        '<tr><td colspan="9">' + UI.empty('Tidak ada finding yang cocok.', 'search') + '</td></tr>';
      const pg = $('#fPager'); pg.innerHTML = ''; pg.appendChild(UI.pager(d, (p, per) => { st.page = p; st.per = per; load(); }, { perOptions: [10, 25, 50, 100], noun: 'finding' }));
    };
    $('#fBody').addEventListener('click', (e) => { const tr = e.target.closest('[data-nf]'); if (tr) openFindingDetail(tr.dataset.nf, load); });
    UI.$$('#puTop button').forEach(b => b.onclick = () => { Pages.finding._topN = +b.dataset.n; drawPurch(); });
    const load = async () => { try { await API.swr('getReportFinding', params(), draw); } catch (e) { UI.showResult(e); } };
    $('#fApply').onclick = () => { Object.assign(st, { subject: $('#fSub').value, status: $('#fSt').value, purchaser: $('#fPu').value, area: $('#fArea').value, pic: $('#fPic').value, vendor: $('#fVen').value, from: $('#fFrom').value, to: $('#fTo').value, page: 1 }); load(); };
    $('#fReset').onclick = () => { Object.assign(st, CLEAR, { from: '', to: '' }); $('#fFrom').value = ''; $('#fTo').value = ''; $('#fq').value = ''; history.replaceState(null, '', '#/finding'); load(); };
    $('#fq').addEventListener('input', UI.debounce(() => { st.q = $('#fq').value.trim(); st.page = 1; load(); }));
    $('#fExp').onclick = (e) => UI.doExport(e.currentTarget, 'finding', Object.assign(params(), { page: 1 }));
    $('#fPrint').onclick = () => { const p = params(); delete p.page; delete p.per; UI.cetak('NCR_SUMMARY', p); };
    if (canEdit) $('#fAdd').onclick = () => openFindingForm(null, load);
    void topN;
    await load();
  }
};

// ============================================================================
Pages.customer = {
  crumb: 'Laporan Per Customer', usesPeriod: true, group: 'Reports',
  prefetch: () => ({ action: 'getReportCustomer', data: Object.assign({ period: App.period.period, from: App.period.from, to: App.period.to }, Pages.customer._tp ? { typePo: Pages.customer._tp } : {}) }),
  async render(el, r, ctx) {
    const { h, icon, num, pct, $ } = UI;
    const P = App.period;
    const st = { q: r.q.q || '', flag: '', sort: 'total', dir: 'desc', page: 1, per: 10, typePo: r.q.typePo !== undefined ? r.q.typePo : (Pages.customer._tp || '') };
    Pages.customer._tp = st.typePo;
    let topSub = Pages.customer._topSub || 5;
    el.innerHTML =
      '<div class="ph"><div class="ph-title"><h1>Laporan Per Customer <span class="badge b-info nc">Vendor & Purchaser Performance</span></h1>' +
      '<p>Performa pengiriman, tingkat kepatuhan kualitas, turnaround time (TAT), dan rekap temuan (MRIR) per mitra — ' + h(App.periodLabel()) + '.</p></div>' +
      '<div class="ph-actions"><button class="btn btn-outline" id="cPrint">' + icon('printer') + 'SLA Summary (PDF)</button><button class="btn btn-primary" id="cExp" data-busy="Menyiapkan…">' + icon('download') + 'Export Customer Report</button></div></div>' +
      '<div class="card pad-s mb"><div class="filterbar"><div class="grow input-icon">' + icon('search') + '<input class="input soft" id="cq" placeholder="Cari customer / vendor / kode…" value="' + h(st.q) + '"></div>' +
      '<div class="typepo-bar"><span class="lbl up">Type PO</span><div class="seg" id="cType"></div></div>' +
      '<div class="seg" id="cFlag"><button class="on" data-f="">Semua mitra</button><button data-f="below">Di bawah target</button></div></div></div>' +
      '<div class="grid g3 mb" id="cKpi">' + Array.from({ length: 3 }, () => '<div class="kpi"><div class="skel" style="width:50%"></div><div class="skel" style="height:34px;margin-top:12px;width:40%"></div></div>').join('') + '</div>' +
      '<div class="grid g2 mb"><section class="card"><div class="card-h"><h2 class="sec-title">' + icon('trophy') + 'Vendor Performance Quadrant</h2><span class="small muted">Berdasar pass rate, open finding & TAT</span></div><div class="grid g2" id="cQuad" style="gap:14px"></div><div class="card-f" id="cQuadF"></div></section>' +
      '<section class="card"><div class="card-h"><div><h2 class="sec-title">' + icon('alert') + 'Finding Distribution by Subject</h2><div class="sec-sub">Kategori temuan (MRIR) terbanyak periode ini</div></div><div class="seg" id="cTop"><button data-n="5">Top 5</button><button data-n="10">Top 10</button></div></div><div id="cSev"></div><div class="card-f" id="cSevF"></div></section></div>' +
      '<section class="card flush"><div class="pad card-h" style="margin:0"><h2 class="sec-title">' + icon('table') + 'Partner Inspection Metric Matrix <span class="badge b-pend nc" id="cCnt"></span></h2><span class="small muted">Klik baris untuk drill-down</span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead id="cHead"></thead><tbody id="cBody">' + UI.skelRows(8, 10) + '</tbody></table></div><div id="cPager"></div></section>';
    let data = null;
    const params = () => Object.assign({ period: P.period, from: P.from, to: P.to }, st.typePo ? { typePo: st.typePo } : {});
    const tpBadges = (tp) => Object.keys(tp || {}).sort((a, b) => tp[b] - tp[a]).map(k => '<span class="badge b-info nc" title="' + num(tp[k]) + ' item">' + h(k) + '</span>').join(' ') || '<span class="muted">—</span>';
    const drawTable = () => {
      if (!data) return;
      let rows = data.rows.slice();
      const q = st.q.toLowerCase(); if (q) rows = rows.filter(x => (x.vendor + ' ' + x.code).toLowerCase().indexOf(q) > -1);
      if (st.flag === 'below') rows = rows.filter(x => x.rate < data.kpi.target || x.passRate < data.kpi.target);
      rows.sort((a, b) => { const x = a[st.sort], y = b[st.sort]; const m = st.dir === 'asc' ? 1 : -1; return (typeof x === 'number' && typeof y === 'number') ? (x - y) * m : String(x).localeCompare(String(y)) * m; });
      const pages = Math.max(1, Math.ceil(rows.length / st.per)); st.page = Math.min(st.page, pages);
      const view = rows.slice((st.page - 1) * st.per, st.page * st.per), tat = data.kpi.tatTarget;
      $('#cCnt').textContent = rows.length + ' dari ' + data.rows.length;
      $('#cHead').innerHTML = '<tr><th>No</th>' + UI.thSort('Customer / Vendor', 'vendor', st) + UI.thSort('Type PO', 'typePoMain', st) + UI.thSort('Total Items', 'total', st, 'r') + UI.thSort('Completed', 'completed', st, 'r') + UI.thSort('Awaiting', 'pending', st, 'r') +
        UI.thSort('Completion %', 'rate', st) + UI.thSort('Pass Rate', 'passRate', st, 'r') + UI.thSort('Avg TAT', 'avgTat', st, 'c') + UI.thSort('Findings', 'findings', st, 'c') + UI.thSort('Open', 'openFindings', st, 'c') + '<th class="r">MoM</th></tr>';
      UI.bindSort($('#cHead'), st, drawTable);
      $('#cBody').innerHTML = view.length ? view.map((x, i) => {
        const bad = x.passRate < data.kpi.target && x.completed >= 3;
        const tatCls = x.avgTat === null ? 'b-pend' : x.avgTat <= tat ? 'b-ok' : x.avgTat <= tat * 1.5 ? 'b-warn' : 'b-err';
        return '<tr class="click ' + (bad ? 'row-err' : '') + '" data-v="' + h(x.vendor) + '"><td class="muted num">' + String((st.page - 1) * st.per + i + 1).padStart(2, '0') + '</td>' +
          '<td style="min-width:260px"><div class="who"><span class="mini-av" style="border-radius:6px;' + (bad ? 'background:var(--err-bg);color:var(--err)' : '') + '">' + h((x.code || x.vendor).replace(/^V-/, '').substring(0, 3).toUpperCase()) + '</span><div class="cell-2"><b style="' + (bad ? 'color:var(--err)' : '') + '">' + h(x.vendor) + '</b><div class="s">' + h(x.code || '—') + (x.topSubject ? ' • ' + h(x.topSubject) : '') + '</div></div></div></td>' +
          '<td class="nw">' + tpBadges(x.typePo) + '</td><td class="r num"><b>' + num(x.total) + '</b></td><td class="r num" style="color:var(--ok);font-weight:600">' + num(x.completed) + '</td><td class="r num" style="' + (x.pending > 5 ? 'color:var(--err);font-weight:600' : '') + '">' + num(x.pending) + '</td>' +
          '<td style="min-width:150px"><div style="display:flex;align-items:center;gap:8px"><div class="bar ' + (x.rate >= data.kpi.target ? '' : 'err') + '" style="flex:1;margin:0"><i style="width:' + x.rate + '%"></i></div><span class="num small">' + pct(x.rate) + '</span></div></td>' +
          '<td class="r num">' + pct(x.passRate) + '</td><td class="c"><span class="badge nc ' + tatCls + '">' + (x.avgTat === null ? '—' : num(x.avgTat, 1) + ' hari') + '</span></td>' +
          '<td class="c"><span class="badge nc ' + (x.findings > 10 ? 'b-err' : x.findings ? 'b-warn' : 'b-pend') + '">' + num(x.findings) + '</span></td><td class="c num">' + num(x.openFindings) + '</td>' +
          '<td class="r">' + UI.delta(x.mom.delta, { title: 'Item bulan ini vs bulan lalu' }) + '</td></tr>';
      }).join('') : '<tr><td colspan="12">' + UI.empty('Tidak ada mitra yang cocok.') + '</td></tr>';
      const pg = $('#cPager'); pg.innerHTML = ''; pg.appendChild(UI.pager({ page: st.page, pages, total: rows.length, per: st.per }, (p, per) => { st.page = p; st.per = per; drawTable(); }, { perOptions: [10, 25, 50], noun: 'mitra' }));
    };
    const draw = (d) => {
      if (!ctx.isCurrent()) return;
      data = d; const k = d.kpi;
      const tp = d.typePoCounts || { total: k.totalItems, list: [] };
      $('#cType').innerHTML = '<button data-tp="" class="' + (!st.typePo ? 'on' : '') + '">Semua <span class="n">' + num(tp.total) + '</span></button>' +
        tp.list.map(x => '<button data-tp="' + h(x.value) + '" class="' + (st.typePo === x.value ? 'on' : '') + '">' + h(x.value) + ' <span class="n">' + num(x.n) + '</span></button>').join('');
      UI.$$('#cType [data-tp]').forEach(b => b.onclick = () => { st.typePo = b.dataset.tp; Pages.customer._tp = st.typePo; st.page = 1; reload(); });
      $('#cKpi').innerHTML =
        '<div class="kpi"><div class="kpi-top"><span class="kpi-label">Total Customers & Vendors</span><span class="kpi-ico">' + icon('users') + '</span></div><div class="kpi-val">' + num(k.vendors) + (k.newVendors ? '<span class="badge b-ok nc">+' + num(k.newVendors) + ' baru</span>' : '') + '</div><div class="kpi-foot"><span>' + num(k.aboveTarget) + ' mitra memenuhi target completion</span></div></div>' +
        '<div class="kpi"><div class="kpi-top"><span class="kpi-label">Total Items Received</span><span class="kpi-ico">' + icon('archive') + '</span></div><div class="kpi-val">' + num(k.totalItems) + '<span class="unit">item</span></div><div class="kpi-foot"><span>' + num(k.cleared) + ' cleared (' + pct(k.completion) + ')</span><span style="color:var(--primary-ink)">' + num(k.inProgress) + ' in-progress</span></div><div class="bar"><i style="width:' + k.completion + '%"></i></div></div>' +
        '<div class="kpi ' + (k.passRate >= k.target ? 'c-ok' : 'c-err') + '"><div class="kpi-top"><span class="kpi-label">Overall Compliance (Pass Rate)</span><span class="kpi-ico ' + (k.passRate >= k.target ? 'ok' : 'err') + '">' + icon('shield') + '</span></div><div class="kpi-val">' + pct(k.passRate) + (k.passRate >= k.target ? '<span class="badge b-ok">Healthy SLA</span>' : '<span class="badge b-err">Di bawah target</span>') + '</div>' +
        '<div class="kpi-foot"><span>(Inspected + Revoke) ÷ total · target ≥ ' + pct(k.target, 0) + UI.tgtBtn('COMPLETION_TARGET', k.target, 'Laporan Per Customer') + '</span>' + UI.delta(k.passRate - k.target, { unit: ' pp', title: 'Selisih terhadap target' }) + '</div></div>';
      const q = (v, good) => v ? '<div class="quad ' + (good ? 'good' : 'bad') + ' ' + '"><span class="badge ' + (good ? 'b-ok' : 'b-err') + '">' + (good ? 'Top performer' : 'Attention / CAPA') + '</span><div class="nm" style="' + (good ? '' : 'color:var(--err)') + '">' + h(v.vendor) + '</div><div class="small muted">' + h(v.code || '') + '</div>' +
        '<div class="kv"><span>Pass rate<b style="color:' + (good ? 'var(--ok)' : 'var(--err)') + '">' + pct(v.passRate) + '</b></span><span style="text-align:right">' + (good ? 'Average TAT<b>' + num(v.avgTat, 1) + ' hari</b>' : 'Open findings<b style="color:var(--err)">' + num(v.openFindings) + (v.urgent ? ' (' + v.urgent + ' urgent)' : '') + '</b>') + '</span></div>' +
        '<button class="link-btn small" style="margin-top:10px" data-v="' + h(v.vendor) + '">Detail ' + icon('chevr', 'sm') + '</button></div>' : '<div class="quad">' + UI.empty(good ? 'Belum cukup data.' : 'Tidak ada vendor yang perlu CAPA. 🎉') + '</div>';
      $('#cQuad').innerHTML = q(d.top, true) + q(d.attention, false);
      $('#cQuadF').innerHTML = '<span>' + num(k.aboveTarget) + ' dari ' + num(k.vendors) + ' mitra memenuhi target ' + pct(k.target, 0) + '</span><a href="#/finding?tab=open">Finding open ' + icon('chevr', 'sm') + '</a>';
      drawSev();
      UI.$$('#cQuad [data-v]').forEach(b => b.onclick = () => vendorDrill(b.dataset.v));
      drawTable();
    };
    const drawSev = () => {
      if (!data) return;
      const d = data, colors = ['#2563EB', '#D97706', '#DC2626', '#0D9488', '#64748B', '#7C3AED', '#0891B2', '#CA8A04', '#DB2777', '#4B5563'];
      UI.$$('#cTop button').forEach(b => b.classList.toggle('on', +b.dataset.n === topSub));
      const list = d.severity.list.slice(0, topSub), maxP = Math.max(1, ...list.map(s => s.pct));
      $('#cSev').innerHTML = list.length ? list.map((s, i) => '<div class="dist-row" data-sub="' + h(s.subject) + '"><div class="dist-name"><span class="rank">' + (i + 1) + '</span><span class="dot" style="background:' + colors[i] + ';margin-right:8px"></span>' + h(s.subject) + (s.open ? ' <span class="badge b-pend nc">' + num(s.open) + ' open</span>' : '') + '</div><div class="dist-val small">' + num(s.count) + ' kasus <span class="p">(' + pct(s.pct, 0) + ')</span></div><div class="dist-bar"><i style="width:' + (s.pct / maxP * 100) + '%;background:' + colors[i] + '"></i></div></div>').join('') : UI.empty('Tidak ada finding pada periode ini.');
      UI.$$('#cSev [data-sub]').forEach(x => x.onclick = () => { location.hash = '#/finding?subject=' + encodeURIComponent(x.dataset.sub); });
      $('#cSevF').innerHTML = '<span>Total MRIR: ' + num(d.severity.total) + (d.severity.kategori > topSub ? ' · ' + num(d.severity.kategori) + ' kategori' : '') + '</span><b style="color:var(--primary-ink)">' + pct(d.severity.resolution) + ' CAPA resolution rate</b>';
    };
    UI.$$('#cTop button').forEach(b => b.onclick = () => { topSub = +b.dataset.n; Pages.customer._topSub = topSub; drawSev(); });
    const vendorDrill = (v) => {
      const x = data.rows.find(r2 => r2.vendor === v); if (!x) return;
      const s = x.status, tot = x.total || 1;
      UI.modal({ title: h(x.vendor), drawer: true, body:
        '<div class="small muted" style="margin-bottom:14px">' + h(x.code || '') + ' · ' + h(App.periodLabel()) + (st.typePo ? ' · Type PO ' + h(st.typePo) : '') + '</div>' +
        '<div class="kv-grid">' + [['Total item', num(x.total)], ['Type PO', tpBadges(x.typePo)], ['Completion / Pass rate', pct(x.rate)], ['Avg TAT', x.avgTat === null ? '—' : num(x.avgTat, 1) + ' hari'], ['Finding', num(x.findings) + ' (' + num(x.openFindings) + ' open)'], ['Qty total', num(x.qty)], ['Item bulan ini', num(x.mom.cur)], ['Item bulan lalu', num(x.mom.prev)]]
          .map(k2 => '<div class="kv-box"><div class="k">' + k2[0] + '</div><div class="v">' + k2[1] + '</div></div>').join('') + '</div>' +
        '<h3 class="sec-title mt" style="font-size:14px">Komposisi status</h3>' +
        '<div style="display:flex;height:14px;border-radius:4px;overflow:hidden;margin:10px 0;gap:2px">' + UI.MRI_ST.map(c => s[c] ? '<i title="' + c + ': ' + s[c] + '" style="display:block;width:' + (s[c] / tot * 100) + '%;background:' + UI.MRI_COLOR[c] + '"></i>' : '').join('') + '</div>' +
        '<div class="legend">' + UI.MRI_ST.map(c => '<span><i style="background:' + UI.MRI_COLOR[c] + '"></i>' + c + ' ' + num(s[c] || 0) + '</span>').join('') + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:22px;flex-wrap:wrap"><a class="btn btn-primary" href="#/inspeksi?vendor=' + encodeURIComponent(x.vendor) + '">' + icon('table') + 'Lihat semua item</a><a class="btn btn-outline" href="#/finding?vendor=' + encodeURIComponent(x.vendor) + '">' + icon('alert') + 'Lihat finding</a></div>' });
    };
    $('#cBody').addEventListener('click', (e) => { const tr = e.target.closest('[data-v]'); if (tr) vendorDrill(tr.dataset.v); });
    $('#cq').addEventListener('input', UI.debounce(() => { st.q = $('#cq').value.trim(); st.page = 1; drawTable(); }, 200));
    UI.$$('#cFlag button').forEach(b => b.onclick = () => { UI.$$('#cFlag button').forEach(x => x.classList.toggle('on', x === b)); st.flag = b.dataset.f; st.page = 1; drawTable(); });
    $('#cExp').onclick = (e) => UI.doExport(e.currentTarget, 'customer', Object.assign(params(), { q: st.q, flag: st.flag }));
    $('#cPrint').onclick = () => UI.cetak('SLA_SUMMARY', Object.assign(params(), { q: st.q, flag: st.flag }));
    const reload = async () => { try { await API.swr('getReportCustomer', params(), draw); } catch (e) { UI.showResult(e); } };
    await API.swr('getReportCustomer', params(), draw);
  }
};

// ============================================================================
Pages.periode = {
  crumb: 'Laporan Periode (Trend & Longitudinal)', group: 'Reports',
  prefetch: () => { const st = Object.assign({ mode: 'monthly', year: +UI.todayYmd().substring(0, 4), plant: '' }, Pages.periode._st || {}); return { action: 'getReportPeriod', data: { mode: st.mode, year: st.year, plant: st.plant } }; },
  async render(el, r, ctx) {
    const { h, icon, num, pct, $ } = UI;
    const now = +UI.todayYmd().substring(0, 4);
    const st = Object.assign({ mode: 'monthly', year: now, plant: '' }, Pages.periode._st || {});
    Pages.periode._st = st;
    const L = App.lookups || {};
    el.innerHTML =
      '<div class="ph"><div class="ph-title"><h1>Laporan Periode <span class="muted" style="font-weight:500;font-size:20px">(Trend & Longitudinal Analysis)</span></h1>' +
      '<p>Tren volume Inspected vs Awaiting Inspection, turnaround time (TAT), fluktuasi temuan (MRIR), dan aging karantina antar bulan dan tahun.</p></div>' +
      '<div class="ph-actions"><button class="btn btn-outline" id="pPrint">' + icon('printer') + 'Executive Summary (PDF)</button><button class="btn btn-primary" id="pExp" data-busy="Menyiapkan…">' + icon('sheet') + 'Export Periode (.xlsx)</button></div></div>' +
      '<div class="card pad-s mb"><div class="filterbar"><div class="seg primary" id="pMode"><button data-m="monthly">Bulanan</button><button data-m="quarterly">Kuartal (Q1–Q4)</button><button data-m="yearly">Tahunan (YoY)</button></div>' +
      '<label class="small t2" style="display:flex;gap:6px;align-items:center">Tahun <select class="select soft" id="pYear" style="min-width:100px"></select></label>' +
      '<select class="select soft" id="pPlant" aria-label="Plant">' + UI.opts((L.plants || []).map(p => ({ value: p, label: 'Plant ' + p })), st.plant, 'Semua plant') + '</select></div></div>' +
      '<div class="grid g4 mb" id="pKpi">' + Array.from({ length: 4 }, () => '<div class="kpi plain"><div class="skel" style="width:50%"></div><div class="skel" style="height:34px;margin-top:12px;width:40%"></div></div>').join('') + '</div>' +
      '<div class="grid g2 mb"><section class="card"><div class="card-h"><div><h2 class="sec-title">Volume Inspected vs Awaiting Inspection</h2><div class="sec-sub">Jumlah item per status Excel menurut Pstng Date</div></div>' +
      '<div class="legend"><span><i style="background:#16A34A"></i>Inspected</span><span><i style="background:#D97706"></i>Awaiting Inspection</span><span><i style="background:#DC2626"></i>Revoke</span></div></div><div class="chart-box"><canvas id="pVol" role="img" aria-label="Volume inspected vs awaiting inspection"></canvas></div><div class="card-f" id="pVolF"></div></section>' +
      '<section class="card"><div class="card-h"><div><h2 class="sec-title">Temuan (MRIR) & Rata-rata TAT</h2><div class="sec-sub">Dua grafik terpisah — skala masing-masing jujur</div></div></div>' +
      '<div class="grid g2" style="gap:10px;margin-bottom:12px" id="pCall"></div>' +
      '<div class="chart-box short" style="height:140px"><canvas id="pFnd" role="img" aria-label="Jumlah finding per periode"></canvas></div>' +
      '<div class="chart-box short" style="height:140px;margin-top:8px"><canvas id="pTat" role="img" aria-label="Rata-rata TAT per periode"></canvas></div><div class="card-f" id="pCorr"></div></section></div>' +
      '<section class="card flush mb"><div class="pad card-h" style="margin:0"><div><h2 class="sec-title" id="pTblT">Rekapitulasi</h2><div class="sec-sub">Agregasi longitudinal performa gudang penerimaan material</div></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Periode</th><th class="r">Total Masuk</th><th class="r">Inspected</th><th class="r">Revoke</th><th class="r">Awaiting</th><th>Completion %</th><th class="r">Rata-rata TAT</th><th class="r">Total Finding</th><th class="r">Finding Rate</th><th class="r">Aging Rata-rata</th><th class="r">Tren</th></tr></thead><tbody id="pBody">' + UI.skelRows(9, 11) + '</tbody><tfoot id="pFoot"></tfoot></table></div></section>' +
      '<div class="grid g2" id="pIns"></div>';

    const params = () => ({ mode: st.mode, year: st.year, plant: st.plant });
    const draw = (d) => {
      if (!ctx.isCurrent()) return;
      const k = d.kpi, S = UI.S();
      UI.$$('#pMode button').forEach(b => b.classList.toggle('on', b.dataset.m === st.mode));
      const years = Array.from(new Set(d.years.map(Number).concat([now, st.year]))).sort((a, b) => b - a);
      $('#pYear').innerHTML = UI.opts(years, st.year); $('#pYear').disabled = st.mode === 'yearly';
      const lbl = st.mode === 'yearly' ? 'Semua tahun' : 'YTD ' + st.year;
      $('#pKpi').innerHTML =
        '<div class="kpi plain"><div class="kpi-top"><span class="kpi-label">' + lbl + ' Total Received</span><span class="kpi-ico">' + icon('archive') + '</span></div><div class="kpi-val">' + num(st.mode === 'yearly' ? d.totals.total : k.ytdTotal) + '<span class="unit">item</span></div>' +
        '<div class="kpi-foot">' + (st.mode === 'yearly' ? '<span>' + d.rows.length + ' tahun data</span>' : UI.delta(k.yoy, { title: 'vs periode yang sama tahun lalu' }) + '<span class="muted">vs ' + (st.year - 1) + ': ' + num(k.prevYear) + '</span>') + '</div></div>' +
        '<div class="kpi plain ' + (k.completion >= d.target ? 'c-ok' : '') + '"><div class="kpi-top"><span class="kpi-label">Completion / Pass Rate</span><span class="kpi-ico ok">' + icon('checkc') + '</span></div><div class="kpi-val">' + pct(k.completion) + '</div><div class="kpi-foot"><span><span class="badge nc ' + (k.completion >= d.target ? 'b-ok' : 'b-err') + '">Target ≥ ' + pct(d.target, 0) + '</span>' + UI.tgtBtn('COMPLETION_TARGET', d.target, 'Laporan Periode') + '</span><span>' + num(k.inspected) + ' inspected · ' + num(k.awaiting) + ' awaiting</span></div><div class="bar ok"><i style="width:' + k.completion + '%"></i></div></div>' +
        '<div class="kpi plain"><div class="kpi-top"><span class="kpi-label">Average Inspection TAT</span><span class="kpi-ico">' + icon('clock') + '</span></div><div class="kpi-val">' + num(k.avgTat, 2) + '<span class="unit">hari</span></div><div class="kpi-foot"><span><span class="badge nc ' + (k.avgTat <= d.tatTarget ? 'b-ok' : 'b-err') + '">Batas SLA ' + num(d.tatTarget) + ' hari</span>' + UI.tgtBtn('TAT_TARGET_HARI', d.tatTarget, 'Laporan Periode') + '</span>' + (k.tatMax ? '<span>Maks: ' + num(k.tatMax.v, 1) + ' (' + h(k.tatMax.label) + ')</span>' : '') + '</div></div>' +
        '<div class="kpi plain c-warn"><div class="kpi-top"><span class="kpi-label">Total MRIR Findings & Aging</span><span class="kpi-ico warn">' + icon('alert') + '</span></div><div class="kpi-val">' + num(k.findings) + '<span class="unit">temuan</span></div><div class="kpi-foot"><span class="badge b-warn nc">' + pct(k.defectRate) + ' defect rate</span><span>Aging open ' + num(k.avgAging, 1) + ' hari</span></div>' +
        '<div class="kpi-foot"><span><span class="dot" style="background:#16A34A"></span> ' + num(k.closed) + ' closed</span><span><span class="dot" style="background:#DC2626"></span> ' + num(k.open) + ' open</span></div></div>';
      const labels = d.rows.map(x => x.short + (x.partial ? '*' : ''));
      UI.chart($('#pVol'), { type: 'bar', data: { labels, datasets: [
        { label: 'Inspected', data: d.rows.map(x => x.inspected), backgroundColor: '#16A34A', borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 20, categoryPercentage: .72, barPercentage: .92 },
        { label: 'Awaiting Inspection', data: d.rows.map(x => x.awaiting), backgroundColor: '#D97706', borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 20, categoryPercentage: .72, barPercentage: .92 },
        { label: 'Revoke', data: d.rows.map(x => x.revoke), backgroundColor: '#DC2626', borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 20, categoryPercentage: .72, barPercentage: .92 }] },
        options: { plugins: { tooltip: { callbacks: { afterBody: (items) => { const x = d.rows[items[0].dataIndex]; return 'Total masuk: ' + num(x.total) + ' · completion ' + pct(x.rate); } } } } } });
      const aw = d.rows.reduce((a, x) => a + (x.awaiting || 0), 0), ins = d.rows.reduce((a, x) => a + (x.inspected || 0), 0);
      $('#pVolF').innerHTML = '<span>' + (d.rows.some(x => x.partial) ? '* periode berjalan (belum penuh) · ' : '') + num(ins) + ' inspected · ' + num(aw) + ' awaiting</span>' + (aw ? '<a href="#/inspeksi?status=Awaiting%20Inspection">Lihat awaiting ' + icon('chevr', 'sm') + '</a>' : '');
      $('#pCall').innerHTML = (d.cleanest ? '<div class="kv-box" style="display:flex;gap:10px;align-items:center;background:var(--ok-bg)"><span style="color:var(--ok)">' + icon('checkc', 'lg') + '</span><div><div class="k">Periode terbersih</div><div class="v small">' + h(d.cleanest.label) + ' · ' + num(d.cleanest.findings) + ' MRIR · ' + num(d.cleanest.avgTat, 1) + ' hr</div></div></div>' : '') +
        (d.peak ? '<div class="kv-box" style="display:flex;gap:10px;align-items:center;background:var(--err-bg)"><span style="color:var(--err)">' + icon('alertc', 'lg') + '</span><div><div class="k">Puncak temuan</div><div class="v small">' + h(d.peak.label) + ' · ' + num(d.peak.findings) + ' MRIR · ' + num(d.peak.avgTat, 1) + ' hr</div></div></div>' : '');
      const peakIdx = d.rows.findIndex(x => d.peak && x.label === d.peak.label);
      UI.chart($('#pFnd'), { type: 'bar', data: { labels, datasets: [{ label: 'Finding', data: d.rows.map(x => x.findings), backgroundColor: d.rows.map((x, i) => i === peakIdx ? S.s3 : UI.cssVar('--border-strong')), borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 26 }] },
        options: { plugins: { title: { display: true, text: 'Jumlah finding (MRIR)', align: 'start', color: UI.cssVar('--text-2'), font: { size: 12, weight: '600' }, padding: { bottom: 4 } } }, scales: { x: { ticks: { display: false } } } } });
      UI.chart($('#pTat'), { type: 'line', data: { labels, datasets: [
        { label: 'Rata-rata TAT', unit: ' hari', data: d.rows.map(x => x.avgTat), borderColor: S.s1, backgroundColor: S.s1, borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, tension: .3, spanGaps: true },
        { label: 'Target SLA', unit: ' hari', data: d.rows.map(() => d.tatTarget), borderColor: UI.cssVar('--muted'), borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0 }] },
        options: { plugins: { title: { display: true, text: 'Rata-rata TAT (hari) · garis putus = target', align: 'start', color: UI.cssVar('--text-2'), font: { size: 12, weight: '600' }, padding: { bottom: 4 } } } } });
      $('#pCorr').innerHTML = d.correlation !== null ? '<span>Korelasi Pearson finding vs TAT: <b>r = ' + num(d.correlation, 2) + '</b> (' + (Math.abs(d.correlation) >= .7 ? 'kuat' : Math.abs(d.correlation) >= .4 ? 'sedang' : 'lemah') + ')</span>' : '<span>Korelasi butuh ≥ 3 periode berdata.</span>';
      $('#pTblT').innerHTML = 'Rekapitulasi ' + (st.mode === 'yearly' ? 'Tahunan' : st.mode === 'quarterly' ? 'Kuartal ' + st.year : 'Bulanan ' + st.year) + ' <span class="badge b-info nc">' + h(d.rows.length ? d.rows[0].label + ' – ' + d.rows[d.rows.length - 1].label : '') + '</span>';
      const rows = d.rows.slice().reverse();
      $('#pBody').innerHTML = rows.map(x => '<tr class="' + (d.peak && x.label === d.peak.label ? 'row-err' : '') + '"><td class="nw"><b style="' + (x.partial ? 'color:var(--primary-ink)' : '') + '">' + h(x.label) + '</b>' + (x.partial ? ' <span class="xs muted">(berjalan)</span>' : '') + '</td>' +
        '<td class="r num">' + num(x.total) + '</td><td class="r num" style="color:var(--ok);font-weight:600">' + num(x.inspected) + '</td><td class="r num" style="color:var(--err)">' + num(x.revoke) + '</td><td class="r num" style="' + (x.awaiting ? 'color:var(--warn);font-weight:600' : '') + '">' + num(x.awaiting) + '</td>' +
        '<td style="min-width:140px"><div style="display:flex;gap:8px;align-items:center"><div class="bar ok" style="flex:1;margin:0"><i style="width:' + x.rate + '%"></i></div><span class="num small">' + pct(x.rate) + '</span></div></td>' +
        '<td class="r nw"><span class="dot" style="background:' + (x.tatStatus === 'Optimal' ? '#16A34A' : x.tatStatus ? '#EA580C' : '#94A3B8') + '"></span> ' + (x.avgTat === null ? '—' : num(x.avgTat, 1) + ' hr') + ' <span class="xs muted">' + h(x.tatStatus) + '</span></td>' +
        '<td class="r"><span class="badge nc b-warn">' + num(x.findings) + '</span></td><td class="r num">' + pct(x.findingRate) + '</td><td class="r num">' + (x.avgAging === null ? '—' : num(x.avgAging, 1) + ' hr') + '</td>' +
        '<td class="r">' + (x.deltaRate === null ? '<span class="badge b-pend nc">Base</span>' : UI.delta(x.deltaRate, { unit: ' pp', title: 'Perubahan completion vs periode sebelumnya' })) + '</td></tr>').join('') || '<tr><td colspan="11">' + UI.empty('Belum ada data.') + '</td></tr>';
      const T = d.totals;
      $('#pFoot').innerHTML = '<tr><td>TOTAL / RATA-RATA</td><td class="r num">' + num(T.total) + '</td><td class="r num">' + num(T.inspected) + '</td><td class="r num">' + num(T.revoke) + '</td><td class="r num">' + num(T.awaiting) + '</td><td class="num">' + pct(T.rate) + '</td><td class="r num">' + num(T.avgTat, 2) + ' hr</td><td class="r num">' + num(T.findings) + '</td><td class="r num">' + pct(T.findingRate) + '</td><td class="r num">' + num(T.avgAging, 1) + ' hr</td><td></td></tr>';
      const ic = { good: 'checkc', warn: 'alert', info: 'trend' };
      $('#pIns').innerHTML = d.insights.map(x => '<div class="insight ' + x.type + '"><span class="ic">' + icon(ic[x.type] || 'info') + '</span><div><b>' + h(x.title) + '</b><span class="small t2">' + h(x.text) + '</span></div></div>').join('');
    };
    const load = async () => { try { await API.swr('getReportPeriod', params(), draw); } catch (e) { UI.showResult(e); } };
    UI.$$('#pMode button').forEach(b => b.onclick = () => { st.mode = b.dataset.m; UI.destroyCharts(); load(); });
    $('#pYear').onchange = () => { st.year = +$('#pYear').value; UI.destroyCharts(); load(); };
    $('#pPlant').onchange = () => { st.plant = $('#pPlant').value; UI.destroyCharts(); load(); };
    $('#pExp').onclick = (e) => UI.doExport(e.currentTarget, 'periode', params());
    $('#pPrint').onclick = () => UI.cetak('EXEC_PERIODE', params());
    await load();
  }
};
