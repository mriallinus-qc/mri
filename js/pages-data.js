/**
 * pages-data.js — Data Inspeksi (Master Receiving Table) + Detail + Form (PRD §5.2)
 * v2.6: kolom & filter mengikuti file Excel inspeksi — status Inspected / Revoke / Awaiting Inspection,
 *       Type PO (GMF/CSP/Military), kolom 102 · 321 · Tanggal, kode inspector → nama
 */
const MD_FORM = [
  ['material', 'Material', 'text', 1], ['desc', 'Material Description', 'text', 1], ['batch', 'Batch', 'text'], ['matType', 'mat type', 'matType'],
  ['po', 'PO', 'text', 1], ['bl', 'B/Lading', 'text'], ['matDoc', 'Mat. Doc.', 'text'], ['mvt', 'MvT', 'text'],
  ['typePo', 'Type Po', 'typePo'], ['plant', 'Plant', 'text', 1], ['sloc', 'SLoc', 'text', 1], ['vendor', 'Vendor', 'text'],
  ['vendorName', 'Vendor name', 'vendor', 1], ['postingDate', 'Pstng Date', 'date', 1], ['qty', 'Quantity', 'number', 1], ['unit', 'BUn', 'text', 1],
  ['ref102', '102 (reversal → Revoke)', 'text'], ['ref321', '321 (transfer QI)', 'text'], ['tanggal', 'tanggal (321)', 'date'],
  ['status', 'Status (TEXT AFTER)', 'status'], ['inspector', 'Inspector (kode/nama)', 'inspector'], ['inspDate', 'tanggal insp', 'date'], ['tat', 'TAT (hari) — kosongkan untuk hitung otomatis', 'number'],
  ['result', 'Hasil Inspeksi', 'textarea'], ['remarks', 'Remarks', 'textarea']
];
const MD_ADMIN_FIELDS = ['inspector', 'status', 'remarks', 'tat', 'inspDate', 'result', 'matType'];

function openRecordForm(rec, onSaved) {
  const { h, icon } = UI;
  const L = App.lookups || {};
  const isNew = !rec, isSA = App.user.role === App.SA;
  const lockField = (f) => !isNew && !isSA && MD_ADMIN_FIELDS.indexOf(f) === -1;
  const v = rec || { status: 'Awaiting Inspection', postingDate: UI.todayYmd() };
  const withCur = (arr, cur) => (cur && (arr || []).indexOf(cur) === -1 ? [cur].concat(arr || []) : (arr || []));
  const field = (d) => {
    const [k, label, type, req] = d, val = v[k] === undefined || v[k] === null ? '' : v[k], dis = lockField(k) ? 'disabled' : '';
    const lab = '<label for="f_' + k + '">' + h(label) + (req ? ' <span class="req">*</span>' : '') + (lockField(k) ? ' ' + icon('lock', 'sm') : '') + '</label>';
    let inp;
    if (type === 'textarea') inp = '<textarea class="input" id="f_' + k + '" rows="2" ' + dis + '>' + h(val) + '</textarea>';
    else if (type === 'status') inp = '<select class="select" id="f_' + k + '" ' + dis + '>' + UI.opts(L.mriStatus || UI.MRI_ST, val) + '</select>';
    else if (type === 'typePo') inp = '<select class="select" id="f_' + k + '" ' + dis + '>' + UI.opts(withCur(L.typePos || ['GMF', 'CSP', 'Military'], val), val, '— pilih —') + '</select>';
    else if (type === 'matType') inp = '<input class="input" id="f_' + k + '" list="dl_mt" value="' + h(val) + '" ' + dis + '><datalist id="dl_mt">' + (L.matTypes || []).map(x => '<option value="' + h(x) + '">').join('') + '</datalist>';
    else if (type === 'inspector') inp = '<input class="input" id="f_' + k + '" list="dl_in" value="' + h(val) + '" ' + dis + '><datalist id="dl_in">' + (L.inspectors || []).map(x => { const n = (L.inspectorAlias || {})[String(x).toLowerCase().replace(/[^a-z0-9]/g, '')]; return '<option value="' + h(x) + '"' + (n && n !== x ? ' label="' + h(n) + '"' : '') + '>'; }).join('') + '</datalist>';
    else if (type === 'vendor') inp = '<input class="input" id="f_' + k + '" list="dl_vn" value="' + h(val) + '" ' + dis + '><datalist id="dl_vn">' + (L.vendors || []).map(x => '<option value="' + h(x.name) + '">').join('') + '</datalist>';
    else inp = '<input class="input" id="f_' + k + '" type="' + type + '" ' + (type === 'number' ? 'step="any" min="0"' : '') + ' value="' + h(val) + '" ' + dis + '>';
    return '<div class="field ' + (type === 'textarea' ? 'span2' : '') + '">' + lab + inp + '</div>';
  };
  const m = UI.modal({ title: isNew ? 'Tambah Record Inspeksi' : 'Edit Record ' + h(rec.id), size: 'lg',
    body: (!isNew && !isSA ? '<div class="notice" style="margin-top:0">' + icon('info') + '<div>Sebagai <b>Admin</b>, Anda dapat mengubah Inspector, Status, tanggal insp, TAT, Hasil & Remarks. Field data SAP (' + icon('lock', 'sm') + ') hanya dapat diubah Superadmin.</div></div>' : '') +
      '<div class="notice" style="margin-top:0">' + icon('info') + '<div>Status mengikuti file Excel: <b>Inspected</b> (sudah diinspeksi / 321), <b>Revoke</b> (penerimaan dibatalkan / 102), <b>Awaiting Inspection</b> (menunggu inspeksi).</div></div>' +
      '<div class="form-grid">' + MD_FORM.map(field).join('') + '</div>',
    footer: '<button class="btn btn-ghost" data-c>Batal</button><button class="btn btn-primary" id="fSave" data-busy="Menyimpan…">' + icon('check') + (isNew ? 'Simpan Record' : 'Simpan Perubahan') + '</button>' });
  m.el.querySelector('[data-c]').onclick = m.close;
  UI.$('#fSave').onclick = () => UI.busy(UI.$('#fSave'), async () => {
    const out = isNew ? {} : { id: rec.id };
    MD_FORM.forEach(([k]) => { const el = UI.$('#f_' + k); if (el && !el.disabled) out[k] = el.value.trim(); });
    if (isNew) { const miss = MD_FORM.filter(d => d[3] && !out[d[0]]); if (miss.length) { UI.toast('Wajib diisi: ' + miss.map(d => d[1]).join(', '), 'error', 6000); return; } }
    const res = await API.call('saveData', { record: out });
    if (UI.showResult(res)) { m.close(); API.invalidate(['getData', 'getDashboard', 'getDetail', 'getReportCustomer', 'getReportPeriod']); onSaved && onSaved(res.data); }
  });
}

async function deleteRecords(ids, onDone) {
  const reason = await UI.confirm({ title: 'Hapus ' + ids.length + ' record?', danger: true, okText: 'Hapus', input: true, inputLabel: 'Alasan penghapusan', placeholder: 'mis. Duplikat input / salah PO',
    message: 'Record akan di-<b>soft delete</b>: disembunyikan dari laporan namun tetap tercatat di database & audit log.' });
  if (!reason) return;
  const res = await API.call('deleteData', { ids, reason });
  if (UI.showResult(res)) { API.invalidate(); onDone && onDone(); }
}

Pages.inspeksi = {
  crumb: 'Data Inspeksi', usesPeriod: true,
  subTitle: (id) => 'Record ' + id,
  defaults: () => ({ q: '', vendor: '', status: '', typePo: '', inspector: '', plant: '', sloc: '', matType: '', dateField: 'postingDate', page: 1, per: 10, sort: 'postingDate', dir: 'desc', overTat: '' }),
  paramsOf: (st) => ({ q: st.q, vendor: st.vendor, status: st.status, typePo: st.typePo, inspector: st.inspector, plant: st.plant, sloc: st.sloc, matType: st.matType, dateField: st.dateField, overTat: st.overTat ? 1 : '',
    page: st.page, per: st.per, sort: st.sort, dir: st.dir, period: App.period.period, from: App.period.from, to: App.period.to }),
  prefetch: () => ({ action: 'getData', data: Pages.inspeksi.paramsOf(Object.assign(Pages.inspeksi.defaults(), Pages.inspeksi._st || {})) }),
  async render(el, r, ctx) {
    if (r.sub) return Pages.inspeksi.renderDetail(el, r.sub, ctx);
    const { h, icon, num, pct, $ } = UI;
    const canEdit = App.can(App.ADM), isSA = App.can(App.SAO);
    const st = Object.assign(Pages.inspeksi.defaults(), Pages.inspeksi._st || {});
    const CLEAR = { q: '', vendor: '', status: '', typePo: '', inspector: '', plant: '', sloc: '', matType: '', overTat: '', page: 1 };
    if (Object.keys(r.q).length) { Object.assign(st, CLEAR, r.q); }
    Pages.inspeksi._st = st;
    const L = App.lookups || {};
    const skel = (n) => Array.from({ length: n }, () => '<div class="kpi plain compact"><div class="skel" style="width:60%"></div><div class="skel" style="height:30px;margin-top:12px;width:50%"></div></div>').join('');
    el.innerHTML =
      '<div class="ph"><div class="ph-title"><div class="eyebrow"><span>' + h(L.institusi || 'Warehouse Central Plant') + '</span><span>• Quality Management System</span><span class="hl" id="iSync"></span></div>' +
      '<h1>Data Inspeksi <span class="muted" style="font-weight:500;font-size:20px">(Master Receiving Table)</span></h1>' +
      '<p>Rekaman penerimaan material sesuai file Excel inspeksi — status Inspected / Revoke / Awaiting Inspection, Type PO, TAT — ' + h(App.periodLabel()) + '.</p></div>' +
      '<div class="ph-actions">' + (canEdit ? '<a class="btn btn-outline" href="#/import?ds=master">' + icon('sheet') + 'Import Excel</a><button class="btn btn-primary" id="addRec">' + icon('plus') + 'Add Record</button>' : '') + '</div></div>' +
      '<div class="grid g4 mb" id="iKpi">' + skel(4) + '</div>' +
      '<div class="grid g3 mb" id="iKpi2">' + skel(3) + '</div>' +
      '<div class="card mb pad-s"><div class="typepo-bar"><span class="lbl up">Type PO</span><div class="seg" id="fTypeSeg"></div></div>' +
      '<div class="filterbar" style="margin-top:10px">' +
      '<div class="grow input-icon">' + icon('search') + '<input class="input soft" id="fq" placeholder="Cari material, PO, vendor, inspector, batch, remarks…" value="' + h(st.q) + '" aria-label="Cari"></div>' +
      '<select class="select soft" id="fStatus" aria-label="Status"></select><select class="select soft" id="fType" aria-label="Type PO"></select>' +
      '<select class="select soft" id="fVendor" aria-label="Vendor name"></select><select class="select soft" id="fInsp" aria-label="Inspector"></select>' +
      '<select class="select soft" id="fPlant" aria-label="Plant"></select><select class="select soft" id="fSloc" aria-label="SLoc"></select><select class="select soft" id="fMat" aria-label="mat type"></select>' +
      '<select class="select soft" id="fDate" aria-label="Kolom tanggal">' + UI.opts([{ value: 'postingDate', label: 'Filter: Pstng Date' }, { value: 'inspDate', label: 'Filter: tanggal insp' }], st.dateField) + '</select>' +
      '<label class="check small"><input type="checkbox" id="fOver" ' + (st.overTat ? 'checked' : '') + '> Melewati TAT</label>' +
      '<button class="btn btn-ghost btn-sm" id="fReset">' + icon('refresh') + 'Reset</button></div></div>' +
      '<div class="card flush"><div id="bulk"></div><div class="tbl-wrap"><table class="tbl"><thead id="iHead"></thead><tbody id="iBody">' + UI.skelRows(8, 10) + '</tbody></table></div><div id="iPager"></div>' +
      '<div class="pad card-f" style="margin:0;border-top:1px solid var(--border)"><span class="small muted" id="iInfo"></span><button class="btn btn-outline btn-sm" id="iExport" data-busy="Menyiapkan…">' + icon('download') + 'Export ke Excel</button></div></div>' +
      '<div class="grid g4 mt" id="iCards"></div>';

    const selected = new Set();
    const params = () => Pages.inspeksi.paramsOf(st);
    const head = () => {
      $('#iHead').innerHTML = '<tr>' + (isSA ? '<th style="width:36px"><input type="checkbox" id="selAll" aria-label="Pilih semua"></th>' : '') + '<th>No</th>' + UI.thSort('Material', 'material', st) + '<th>Material Description</th>' +
        UI.thSort('PO · Type', 'po', st) + UI.thSort('Vendor name', 'vendorName', st) + UI.thSort('Qty & BUn', 'qty', st, 'r') + UI.thSort('Pstng Date', 'postingDate', st) +
        UI.thSort('tanggal insp', 'inspDate', st) + UI.thSort('TAT', 'tat', st, 'r') + UI.thSort('Status', 'status', st) + UI.thSort('Inspector', 'inspector', st) + '<th class="r">Aksi</th></tr>';
      UI.bindSort($('#iHead'), st, load);
      const sa = $('#selAll'); if (sa) sa.onchange = () => { UI.$$('#iBody [data-sel]').forEach(c => { c.checked = sa.checked; sa.checked ? selected.add(c.dataset.sel) : selected.delete(c.dataset.sel); }); bulk(); };
    };
    const bulk = () => {
      $('#bulk').innerHTML = selected.size ? '<div class="bulkbar"><b>' + selected.size + ' record dipilih</b><button class="btn btn-soft-danger btn-xs" id="bDel">' + icon('trash', 'sm') + 'Hapus terpilih</button><button class="btn btn-ghost btn-xs" id="bClr">Batal pilih</button></div>' : '';
      if (selected.size) { $('#bDel').onclick = () => deleteRecords(Array.from(selected), () => { selected.clear(); load(); }); $('#bClr').onclick = () => { selected.clear(); load(); }; }
    };
    const tatTarget = () => (App.lookups && App.lookups.tatTarget) || 2;
    const kpiCard = (label, ico, val, extra, foot, opts = {}) => '<div class="kpi plain compact ' + (opts.cls || '') + (opts.go !== undefined ? ' click" data-st="' + h(opts.go) : '') + '"><div class="kpi-top"><span class="kpi-label">' + label + '</span><span class="kpi-ico ' + (opts.tone || '') + '">' + icon(ico) + '</span></div>' +
      '<div class="kpi-val">' + val + (extra || '') + '</div>' + (foot ? '<div class="kpi-foot" style="margin-top:6px"><span>' + foot + '</span></div>' : '') + '</div>';
    const draw = (d) => {
      if (!ctx.isCurrent()) return;
      const k = d.kpi;
      Pages.inspeksi._rowMap = {}; d.rows.forEach(x => { Pages.inspeksi._rowMap[x.id] = x; }); Pages.inspeksi._tatTarget = k.tatTarget;
      $('#iSync').textContent = d.lastSync ? '• Sinkron ' + UI.ago(d.lastSync) : '';
      const bar = (v, cls) => '<div class="bar ' + (cls || '') + '" style="margin-top:8px"><i style="width:' + Math.max(0, Math.min(100, v || 0)) + '%"></i></div>';
      $('#iKpi').innerHTML =
        kpiCard('Total Batch Records', 'archive', num(k.total), k.addedToday ? '<span class="badge b-ok nc">+' + num(k.addedToday) + ' hari ini</span>' : '', 'Semua status pada filter ini', { go: '' }) +
        kpiCard('Inspected', 'checkc', num(k.inspected), '<span class="badge b-ok nc">' + pct(k.inspectedPct) + '</span>', 'Sudah diinspeksi' + bar(k.inspectedPct, 'ok'), { go: 'Inspected', tone: 'ok', cls: 'c-ok' }) +
        kpiCard('Awaiting Inspection', 'clock', num(k.awaiting), '<span class="badge b-warn nc">' + pct(k.awaitingPct) + '</span>', (k.overTat ? '<b style="color:var(--err)">' + num(k.overTat) + '</b> melewati SLA ' + num(k.tatTarget) + ' hari' : 'Menunggu inspeksi') + bar(k.awaitingPct, 'warn'), { go: 'Awaiting Inspection', tone: 'warn', cls: 'c-warn' }) +
        kpiCard('Revoke', 'x', num(k.revoke), '<span class="badge b-err nc">' + pct(k.revokePct) + '</span>', 'Penerimaan dibatalkan (MvT 102)' + bar(k.revokePct, 'err'), { go: 'Revoke', tone: 'err', cls: 'c-err' });
      $('#iKpi2').innerHTML =
        '<div class="kpi plain compact"><div class="kpi-top"><span class="kpi-label">Pass Rate</span><span class="kpi-ico ok">' + icon('shield') + '</span></div><div class="kpi-val">' + pct(k.passRate) + '</div>' +
          '<div class="kpi-foot" style="margin-top:6px"><span title="Pass Rate = (Inspected + Revoke) ÷ seluruh data">(' + num(k.inspected) + ' inspected + ' + num(k.revoke) + ' revoke) ÷ ' + num(k.total) + ' data</span></div>' + bar(k.passRate, 'ok') + '</div>' +
        '<div class="kpi plain compact click" onclick="location.hash=\'#/finding?tab=open\'"><div class="kpi-top"><span class="kpi-label">Active QC Findings</span><span class="kpi-ico">' + icon('alert') + '</span></div><div class="kpi-val">' + num(k.activeFindings) + '</div>' +
          '<div class="kpi-foot" style="margin-top:6px"><span>Finding (MRIR) belum closed untuk PO pada daftar ini</span></div></div>' +
        '<div class="kpi plain compact"><div class="kpi-top"><span class="kpi-label">Average Inspection TAT</span><span class="kpi-ico">' + icon('clock') + '</span></div><div class="kpi-val">' + num(k.avgTat, 2) + '<span class="unit">hari</span>' + (k.avgTat <= k.tatTarget ? '<span class="badge b-ok nc">SLA OK</span>' : '<span class="badge b-err nc">> SLA ' + num(k.tatTarget) + ' hr</span>') + '</div>' +
          '<div class="kpi-foot" style="margin-top:6px"><span>Batas SLA ≤ ' + num(k.tatTarget) + ' hari' + UI.tgtBtn('TAT_TARGET_HARI', k.tatTarget, 'Data Inspeksi') + '</span></div></div>';
      UI.$$('#iKpi [data-st]').forEach(c => c.onclick = () => { st.status = c.dataset.st; st.page = 1; load(); });
      // Type PO (tombol cepat)
      const tp = d.typePo || { total: d.total, list: [] };
      $('#fTypeSeg').innerHTML = '<button data-tp="" class="' + (!st.typePo ? 'on' : '') + '">Semua <span class="n">' + num(tp.total) + '</span></button>' +
        tp.list.map(x => '<button data-tp="' + h(x.value) + '" class="' + (st.typePo === x.value ? 'on' : '') + '">' + h(x.value) + ' <span class="n">' + num(x.n) + '</span></button>').join('') +
        (tp.kosong ? '<button data-tp="__none__" class="' + (st.typePo === '__none__' ? 'on' : '') + '">Tanpa Type <span class="n">' + num(tp.kosong) + '</span></button>' : '');
      UI.$$('#fTypeSeg [data-tp]').forEach(b => b.onclick = () => { st.typePo = b.dataset.tp; st.page = 1; load(); });
      const f = d.facets;
      $('#fStatus').innerHTML = UI.opts(f.statuses, st.status, 'Semua Status');
      $('#fType').innerHTML = UI.opts(f.typePos, st.typePo, 'Semua Type PO');
      $('#fVendor').innerHTML = UI.opts(f.vendors, st.vendor, 'Semua Vendor');
      $('#fInsp').innerHTML = UI.opts([{ value: '__none__', label: '(Belum ada inspector)' }].concat(f.inspectors || []), st.inspector, 'Semua Inspector');
      $('#fPlant').innerHTML = UI.opts(f.plants, st.plant, 'Semua Plant');
      $('#fSloc').innerHTML = UI.opts(f.slocs, st.sloc, 'Semua SLoc');
      $('#fMat').innerHTML = UI.opts(f.matTypes, st.matType, 'Semua mat type');
      head();
      const start = (d.page - 1) * d.per;
      $('#iBody').innerHTML = d.rows.length ? d.rows.map((x, i) => {
        const over = x.done ? x.tat > tatTarget() : x.pendingAge > tatTarget();
        return '<tr class="' + (selected.has(x.id) ? 'sel' : '') + '" data-id="' + h(x.id) + '">' +
          (isSA ? '<td><input type="checkbox" data-sel="' + h(x.id) + '" ' + (selected.has(x.id) ? 'checked' : '') + ' aria-label="Pilih ' + h(x.id) + '"></td>' : '') +
          '<td class="muted num">' + String(start + i + 1).padStart(2, '0') + '</td>' +
          '<td><span class="code-link" data-open>' + h(x.material) + '</span></td>' +
          '<td><div class="cell-2 ellip" title="' + h(x.desc) + '">' + h(x.desc) + '<div class="s">Batch ' + h(x.batch || '—') + '</div></div></td>' +
          '<td class="nw"><span class="mono muted">' + h(x.po) + '</span>' + (x.typePo ? ' <span class="badge b-info nc">' + h(x.typePo) + '</span>' : '') + '</td><td class="ellip" style="max-width:200px" title="' + h(x.vendorName) + '">' + h(x.vendorName) + '</td>' +
          '<td class="r nw num">' + num(x.qty) + ' ' + h(x.unit) + '</td><td class="nw small">' + UI.date(x.postingDate) + '</td><td class="nw small">' + (x.inspDate ? UI.date(x.inspDate) : '<span class="muted">—</span>') + '</td>' +
          '<td class="r nw num" style="' + (over ? 'color:var(--err);font-weight:600' : '') + '">' + (x.done ? (x.tat === '' ? '—' : num(x.tat) + ' hr') : '<span title="Umur awaiting">' + num(x.pendingAge) + ' hr ⏳</span>') + '</td>' +
          '<td>' + UI.mriBadge(x.status) + '</td><td class="nw small" title="' + h(x.inspector) + '">' + (x.inspector ? h(x.inspectorName || x.inspector) : '<span class="muted">—</span>') + '</td>' +
          '<td class="r nw"><button class="icon-btn" data-open title="Lihat detail" aria-label="Lihat detail">' + icon('eye') + '</button>' +
          (canEdit ? '<button class="icon-btn" data-edit title="Edit" aria-label="Edit">' + icon('edit') + '</button>' : '') +
          (isSA ? '<button class="icon-btn" data-del title="Hapus" aria-label="Hapus" style="color:var(--err)">' + icon('trash') + '</button>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="13">' + UI.empty('Tidak ada record yang cocok dengan filter.', 'search') + '</td></tr>';
      const pg = $('#iPager'); pg.innerHTML = ''; pg.appendChild(UI.pager(d, (p, per) => { st.page = p; st.per = per; load(); }, { perOptions: [10, 25, 50, 100], noun: 'record' }));
      $('#iInfo').textContent = 'Klik material untuk melihat detail · data ' + App.periodLabel().toLowerCase();
      $('#iCards').innerHTML = d.inspectorCards.map(c => '<div class="card pad-s hoverable" data-insp="' + h(c.code || c.name) + '"><div class="who"><span class="kpi-ico">' + icon('users') + '</span><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:6px"><b class="ellip">' + h(c.name) + '</b>' +
        '<span class="small nw" style="color:var(--ok);font-weight:600">' + num(c.finished) + ' selesai</span></div><div class="small t2">Avg TAT ' + num(c.avgTat, 1) + ' hr · ' + num(c.findings) + ' finding · ' + num(c.pending) + ' awaiting</div></div></div></div>').join('');
      UI.$$('#iCards [data-insp]').forEach(c => c.onclick = () => { st.inspector = c.dataset.insp; st.page = 1; load(); });
    };
    $('#iBody').addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-id]'); if (!tr) return;
      const id = tr.dataset.id;
      if (e.target.closest('[data-sel]')) { const c = e.target.closest('[data-sel]'); c.checked ? selected.add(id) : selected.delete(id); tr.classList.toggle('sel', c.checked); bulk(); return; }
      if (e.target.closest('[data-open]')) location.hash = '#/inspeksi/' + encodeURIComponent(id);
      if (e.target.closest('[data-edit]')) API.call('getDetail', { id }).then(res => res.success ? openRecordForm(res.data.record, load) : UI.showResult(res));
      if (e.target.closest('[data-del]')) deleteRecords([id], load);
    });
    const load = async () => { try { await API.swr('getData', params(), draw); } catch (e) { UI.showResult(e); } };
    const SEL = { '#fStatus': 'status', '#fType': 'typePo', '#fVendor': 'vendor', '#fInsp': 'inspector', '#fPlant': 'plant', '#fSloc': 'sloc', '#fMat': 'matType', '#fDate': 'dateField' };
    const onFilter = () => { Object.keys(SEL).forEach(s => { st[SEL[s]] = $(s).value; }); st.overTat = $('#fOver').checked ? 1 : ''; st.page = 1; load(); };
    Object.keys(SEL).concat(['#fOver']).forEach(s => $(s).addEventListener('change', onFilter));
    $('#fq').addEventListener('input', UI.debounce(() => { st.q = $('#fq').value.trim(); st.page = 1; load(); }));
    $('#fReset').onclick = () => { Object.assign(st, CLEAR); $('#fq').value = ''; $('#fOver').checked = false; if (location.hash.indexOf('?') > -1) history.replaceState(null, '', '#/inspeksi'); load(); };
    $('#iExport').onclick = (e) => UI.doExport(e.currentTarget, 'inspeksi', Object.assign(params(), { page: 1 }));
    if (canEdit) $('#addRec').onclick = () => openRecordForm(null, (d) => { load(); if (d && d.id) UI.toast('Record ' + d.id + ' dibuat.', 'info'); });
    await load();
  },

  async renderDetail(el, id, ctx) {
    const { h, icon, num, $ } = UI;
    el.innerHTML = '<div class="card"><div class="skel" style="height:28px;width:40%"></div><div class="skel" style="margin-top:16px"></div><div class="skel" style="margin-top:10px;width:70%"></div></div>';
    // SWR: buka ulang record yang sama = instan dari cache, lalu diperbarui di latar
    const draw = (d) => {
    if (!ctx.isCurrent()) return;
    const { record: x, findings, related, history, tatTarget } = d;
    const canEdit = App.can(App.ADM), isSA = App.can(App.SAO);
    const kv = (k, v, cls = '') => '<div class="kv-box ' + cls + '"><div class="k">' + k + '</div><div class="v">' + (v === '' || v === null || v === undefined ? '<span class="muted">—</span>' : v) + '</div></div>';
    const resMap = { Inspected: ['ok', 'INSPECTED — MATERIAL SELESAI DIINSPEKSI', 'checkc'], Revoke: ['err', 'REVOKE — PENERIMAAN DIBATALKAN (MvT 102)', 'alertc'], 'Awaiting Inspection': ['warn', 'AWAITING INSPECTION — MENUNGGU INSPEKSI', 'clock'] };
    const rm = resMap[x.status] || resMap['Awaiting Inspection'];
    const tatOk = x.done && x.tat <= tatTarget;
    el.innerHTML =
      '<div class="ph"><div class="ph-title"><div class="eyebrow"><a href="#/inspeksi">Data Inspeksi</a><span>/ Record Detail</span></div>' +
      '<h1>Inspection Record #' + h(x.po) + ' ' + UI.mriBadge(x.status) + '</h1><p><span class="badge b-pend nc">ID ' + h(x.id) + '</span> <span class="badge b-pend nc">SAP MvT: ' + h(x.mvt || '—') + '</span> <span class="badge b-pend nc">Source: ' + h(x.source || '—') + '</span></p></div>' +
      '<div class="ph-actions"><a class="btn btn-ghost" href="#/inspeksi">' + icon('chevl') + 'Kembali</a>' +
      (canEdit ? '<button class="btn btn-outline" id="dEdit">' + icon('edit') + 'Edit Record</button>' : '') +
      (isSA ? '<button class="btn btn-soft-danger" id="dDel">' + icon('trash') + 'Hapus</button>' : '') +
      '<button class="btn btn-primary" id="dPrint">' + icon('printer') + 'Cetak Laporan Inspeksi (PDF)</button></div></div>' +
      '<div class="grid g2 mb">' +
      '<section class="card"><div class="sec-card-h"><span class="sec-ico">' + icon('box') + '</span><div style="flex:1"><div class="ey">Identifier Specification</div><h2 class="sec-title">SEC-01: Material Information</h2></div></div>' +
      '<div class="kv-grid">' + kv('Material Code', '<span class="mono">' + h(x.material) + '</span> <button class="icon-btn" style="width:24px;height:24px;display:inline-grid" id="cpMat" aria-label="Salin kode">' + icon('copy', 'sm') + '</button>') + kv('Material Type', h(x.matType)) +
      kv('Item Specification & Description', '<span style="font-size:15px">' + h(x.desc) + '</span>', 'span2') + kv('Batch Lot Number', '<span class="mono"># ' + h(x.batch) + '</span>') +
      kv('Quantity Received', '<span style="font-size:22px;font-weight:700" class="num">' + num(x.qty) + '</span> ' + h(x.unit)) + '</div></section>' +
      '<section class="card"><div class="sec-card-h"><span class="sec-ico">' + icon('pin') + '</span><div style="flex:1"><div class="ey">Logistics & Routing</div><h2 class="sec-title">SEC-03: Vendor & Location Details</h2></div></div>' +
      '<div class="kv-grid">' + kv('Vendor Master ID', '<span class="mono">' + h(x.vendor) + '</span>') + kv('Plant Location', h(x.plant)) +
      kv('Registered Supplier Name', '<a href="#/inspeksi?vendor=' + encodeURIComponent(x.vendorName) + '">' + h(x.vendorName) + '</a>', 'span2') + kv('Storage Location (SLoc)', h(x.sloc)) + kv('Type PO', x.typePo ? '<span class="badge b-info nc">' + h(x.typePo) + '</span>' : '') + '</div></section>' +
      '<section class="card"><div class="sec-card-h"><span class="sec-ico">' + icon('file') + '</span><div style="flex:1"><div class="ey">Procurement Audit Chain</div><h2 class="sec-title">SEC-02: Document Reference</h2></div></div>' +
      '<div class="kv-grid">' + kv('Purchase Order (PO)', '<span class="mono">' + h(x.po) + '</span>') + kv('Bill of Lading', '<span class="mono">' + h(x.bl) + '</span>') +
      kv('Material Document (SAP)', '<span class="mono">' + h(x.matDoc) + '</span>') + kv('Movement Type (MvT)', h(x.mvt)) +
      kv('Kolom 102 (reversal)', x.ref102 ? '<span class="mono">' + h(x.ref102) + '</span>' : '') + kv('Kolom 321 · tanggal', (x.ref321 ? '<span class="mono">' + h(x.ref321) + '</span> · ' : '') + (x.tanggal ? UI.date(x.tanggal) : '')) + '</div>' +
      '<h3 class="sec-title" style="font-size:14px;margin:18px 0 8px">Item lain pada PO yang sama (' + related.length + ')</h3>' +
      (d._partial ? '<div class="skel"></div><div class="skel" style="margin-top:8px;width:70%"></div>' : related.length ? '<div class="tbl-wrap"><table class="tbl dense"><tbody>' + related.slice(0, 8).map(o => '<tr class="click" onclick="location.hash=\'#/inspeksi/' + encodeURIComponent(o.id) + '\'"><td class="code-link">' + h(o.material) + '</td><td class="ellip">' + h(o.desc) + '</td><td class="r num">' + num(o.qty) + ' ' + h(o.unit) + '</td><td>' + UI.mriBadge(o.status) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="small muted" style="margin:0">Tidak ada item lain.</p>') + '</section>' +
      '<section class="card"><div class="sec-card-h"><span class="sec-ico">' + icon('shield') + '</span><div style="flex:1"><div class="ey">Compliance & Sign-off</div><h2 class="sec-title">SEC-04: Inspection Result & QC Sign-off</h2></div>' + (x.done ? '<span class="badge b-ok">Finalized</span>' : '<span class="badge b-pend">Open</span>') + '</div>' +
      '<div class="kv-grid">' + kv('Posting Date (Receipt)', UI.date(x.postingDate)) + kv('Inspection Completion Date', x.inspDate ? UI.date(x.inspDate) : '') +
      kv('Turnaround Time', x.done ? '<span style="font-size:20px;font-weight:700" class="num">' + num(x.tat) + ' hari</span> <span class="badge nc ' + (tatOk ? 'b-ok' : 'b-err') + '">' + (tatOk ? 'Dalam SLA' : 'Lewat SLA') + ' ≤ ' + tatTarget + ' hr</span>' : '<span class="num">' + num(x.pendingAge) + ' hari awaiting</span>') +
      kv('Inspector', x.inspector ? '<div class="who"><span class="mini-av">' + h(UI.initials(x.inspectorName || x.inspector)) + '</span>' + h(x.inspectorName || x.inspector) + '</div>' : '') + '</div>' +
      '<div class="result-box ' + rm[0] + '">' + icon(rm[2], 'lg') + '<div><div class="xs" style="letter-spacing:.08em;font-weight:600">QUALITY ASSESSMENT FINAL RESULT</div><b>' + rm[1] + '</b></div></div>' +
      (x.result || x.remarks ? '<div class="kv-box" style="margin-top:12px"><div class="k">Inspector Remarks & Notes</div><div class="v" style="font-weight:400;font-style:italic">' + h(x.result) + (x.result && x.remarks ? '<br>' : '') + h(x.remarks) + '</div></div>' : '') + '</section></div>' +
      '<div class="grid g2">' +
      '<section class="card flush"><div class="pad"><h2 class="sec-title">' + icon('alert') + 'Finding terkait PO ini (' + findings.length + ')</h2></div>' +
      (d._partial ? '<div class="pad" style="padding-top:0"><div class="skel"></div><div class="skel" style="margin-top:8px"></div></div>' : findings.length ? '<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>No Notif</th><th>Subject</th><th>Status</th><th class="r">Aging</th></tr></thead><tbody>' +
        findings.map(f => '<tr class="click" data-nf="' + h(f.noNotif) + '"><td class="code-link">#' + h(f.noNotif) + '</td><td>' + h(f.subject) + '</td><td>' + UI.fdBadge(f.status) + '</td><td class="r">' + UI.agingBadge(f) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="pad" style="padding-top:0"><p class="small muted" style="margin:0">Tidak ada finding untuk PO ini.</p></div>') + '</section>' +
      '<section class="card"><h2 class="sec-title" style="margin-bottom:14px">' + icon('history') + 'Riwayat perubahan (audit trail)</h2>' +
      (d._partial ? '<div class="skel"></div><div class="skel" style="margin-top:8px;width:60%"></div>' : history.length ? '<ul class="timeline">' + history.map(a => '<li><div class="t">' + UI.dt(a.ts) + ' · ' + h(a.name) + ' · <b>' + h(a.action) + '</b></div><div class="small">' + h(a.details) + '</div></li>').join('') + '</ul>' : '<p class="small muted" style="margin:0">Belum ada perubahan tercatat untuk record ini.</p>') + '</section></div>';
    $('#cpMat').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(x.material); UI.toast('Kode material disalin.', 'info'); };
    $('#dPrint').onclick = () => UI.cetak('INSPEKSI', { ref: x.id });
    UI.$$('[data-nf]').forEach(t => t.onclick = () => openFindingDetail(t.dataset.nf));
    if (canEdit) $('#dEdit').onclick = () => openRecordForm(x, () => App.go());
    if (isSA) $('#dDel').onclick = () => deleteRecords([x.id], () => { location.hash = '#/inspeksi'; });
    };
    // Belum ada cache detail → tampilkan seketika dari baris tabel yang sudah dimuat, lalu lengkapi dari server
    const row = (Pages.inspeksi._rowMap || {})[id];
    if (row && !API.peek('getDetail', { id })) draw({ record: row, findings: [], related: [], history: [], tatTarget: Pages.inspeksi._tatTarget || 2, _partial: true });
    await API.swr('getDetail', { id }, draw, { fresh: 20000 });
  }
};
