/**
 * pages-admin.js — Data Import & Migrasi · User Management · Audit Log · System Config
 */
function importReportHtml(rep, dry) {
  const { h, num } = UI;
  const cols = rep.mappedColumns ? Object.keys(rep.mappedColumns).length : 0;
  return '<div class="card pad-s mt" style="box-shadow:none;background:var(--bg)">' +
    '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px"><b>' + h(rep.label || rep.dataset) + (rep.sourceSheet ? ' <span class="muted small">← sheet "' + h(rep.sourceSheet) + '" (header baris ' + rep.headerRow + ')</span>' : '') + '</b>' +
    '<span class="badge ' + (dry ? 'b-info' : rep.failed ? 'b-warn' : 'b-ok') + '">' + (dry ? 'Hasil pindai (dry-run)' : rep.failed ? 'Selesai dengan peringatan' : 'Berhasil') + '</span></div>' +
    '<div class="tbl-wrap"><table class="tbl dense report-tbl"><thead><tr><th>Baris sumber</th><th>' + (dry ? 'Akan ditambah' : 'Ditambah') + '</th><th>' + (dry ? 'Akan diperbarui' : 'Diperbarui') + '</th><th>Dilewati</th><th>Gagal</th></tr></thead>' +
    '<tbody><tr><td class="num">' + num(rep.source) + '</td><td class="num" style="color:var(--ok);font-weight:700">' + num(rep.inserted) + '</td><td class="num" style="color:var(--primary-ink);font-weight:700">' + num(rep.updated) + '</td><td class="num">' + num(rep.skipped) + '</td><td class="num" style="color:' + (rep.failed ? 'var(--err)' : 'inherit') + ';font-weight:700">' + num(rep.failed) + '</td></tr></tbody></table></div>' +
    (cols ? '<div class="small muted" style="margin-top:8px">' + cols + ' kolom dikenali' + (rep.unknownColumns && rep.unknownColumns.length ? ' · diabaikan: ' + rep.unknownColumns.slice(0, 8).map(h).join(', ') : '') + '</div>' : '') +
    (rep.warnings && rep.warnings.length ? '<ul class="warnlist">' + rep.warnings.map(w => '<li>' + h(w) + '</li>').join('') + '</ul>' : '') +
    (rep.errors && rep.errors.length ? '<ul class="errlist">' + rep.errors.slice(0, 100).map(e => '<li>Baris ' + e.row + ': ' + h(e.msg) + '</li>').join('') + (rep.errors.length > 100 ? '<li>… dan lainnya</li>' : '') + '</ul>' : '') + '</div>';
}
function mergeReports(a, b) {
  if (!a) return b;
  ['source', 'valid', 'inserted', 'updated', 'skipped', 'failed', 'duplicates'].forEach(k => { a[k] = (a[k] || 0) + (b[k] || 0); });
  a.errors = (a.errors || []).concat(b.errors || []); a.warnings = Array.from(new Set((a.warnings || []).concat(b.warnings || [])));
  return a;
}

const IMPORT_DS = {
  master: { title: 'Import Master Data (Material Receiving)', sub: 'Dump goods receipt harian SAP MIGO/ME21N → Master Data', badge: 'SAP MIGO / ME21N', icon: 'archive', tpl: 'Master Data', run: 'Master Data' },
  finding: { title: 'Import Finding List (NCR Log)', sub: 'Temuan kualitas, serial mismatch & log karantina', badge: 'Quality NCR Log', icon: 'alert', tpl: 'NCR', run: 'Finding List', style: 'background:var(--err-bg);color:var(--err)' },
  training: { title: 'Import Training Mandatory', sub: 'Nama inspector, nama training, tanggal & next due — reminder WA otomatis', badge: 'Training Matrix', icon: 'award', tpl: 'Training', run: 'Training', style: 'background:var(--ok-bg);color:var(--ok)' }
};
Pages.import = {
  crumb: 'Data Import & Synchronization', group: 'Settings',
  async render(el, r, ctx) {
    const { h, icon, num, $ } = UI;
    const isSA = App.can(App.SAO);
    el.innerHTML =
      '<div class="ph"><div class="ph-title"><div class="eyebrow"><span class="hl">● Settings module / Data import & sync</span></div><h1>Data Import & Synchronization</h1>' +
      '<p>Unggah dump SAP (MIGO/ME21N) & log NCR, sinkron API, dan migrasi data dari spreadsheet lama — semuanya aman diulang (idempoten) dengan pindai dry-run lebih dulu.</p></div>' +
      '<div class="ph-actions"><div class="rel"><button class="btn btn-outline" id="tplBtn">' + icon('sheet') + 'Download Excel Templates' + icon('chevd', 'sm') + '</button></div>' +
      '<button class="btn btn-primary" id="syncNow" data-busy="Menyinkronkan…">' + icon('refresh') + 'Manual Sync Now</button></div></div>' +
      '<div class="grid g3 mb">' + Object.keys(IMPORT_DS).map(ds => '<section class="card" id="card_' + ds + '"><div class="card-h"><div class="who"><span class="sec-ico" style="' + (IMPORT_DS[ds].style || '') + '">' + icon(IMPORT_DS[ds].icon) + '</span>' +
        '<div><h2 class="sec-title">' + IMPORT_DS[ds].title + '</h2><div class="sec-sub">' + IMPORT_DS[ds].sub + '</div></div></div>' +
        '<span class="badge b-pend">' + IMPORT_DS[ds].badge + '</span></div>' +
        '<label class="drop" data-drop="' + ds + '" tabindex="0"><input type="file" accept=".xlsx,.xls,.csv" hidden data-file="' + ds + '"><div class="ic">' + icon('cloud', 'lg') + '</div>' +
        '<div>Tarik & lepas file Excel di sini, atau <span style="color:var(--primary-ink);text-decoration:underline">pilih file</span></div><div class="small muted" style="margin-top:4px">.XLSX, .XLS, .CSV · maks 50.000 baris · header dikenali otomatis</div></label>' +
        '<div data-fileinfo="' + ds + '"></div>' +
        '<div class="card-f" style="margin-top:12px"><button class="link-btn small" data-tpl="' + ds + '">' + icon('download', 'sm') + 'Template ' + IMPORT_DS[ds].tpl + '.xlsx</button><span class="small" data-last="' + ds + '"></span></div>' +
        '<div data-rep="' + ds + '"></div></section>').join('') + '</div>' +
      '<section class="card mb" id="apiCard"></section>' +
      (isSA ? '<section class="card mb"><div class="card-h"><div class="who"><span class="sec-ico">' + icon('database') + '</span><div><h2 class="sec-title">Migrasi dari Spreadsheet / App Lama</h2><div class="sec-sub">Spreadsheet lama hanya <b>dibaca</b> — tidak pernah diubah. Aman diulang untuk delta sync sebelum cutover.</div></div></div><span class="badge b-closed">Superadmin</span></div>' +
        '<div class="steps"><span class="step on"><b>1</b>Tempel URL</span><span class="step"><b>2</b>Pindai (dry-run)</span><span class="step"><b>3</b>Jalankan import</span><span class="step"><b>4</b>Ulangi tepat sebelum cutover</span></div>' +
        '<div class="form-grid"><div class="field span2"><label for="mSrc">URL atau ID spreadsheet lama</label><input class="input" id="mSrc" placeholder="https://docs.google.com/spreadsheets/d/…/edit"><span class="hint">Harus bisa dibuka oleh akun Google pemilik Apps Script ini.</span></div>' +
        '<div class="field"><label>Data yang diimpor</label><div style="display:flex;gap:16px;flex-wrap:wrap;padding-top:6px"><label class="check"><input type="checkbox" data-mds value="master" checked>Master Data</label><label class="check"><input type="checkbox" data-mds value="finding" checked>Finding List</label><label class="check"><input type="checkbox" data-mds value="users">Master Users</label>' +
        '<label class="check"><input type="checkbox" data-mds value="training" checked>Training Mandatory</label><label class="check" title="Target KPI, master list, training wajib & jadwal reminder — hanya kunci aman, tidak menimpa yang sudah diubah"><input type="checkbox" data-mds value="config">Konfigurasi</label></div></div>' +
        '<div class="field"><label>Mode untuk data yang sudah ada</label><select class="select" id="mMode"><option value="isi">Isi yang kosong saja (aman, disarankan)</option><option value="timpa">Timpa field SAP dengan data lama</option></select></div>' +
        '<div class="field"><label for="mShM">Nama sheet Master (opsional)</label><input class="input" id="mShM" placeholder="otomatis: Master Data / MasterData / Sheet1…"></div>' +
        '<div class="field"><label for="mShF">Nama sheet Finding (opsional)</label><input class="input" id="mShF" placeholder="otomatis: Finding List / NCR…"></div>' +
        '<div class="field"><label for="mShT">Nama sheet Training (opsional)</label><input class="input" id="mShT" placeholder="otomatis: Training / Training Mandatory / Pelatihan…"></div>' +
        '<div class="field"><label for="mShC">Nama sheet Konfigurasi (opsional)</label><input class="input" id="mShC" placeholder="otomatis: AppConfig / Config / Settings…"></div>' +
        '<label class="check span2"><input type="checkbox" id="mNotify"> Kirim notifikasi untuk finding open yang baru diimpor (biasanya OFF saat migrasi historis)</label></div>' +
        '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn btn-outline" id="mScan" data-busy="Memindai…">' + icon('search') + 'Pindai (Dry-run)</button><button class="btn btn-primary" id="mRun" data-busy="Mengimpor…">' + icon('upload') + 'Jalankan Migrasi</button></div>' +
        '<div id="mRep"></div></section>' : '') +
      '<section class="card flush"><div class="pad card-h" style="margin:0"><div><h2 class="sec-title">Recent Import & Sync History Log</h2><div class="sec-sub" id="histSub"></div></div><button class="btn btn-outline btn-sm" id="histExp" data-busy="…">' + icon('download') + 'Export</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Batch ID</th><th>Timestamp</th><th>Dataset / Sumber</th><th>Import Type</th><th class="r">Processed Rows</th><th>Status</th><th>Initiator</th></tr></thead><tbody id="histBody">' + UI.skelRows(5, 7) + '</tbody></table></div><div id="histPager"></div>' +
      '<div class="pad small muted" style="border-top:1px solid var(--border)">' + icon('shield', 'sm') + ' Setiap import tercatat di Import Log & Audit Log (ISO 9001:2015 & GMP data retention).</div></section>';

    let log = null, histPage = 1;
    const files = {};
    const loadLog = async () => {
      const res = await API.call('getImportLog', { page: histPage, per: 8 }, { silent: true });
      if (!ctx.isCurrent() || !res.success) return;
      log = res.data;
      Object.keys(IMPORT_DS).forEach(ds => { const l = ds === 'master' ? log.lastMaster : ds === 'finding' ? log.lastFinding : log.lastTraining; $('[data-last="' + ds + '"]').innerHTML = l ? icon('checkc', 'sm') + ' Terakhir: ' + UI.dt(l.ts) + ' (' + num(l.rows) + ' baris · ' + h(l.status) + ')' : '<span class="muted">Belum pernah diimpor</span>'; });
      $('#histSub').textContent = num(log.total) + ' batch tercatat · sinkron terakhir ' + UI.ago(log.lastSync);
      $('#histBody').innerHTML = log.rows.length ? log.rows.map(x => '<tr><td class="mono" style="color:var(--primary-ink);font-weight:600">' + h(x.batchId) + '</td><td class="nw small">' + UI.dt(x.ts) + '</td><td><div class="cell-2"><b>' + h(x.dataset) + '</b><div class="s ellip">' + h(x.fileName) + '</div></div></td>' +
        '<td class="small">' + h(x.type) + '</td><td class="r small"><b class="num">' + num(x.rows) + '</b> baris<div class="xs muted">+' + num(x.inserted) + ' · ~' + num(x.updated) + ' · ✕' + num(x.failed) + '</div></td>' +
        '<td><span class="badge ' + (x.status === 'SUCCESS' ? 'b-ok' : x.status === 'WARNING' ? 'b-warn' : 'b-err') + ' b-live" title="' + h(x.notes) + '">' + h(x.status) + '</span></td><td class="small">' + h(x.initiator) + '</td></tr>').join('') : '<tr><td colspan="7">' + UI.empty('Belum ada riwayat import.') + '</td></tr>';
      const pg = $('#histPager'); pg.innerHTML = ''; pg.appendChild(UI.pager({ page: log.page, pages: log.pages, total: log.total, per: 8 }, (p) => { histPage = p; loadLog(); }, { noun: 'batch' }));
      const a = log.api;
      $('#apiCard').innerHTML = '<div class="card-h"><div class="who"><span class="sec-ico">' + icon('zap') + '</span><div><h2 class="sec-title">Realtime Data Sync (Pull API JSON)</h2><div class="sec-sub">Konektor generik: GAS menarik JSON dari endpoint Anda (mis. middleware SAP) tiap jam.</div></div></div>' +
        '<span class="badge ' + (a.aktif && a.url ? 'b-ok b-live' : 'b-pend') + '">' + (a.aktif && a.url ? 'Terhubung — aktif tiap jam' : a.url ? 'Dikonfigurasi, nonaktif' : 'Belum dikonfigurasi') + '</span></div>' +
        '<div class="grid g4" style="gap:12px"><div class="kv-box"><div class="k">Connector endpoint</div><div class="v mono small ellip" style="max-width:none">' + h(a.url || '—') + '</div><div class="xs muted" style="margin-top:4px">' + (a.hasToken ? '🔒 Bearer token tersimpan' : 'Tanpa token') + '</div></div>' +
        '<div class="kv-box"><div class="k">Sync frequency</div><div class="v">' + (a.aktif ? 'Setiap 1 jam' : 'Manual') + '</div></div>' +
        '<div class="kv-box"><div class="k">Diproses hari ini</div><div class="v num">' + num(log.todayRows) + ' baris</div><div class="xs muted">insert + update semua sumber</div></div>' +
        '<div class="kv-box"><div class="k">Tarikan terakhir</div><div class="v">' + (a.last ? UI.ago(a.last) : '—') + '</div><div class="xs muted">' + h(a.lastStatus || '') + '</div></div></div>' +
        '<div class="card-f"><button class="btn btn-outline btn-sm" id="apiTest" ' + (a.url ? '' : 'disabled') + ' data-busy="Menarik data…">' + icon('link') + 'Tarik data sekarang</button>' +
        (isSA ? '<a href="#/config" class="small">' + icon('sliders', 'sm') + ' Atur endpoint & token di System Config</a>' : '<span class="small muted">Konfigurasi endpoint oleh Superadmin</span>') + '</div>';
      const t = $('#apiTest'); if (t) t.onclick = () => UI.busy(t, async () => { const rr = await API.call('apiSyncNow', {}); if (UI.showResult(rr)) { API.invalidate(); loadLog(); } });
    };

    // --- file handling
    Object.keys(IMPORT_DS).forEach(ds => {
      const drop = $('[data-drop="' + ds + '"]'), inp = $('[data-file="' + ds + '"]');
      ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('over')));
      drop.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files[0]) pick(ds, e.dataTransfer.files[0]); });
      drop.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.click(); });
      inp.addEventListener('change', () => { if (inp.files[0]) pick(ds, inp.files[0]); inp.value = ''; });
    });
    const expected = { master: ['Material', 'PO', 'Posting Date', 'Quantity', 'Vendor Name', 'Batch'], finding: ['No Notif', 'Subject', 'Tanggal MRIR', 'Status', 'PIC Unit', 'Inspector'],
      training: ['Nama Inspector', 'Nama Training', 'Tanggal Training', 'Next Due Training', 'No Sertifikat'] };
    async function pick(ds, file) {
      const box = $('[data-fileinfo="' + ds + '"]');
      if (file.size > 25 * 1024 * 1024) { UI.toast('File melebihi 25 MB.', 'error'); return; }
      box.innerHTML = '<div class="notice"><span class="spinner sm"></span><div>Membaca ' + h(file.name) + '…</div></div>';
      try {
        const parsed = await UI.readSheetFile(file, expected[ds]);
        if (!parsed.rows.length) throw new Error('Tidak ada baris data di sheet pertama.');
        if (parsed.rows.length > 50000) throw new Error('Maksimal 50.000 baris per file.');
        files[ds] = { file, parsed };
        box.innerHTML = '<div class="notice">' + icon('sheet') + '<div style="flex:1"><b>' + h(file.name) + '</b> · ' + num(parsed.rows.length) + ' baris · sheet "' + h(parsed.sheet) + '", header di baris ' + parsed.headerRow +
          '<div class="xs muted" style="margin-top:2px">Kolom: ' + parsed.header.filter(Boolean).slice(0, 12).map(h).join(', ') + (parsed.header.length > 12 ? '…' : '') + '</div></div></div>' +
          '<div class="form-grid" style="margin-top:4px"><div class="field"><label>Data yang sudah ada</label><select class="select" data-mode="' + ds + '"><option value="isi">Isi field kosong saja (aman)</option><option value="timpa">Timpa dengan data file (SAP terbaru)</option></select></div>' +
          (ds === 'finding' ? '<div class="field"><label>Notifikasi</label><label class="check" style="padding-top:8px"><input type="checkbox" data-notify="finding" checked> Kirim notifikasi finding baru ke PIC/vendor</label></div>' : '<div></div>') + '</div>' +
          '<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap"><button class="btn btn-outline" data-scan="' + ds + '" data-busy="Memindai…">' + icon('search') + 'Pindai (Dry-run)</button>' +
          '<button class="btn btn-primary" data-run="' + ds + '" data-busy="Mengunggah…" style="flex:1">' + icon('upload') + 'Upload & Process ' + IMPORT_DS[ds].run + '</button>' +
          '<button class="btn btn-ghost" data-clear="' + ds + '">Batal</button></div>';
        $('[data-scan="' + ds + '"]').onclick = (e) => runImport(ds, true, e.currentTarget);
        $('[data-run="' + ds + '"]').onclick = (e) => runImport(ds, false, e.currentTarget);
        $('[data-clear="' + ds + '"]').onclick = () => { delete files[ds]; box.innerHTML = ''; $('[data-rep="' + ds + '"]').innerHTML = ''; };
      } catch (err) { box.innerHTML = '<div class="notice err">' + icon('alertc') + '<div>Gagal membaca file: ' + h(err.message) + '</div></div>'; }
    }
    async function runImport(ds, dry, btn) {
      const f = files[ds]; if (!f) return;
      if (!dry && !(await UI.confirm({ title: 'Jalankan import?', message: 'Sebanyak <b>' + num(f.parsed.rows.length) + '</b> baris dari <b>' + h(f.file.name) + '</b> akan diproses ke ' + IMPORT_DS[ds].run + '. Baris yang sudah ada tidak akan digandakan.', okText: 'Ya, import' }))) return;
      const mode = $('[data-mode="' + ds + '"]').value, notifyEl = $('[data-notify="' + ds + '"]');
      const rows = f.parsed.rows, CH = 5000, n = Math.ceil(rows.length / CH);
      const batchId = '#IMP-' + UI.todayYmd().replace(/-/g, '').substring(2) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      let agg = null;
      await UI.busy(btn, async () => {
        for (let i = 0; i < n; i++) {
          btn.innerHTML = '<span class="spinner sm"></span> ' + (dry ? 'Memindai' : 'Mengimpor') + ' bagian ' + (i + 1) + '/' + n + '…';
          const res = await API.call('importData', { dataset: ds, rows: rows.slice(i * CH, (i + 1) * CH), dryRun: dry, mode, notify: notifyEl ? notifyEl.checked : false, fileName: f.file.name, batchId, rowOffset: i * CH + f.parsed.headerRow - 1, final: i === n - 1 }, { timeout: 300000 });
          if (!res.success) { UI.showResult(res); $('[data-rep="' + ds + '"]').innerHTML = '<div class="notice err">' + icon('alertc') + '<div>' + h(res.message) + '</div></div>'; return; }
          agg = mergeReports(agg, res.data);
        }
        $('[data-rep="' + ds + '"]').innerHTML = importReportHtml(agg, dry);
        if (!dry) { UI.toast('Import selesai: +' + num(agg.inserted) + ' baru, ' + num(agg.updated) + ' diperbarui, ' + num(agg.failed) + ' gagal.', agg.failed ? 'warn' : 'success', 7000); API.invalidate(); App.loadLookups(); loadLog(); }
        if (!dry && ds === 'training') UI.toast('Buka menu Training Mandatory untuk melihat matriks & jadwal reminder.', 'info', 6000);
      });
    }
    // --- templates
    $('#tplBtn').onclick = (e) => App.dropdown(e.currentTarget, ['master', 'finding', 'training'].concat(isSA ? ['users'] : []).map(k => '<button class="dd-item" data-t="' + k + '">' + icon('sheet') + (k === 'master' ? 'Master Data (SAP GR)' : k === 'finding' ? 'Finding List (NCR)' : k === 'training' ? 'Training Mandatory' : 'Master Users') + '</button>').join(''), (ev, d) => {
      const b = ev.target.closest('[data-t]'); if (b) { d.remove(); tpl(b.dataset.t); }
    });
    UI.$$('[data-tpl]').forEach(b => b.onclick = () => tpl(b.dataset.tpl));
    async function tpl(k) {
      if (!log) await loadLog();
      const sample = { master: ['RDKA-BRG-001', 'Cable 50mm² NYY', 'B2026091', '404067857', 'BL-2026-0021', '101', '1000', '5000012345', 'SL-102', 'V-QB283', 'PT Contoh Vendor', 'Standard', UI.todayYmd(), 100, 'EA', '', 'Electrical & Instrumentation', '', '', 'Pending', ''],
        finding: ['10012345', 'Nama Inspector', 'DIFF S/N', 'PT Contoh Vendor', '404067857', 2, 'Quarantine Bay Alpha', 'Rack Q-01', UI.todayYmd(), 'Open', UI.todayYmd(), 'Procurement', '', 'Serial number beda dengan PO', 'RDKA-BRG-001'],
        users: ['nama@company.com', 'Nama Lengkap', 'USER', 'QC Inspection', '081234567890', 'EMP-001'],
        training: ['Nama Inspector', (App.lookups && App.lookups.trainingMaster && App.lookups.trainingMaster[0]) || 'Basic QC Inspection', UI.todayYmd(), '', 'CERT-001', 'Internal QA Academy', 'Kosongkan Next Due → dihitung otomatis dari masa berlaku training wajib'] };
      UI.downloadTemplate(log.templates[k], 'Template_MRI_' + k + '.xlsx', sample[k]);
    }
    $('#syncNow').onclick = (e) => UI.busy(e.currentTarget, async () => {
      if (log && log.api.url) { const rr = await API.call('apiSyncNow', {}); if (UI.showResult(rr)) { API.invalidate(); loadLog(); App.loadLookups(); } }
      else { API.invalidate(); await App.loadLookups(); await loadLog(); UI.toast('Cache dibersihkan & data dimuat ulang. Konektor API belum dikonfigurasi.', 'info', 6000); }
    });
    $('#histExp').onclick = (e) => UI.doExport(e.currentTarget, 'importlog', {});
    // --- migrasi
    if (isSA) {
      const mig = async (dry, btn) => {
        const source = $('#mSrc').value.trim(); if (!source) { UI.toast('Tempel URL/ID spreadsheet lama.', 'error'); return; }
        const datasets = UI.$$('[data-mds]').filter(c => c.checked).map(c => c.value); if (!datasets.length) { UI.toast('Pilih minimal satu data.', 'error'); return; }
        if (!dry && !(await UI.confirm({ title: 'Jalankan migrasi?', message: 'Data dari spreadsheet lama akan ditambahkan ke database app ini. Spreadsheet lama <b>tidak</b> diubah. Aman diulang — baris yang sudah ada tidak digandakan.', okText: 'Jalankan' }))) return;
        await UI.busy(btn, async () => {
          const res = await API.call(dry ? 'migrasiScan' : 'migrasiRun', { source, datasets, mode: $('#mMode').value, notify: $('#mNotify').checked, sheetNames: { master: $('#mShM').value.trim(), finding: $('#mShF').value.trim(), training: $('#mShT').value.trim(), config: $('#mShC').value.trim() } }, { timeout: 360000 });
          if (!res.success) { UI.showResult(res); return; }
          const d = res.data;
          UI.$$('.steps .step').forEach((s, i) => s.classList.toggle('on', i <= (dry ? 1 : 3)));
          $('#mRep').innerHTML = '<div class="notice mt">' + icon('database') + '<div>Sumber: <b>' + h(d.source.name) + '</b> — sheet: ' + d.source.sheets.map(s => h(s.name) + ' (' + num(s.rows) + ')').join(', ') + '</div></div>' +
            Object.keys(d.report).map(k => d.report[k].missing ? '<div class="notice warn">' + icon('alert') + '<div>' + h(d.report[k].label) + ': sheet tidak ditemukan. Isi nama sheet secara manual.</div></div>' : importReportHtml(d.report[k], dry)).join('') +
            (!dry ? '<div class="notice mt">' + icon('info') + '<div><b>Checklist cutover:</b> cek data di Data Inspeksi & Laporan → uji dengan 1 akun user → tepat sebelum pindah, klik <b>Jalankan Migrasi</b> sekali lagi (delta) → umumkan alamat baru. User lama tanpa password login via Google atau direset Superadmin.</div></div>' : '');
          if (!dry) { API.invalidate(); App.loadLookups(); loadLog(); UI.toast('Migrasi selesai.'); }
        });
      };
      $('#mScan').onclick = (e) => mig(true, e.currentTarget);
      $('#mRun').onclick = (e) => mig(false, e.currentTarget);
    }
    if (r.q.ds && $('#card_' + r.q.ds)) setTimeout(() => { const c = $('#card_' + r.q.ds); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.classList.add('flash'); } }, 50);
    await loadLog();
  }
};

// ============================================================================
function showTempPasswords(list) {
  const { h } = UI;
  const m = UI.modal({ title: 'Password sementara', size: list.length > 1 ? 'lg' : 'sm', body:
    '<div class="notice warn">' + UI.icon('key') + '<div>Password hanya ditampilkan <b>sekali</b>. Bagikan secara aman; user wajib menggantinya saat login pertama.' + (list.length > 1 ? ' Unduh sebagai Excel untuk distribusi.' : '') + '</div></div>' +
    '<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Nama</th><th>Email</th><th>Password sementara</th></tr></thead><tbody>' + list.map(x => '<tr><td>' + h(x.name) + '</td><td class="small">' + h(x.email) + '</td><td class="mono"><b>' + h(x.tempPassword) + '</b></td></tr>').join('') + '</tbody></table></div>',
    footer: '<button class="btn btn-outline" id="tpCopy">' + UI.icon('copy') + 'Salin</button>' + (list.length > 1 ? '<button class="btn btn-primary" id="tpXls">' + UI.icon('download') + 'Unduh Excel</button>' : '<button class="btn btn-primary" data-ok>Selesai</button>') });
  UI.$('#tpCopy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(list.map(x => x.email + '\t' + x.tempPassword).join('\n')); UI.toast('Disalin ke clipboard.', 'info'); };
  const ok = m.el.querySelector('[data-ok]'); if (ok) ok.onclick = m.close;
  const x = UI.$('#tpXls'); if (x) x.onclick = () => UI.exportXlsx({ fileName: 'Akun_Baru_MRI_' + UI.todayYmd() + '.xlsx', sheets: [{ name: 'Akun', headers: ['Nama', 'Email', 'Role', 'Password sementara'], rows: list.map(u => [u.name, u.email, u.role || '', u.tempPassword]) }] });
}
function openUserForm(u, depts, onSaved) {
  const { h, icon } = UI;
  const isNew = !u, v = u || { role: 'USER' };
  const role = (val, title, desc) => '<label class="card pad-s hoverable" style="display:block;box-shadow:none;' + (v.role === val ? 'border-color:var(--primary);background:var(--primary-soft)' : '') + '"><div style="display:flex;justify-content:space-between;gap:8px"><b>' + title + '</b><input type="radio" name="uRole" value="' + val + '" ' + (v.role === val ? 'checked' : '') + '></div><div class="small t2" style="margin-top:4px">' + desc + '</div></label>';
  const m = UI.modal({ title: isNew ? 'Create New User & Assign RBAC' : 'Edit User ' + h(u.userId), size: 'lg', body:
    '<div class="form-grid"><div class="field"><label for="uName">Full Legal Name <span class="req">*</span></label><input class="input" id="uName" value="' + h(v.name || '') + '" placeholder="mis. Raditya Pratama"></div>' +
    '<div class="field"><label for="uEmail">Work Email (Google Workspace) <span class="req">*</span></label><input class="input" id="uEmail" type="email" value="' + h(v.email || '') + '" placeholder="nama@company.com"></div>' +
    '<div class="field"><label for="uEmp">Employee ID</label><input class="input" id="uEmp" value="' + h(v.empId || '') + '" placeholder="EMP-2026-889"></div>' +
    '<div class="field"><label for="uDept">Department / PIC Unit</label><input class="input" id="uDept" list="uDl" value="' + h(v.dept || '') + '"><datalist id="uDl">' + depts.concat((App.lookups && App.lookups.picUnits) || []).filter((x, i, a) => a.indexOf(x) === i).map(d => '<option value="' + h(d) + '">').join('') + '</datalist><span class="hint">Samakan dengan nama PIC Unit agar menerima notifikasi finding unitnya.</span></div>' +
    '<div class="field"><label for="uWa">No. WhatsApp</label><input class="input" id="uWa" value="' + h(v.noWa || '') + '" placeholder="0812xxxxxxx"></div><div></div>' +
    '<div class="field span2"><label>System RBAC Role <span class="req">*</span></label><div class="grid g3" style="gap:10px">' +
    role('USER', 'User (Inspector)', 'Melihat dashboard, data inspeksi & semua laporan, export Excel.') + role('ADMIN', 'Admin (Supervisor)', 'Kelola data inspeksi & finding, import Excel, blast WA & CRM.') + role('SUPERADMIN', 'Superadmin (Master)', 'Akses penuh: user, audit log, konfigurasi, hapus data, migrasi.') + '</div></div>' +
    (isNew ? '<label class="check span2"><input type="checkbox" id="uNoPw"> Tanpa password (hanya login dengan Google SSO)</label>' : '') + '</div>',
    footer: '<button class="btn btn-ghost" data-c>Discard</button><button class="btn btn-primary" id="uSave" data-busy="Menyimpan…">' + icon(isNew ? 'send' : 'check') + (isNew ? 'Create User & Kirim Undangan' : 'Simpan') + '</button>' });
  m.el.querySelector('[data-c]').onclick = m.close;
  UI.$$('input[name=uRole]', m.el).forEach(r => r.onchange = () => UI.$$('input[name=uRole]', m.el).forEach(x => { const c = x.closest('label'); c.style.borderColor = x.checked ? 'var(--primary)' : ''; c.style.background = x.checked ? 'var(--primary-soft)' : ''; }));
  UI.$('#uSave').onclick = () => UI.busy(UI.$('#uSave'), async () => {
    const user = { userId: u ? u.userId : '', name: UI.$('#uName').value.trim(), email: UI.$('#uEmail').value.trim(), empId: UI.$('#uEmp').value.trim(), dept: UI.$('#uDept').value.trim(), noWa: UI.$('#uWa').value.trim(),
      role: (UI.$('input[name=uRole]:checked', m.el) || {}).value, noPassword: isNew && UI.$('#uNoPw').checked };
    const res = await API.call('manageUsers', { op: 'save', user });
    if (UI.showResult(res)) { m.close(); onSaved(); if (res.data.tempPassword) showTempPasswords([{ name: user.name, email: user.email, tempPassword: res.data.tempPassword }]); }
  });
}

Pages.users = {
  crumb: 'User Management & Access Control', group: 'Settings', saBanner: true,
  async render(el, r, ctx) {
    const { h, icon, num, $ } = UI;
    const st = { q: '', role: '', active: '', dept: '', page: 1, per: 10, sort: 'userId', dir: 'asc' };
    const sel = new Set();
    let depts = [];
    el.innerHTML =
      '<div class="ph"><div class="ph-title"><div class="eyebrow"><span>Settings module / Access control</span></div><h1>User Management & Role-Based Access Control <span class="badge b-err">Superadmin only</span></h1>' +
      '<p>Kelola akun administrator, inspector, dan staf gudang; atur role RBAC dan pantau aktivitas login.</p></div>' +
      '<div class="ph-actions"><button class="btn btn-outline" id="uBulk">' + icon('upload') + 'Bulk CSV/Excel Import</button><button class="btn btn-primary" id="uAdd">' + icon('plus') + 'Add New User</button></div></div>' +
      '<div class="grid g4 mb" id="uKpi"></div>' +
      '<div class="card pad-s mb"><div class="filterbar"><div class="grow input-icon">' + icon('search') + '<input class="input soft" id="uq" placeholder="Cari nama, email, atau USR-ID…"></div>' +
      '<select class="select soft" id="uRoleF">' + UI.opts([{ value: 'SUPERADMIN', label: 'Superadmin' }, { value: 'ADMIN', label: 'Admin' }, { value: 'USER', label: 'User' }], '', 'Semua role') + '</select>' +
      '<select class="select soft" id="uActF">' + UI.opts([{ value: 'Y', label: 'Active' }, { value: 'N', label: 'Inactive' }], '', 'Semua status') + '</select><select class="select soft" id="uDeptF"></select></div></div>' +
      '<div class="card flush"><div id="uBulkBar"></div><div class="tbl-wrap"><table class="tbl"><thead id="uHead"></thead><tbody id="uBody">' + UI.skelRows(7, 8) + '</tbody></table></div><div id="uPager"></div></div>';
    const bar = () => {
      $('#uBulkBar').innerHTML = sel.size ? '<div class="bulkbar"><b>' + sel.size + ' user dipilih</b><select class="select" style="height:30px;width:auto" id="bRole"><option value="">Ubah role…</option><option value="USER">→ User</option><option value="ADMIN">→ Admin</option><option value="SUPERADMIN">→ Superadmin</option></select>' +
        '<button class="btn btn-soft-danger btn-xs" id="bDeact">Nonaktifkan</button><button class="btn btn-soft btn-xs" id="bAct">Aktifkan</button><button class="btn btn-ghost btn-xs" id="bClr">Batal pilih</button></div>' : '';
      if (!sel.size) return;
      $('#bRole').onchange = async () => { const role = $('#bRole').value; if (!role) return; if (await UI.confirm({ title: 'Ubah role?', message: sel.size + ' user akan menjadi <b>' + role + '</b>.' })) { const rr = await API.call('manageUsers', { op: 'setRole', ids: Array.from(sel), role }); if (UI.showResult(rr)) { sel.clear(); load(); } } else $('#bRole').value = ''; };
      const setAct = async (active) => { if (!active && !(await UI.confirm({ title: 'Nonaktifkan ' + sel.size + ' user?', danger: true, message: 'Sesi mereka langsung berakhir dan tidak bisa login sampai diaktifkan lagi.', okText: 'Nonaktifkan' }))) return; const rr = await API.call('manageUsers', { op: 'setActive', ids: Array.from(sel), active }); if (UI.showResult(rr)) { sel.clear(); load(); } };
      $('#bDeact').onclick = () => setAct(false); $('#bAct').onclick = () => setAct(true); $('#bClr').onclick = () => { sel.clear(); load(); };
    };
    const draw = (d) => {
      if (!ctx.isCurrent()) return;
      const k = d.kpi; depts = d.depts;
      $('#uKpi').innerHTML =
        '<div class="kpi plain compact"><div class="kpi-top"><span class="kpi-label">Total Registered</span><span class="kpi-ico">' + icon('users') + '</span></div><div class="kpi-val">' + num(k.total) + (k.newQuarter ? '<span class="badge b-ok nc">+' + k.newQuarter + ' kuartal ini</span>' : '') + '</div><div class="bar"><i style="width:' + (k.total ? k.active / k.total * 100 : 0) + '%"></i></div><div class="kpi-foot"><span>' + num(k.active) + ' aktif</span></div></div>' +
        '<div class="kpi plain compact"><div class="kpi-top"><span class="kpi-label">Login 24 Jam</span><span class="kpi-ico ok">' + icon('zap') + '</span></div><div class="kpi-val">' + num(k.login24h) + '<span class="unit">user</span></div><div class="bar ok"><i style="width:' + (k.active ? k.login24h / k.active * 100 : 0) + '%"></i></div><div class="kpi-foot"><span>' + UI.pct(k.active ? k.login24h / k.active * 100 : 0) + ' dari user aktif</span></div></div>' +
        '<div class="kpi plain compact"><div class="kpi-top"><span class="kpi-label">Role Distribution</span><span class="kpi-ico warn">' + icon('shield') + '</span></div><div class="kpi-val" style="font-size:20px">' + k.roles.SUPERADMIN + ' <span class="unit small">SA</span> · ' + k.roles.ADMIN + ' <span class="unit small">Admin</span> · ' + k.roles.USER + ' <span class="unit small">User</span></div>' +
        '<div style="display:flex;height:6px;border-radius:3px;overflow:hidden;margin-top:14px;gap:2px"><i style="width:' + (k.roles.SUPERADMIN / Math.max(1, k.total) * 100) + '%;background:var(--rail)"></i><i style="width:' + (k.roles.ADMIN / Math.max(1, k.total) * 100) + '%;background:var(--primary)"></i><i style="width:' + (k.roles.USER / Math.max(1, k.total) * 100) + '%;background:var(--border-hover)"></i></div></div>' +
        '<div class="kpi plain compact"><div class="kpi-top"><span class="kpi-label">SSO Google</span><span class="kpi-ico">' + UI.GOOGLE_G + '</span></div><div class="kpi-val" style="font-size:22px">' + (k.googleSso ? 'Aktif' : 'Belum diatur') + (k.domain ? '<span class="badge b-info nc">@' + h(k.domain) + '</span>' : '') + '</div><div class="kpi-foot"><span>' + num(k.noPassword) + ' akun tanpa password lokal</span>' + (k.googleSso ? '' : '<a href="#/config">Atur</a>') + '</div></div>';
      $('#uDeptF').innerHTML = UI.opts(d.depts, st.dept, 'Semua departemen');
      $('#uHead').innerHTML = '<tr><th style="width:36px"><input type="checkbox" id="uAll" aria-label="Pilih semua"></th>' + UI.thSort('User ID', 'userId', st) + UI.thSort('Full Name & Identity', 'name', st) + UI.thSort('Work Email', 'email', st) + UI.thSort('Role (RBAC)', 'role', st) + UI.thSort('Department', 'dept', st) + '<th>Status</th>' + UI.thSort('Last Login', 'lastLogin', st) + '<th class="r">Aksi</th></tr>';
      UI.bindSort($('#uHead'), st, load);
      $('#uAll').onchange = () => { d.rows.forEach(u => $('#uAll').checked ? sel.add(u.userId) : sel.delete(u.userId)); draw(d); };
      $('#uBody').innerHTML = d.rows.map(u => '<tr class="' + (sel.has(u.userId) ? 'sel' : '') + (u.active ? '' : ' dim') + '" data-u="' + h(u.userId) + '"><td><input type="checkbox" data-s ' + (sel.has(u.userId) ? 'checked' : '') + ' aria-label="Pilih ' + h(u.name) + '"></td>' +
        '<td class="mono small">' + h(u.userId) + '</td><td><div class="who"><span class="mini-av">' + h(u.initials) + '</span><div class="cell-2"><b style="' + (u.active ? '' : 'text-decoration:line-through') + '">' + h(u.name) + '</b><div class="s">' + h(u.empId || '') + (u.noWa ? ' · ' + h(u.noWa) : '') + '</div></div></div></td>' +
        '<td class="mono small">' + h(u.email) + '</td><td>' + UI.roleBadge(u.role) + '</td><td class="small">' + h(u.dept || '—') + '</td>' +
        '<td>' + (u.active ? '<span class="badge b-ok b-live">Active</span>' : '<span class="badge b-pend">Inactive</span>') + '</td><td class="small nw">' + (u.lastLogin ? UI.dt(u.lastLogin) : '<span class="muted">belum pernah</span>') + '</td>' +
        '<td class="r nw"><button class="icon-btn" data-edit title="Edit" aria-label="Edit">' + icon('edit') + '</button><button class="icon-btn" data-pw title="Reset password" aria-label="Reset password">' + icon('key') + '</button>' +
        '<button class="icon-btn" data-tg title="' + (u.active ? 'Nonaktifkan' : 'Aktifkan') + '" aria-label="' + (u.active ? 'Nonaktifkan' : 'Aktifkan') + '" style="color:' + (u.active ? 'var(--err)' : 'var(--ok)') + '">' + icon(u.active ? 'lock' : 'checkc') + '</button></td></tr>').join('') || '<tr><td colspan="9">' + UI.empty('Tidak ada user.') + '</td></tr>';
      const pg = $('#uPager'); pg.innerHTML = ''; pg.appendChild(UI.pager(d, (p, per) => { st.page = p; st.per = per; load(); }, { perOptions: [10, 25, 50], noun: 'user' }));
      bar();
      $('#uBody').onclick = async (e) => {
        const tr = e.target.closest('[data-u]'); if (!tr) return; const u = d.rows.find(x => x.userId === tr.dataset.u);
        if (e.target.closest('[data-s]')) { e.target.checked ? sel.add(u.userId) : sel.delete(u.userId); tr.classList.toggle('sel', e.target.checked); bar(); return; }
        if (e.target.closest('[data-edit]')) openUserForm(u, depts, load);
        if (e.target.closest('[data-pw]')) { if (await UI.confirm({ title: 'Reset password ' + u.name + '?', message: 'Password sementara baru akan dibuat (dan dikirim via WA/email bila notifikasi aktif).' })) { const rr = await API.call('manageUsers', { op: 'resetPassword', userId: u.userId }); if (UI.showResult(rr)) showTempPasswords([{ name: u.name, email: u.email, tempPassword: rr.data.tempPassword }]); } }
        if (e.target.closest('[data-tg]')) { if (!u.active || await UI.confirm({ title: 'Nonaktifkan ' + u.name + '?', danger: true, message: 'Sesi user langsung berakhir.', okText: 'Nonaktifkan' })) { const rr = await API.call('manageUsers', { op: 'setActive', ids: [u.userId], active: !u.active }); if (UI.showResult(rr)) load(); } }
      };
    };
    const load = async () => { const res = await API.call('manageUsers', Object.assign({ op: 'list' }, st)); if (!ctx.isCurrent()) return; if (!res.success) throw res; draw(res.data); };
    $('#uq').addEventListener('input', UI.debounce(() => { st.q = $('#uq').value.trim(); st.page = 1; load(); }));
    ['#uRoleF', '#uActF', '#uDeptF'].forEach(s => $(s).onchange = () => { st.role = $('#uRoleF').value; st.active = $('#uActF').value; st.dept = $('#uDeptF').value; st.page = 1; load(); });
    $('#uAdd').onclick = () => openUserForm(null, depts, load);
    $('#uBulk').onclick = () => {
      const m = UI.modal({ title: 'Bulk Import User', body: '<p style="margin-top:0">Unggah file .xlsx/.csv dengan kolom <b>Email, FullName, Role, Department, NoWA, EmployeeID</b>. Email yang sudah terdaftar dilewati.</p>' +
        '<label class="drop"><input type="file" hidden accept=".xlsx,.xls,.csv" id="ubFile"><div class="ic">' + icon('upload', 'lg') + '</div>Pilih file</label><div id="ubInfo"></div>',
        footer: '<button class="btn btn-ghost" id="ubTpl">' + icon('download') + 'Template</button><button class="btn btn-primary" id="ubGo" disabled data-busy="Mengimpor…">Import</button>' });
      let rows = [];
      UI.$('#ubTpl').onclick = () => UI.downloadTemplate(['Email', 'FullName', 'Role', 'Department', 'NoWA', 'EmployeeID'], 'Template_MRI_users.xlsx', ['nama@company.com', 'Nama Lengkap', 'USER', 'QC Inspection', '081234567890', 'EMP-001']);
      UI.$('#ubFile').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const p = await UI.readSheetFile(f, ['Email', 'FullName', 'Role']); rows = p.rows.map(x => { const o = {}; Object.keys(x).forEach(k => { const n = k.toLowerCase().replace(/[^a-z]/g, ''); o[n === 'fullname' || n === 'nama' || n === 'name' ? 'name' : n === 'nowa' || n === 'wa' ? 'noWa' : n === 'employeeid' ? 'empId' : n === 'department' ? 'dept' : n] = x[k]; }); return o; }); UI.$('#ubInfo').innerHTML = '<div class="notice">' + icon('sheet') + '<div>' + h(f.name) + ' · ' + num(rows.length) + ' baris</div></div>'; UI.$('#ubGo').disabled = !rows.length; };
      UI.$('#ubGo').onclick = () => UI.busy(UI.$('#ubGo'), async () => { const rr = await API.call('manageUsers', { op: 'import', rows }); if (UI.showResult(rr)) { m.close(); load(); if (rr.data.errors.length) UI.toast(rr.data.errors.slice(0, 3).join(' · '), 'warn', 8000); if (rr.data.created.length) showTempPasswords(rr.data.created); } });
    };
    await load();
  }
};

// ============================================================================
Pages.audit = {
  crumb: 'System Audit & Compliance Log', group: 'Settings', saBanner: true,
  async render(el, r, ctx) {
    const { h, icon, num, $ } = UI;
    const st = { from: UI.todayYmd().substring(0, 8) + '01', to: UI.todayYmd(), user: '', action: '', menu: '', q: '', page: 1, per: 25 };
    el.innerHTML =
      '<div class="ph"><div class="ph-title"><div class="eyebrow"><span>Settings module / <span class="hl">Security & compliance</span></span></div><h1>System Audit & Compliance Log <span class="badge b-err">Superadmin only</span> <span class="badge b-ok b-live">Live</span></h1>' +
      '<p>Ledger aktivitas: login, view, perubahan data, import, export, konfigurasi, dan akses yang ditolak.</p></div>' +
      '<div class="ph-actions"><button class="btn btn-primary" id="aExp" data-busy="Menyiapkan…">' + icon('download') + 'Export Audit Log ke Excel</button></div></div>' +
      '<div class="grid g4 mb" id="aKpi"></div>' +
      '<div class="card mb"><div class="card-h" style="margin-bottom:12px"><h2 class="sec-title">' + icon('filter') + 'Audit Filter & Query Matrix</h2><span class="small muted" id="aStat"></span></div>' +
      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">' +
      '<div class="field"><label class="lbl up">Dari</label><input type="date" class="input" id="aFrom" value="' + st.from + '"></div><div class="field"><label class="lbl up">Sampai</label><input type="date" class="input" id="aTo" value="' + st.to + '"></div>' +
      '<div class="field"><label class="lbl up">User account</label><select class="select" id="aUser"></select></div><div class="field"><label class="lbl up">Action type</label><select class="select" id="aAct"></select></div>' +
      '<div class="field"><label class="lbl up">Module</label><select class="select" id="aMenu"></select></div><div class="field"><label class="lbl up">Cari detail</label><input class="input" id="aQ" placeholder="ID record, PO, kata kunci…"></div></div>' +
      '<div class="card-f"><span>' + icon('info', 'sm') + ' Catatan: Apps Script tidak mengekspos IP klien; kolom Client mencatat browser/perangkat.</span><div style="display:flex;gap:8px"><button class="btn btn-outline btn-sm" id="aReset">Reset</button><button class="btn btn-primary btn-sm" id="aApply">' + icon('search') + 'Apply Query</button></div></div></div>' +
      '<div class="card flush mb"><div class="pad card-h" style="margin:0"><h2 class="sec-title">Compliance Event Records <span class="badge b-info nc">Append-only ledger</span></h2></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Timestamp (WIB)</th><th>User Account</th><th>Role</th><th>Action</th><th>Module</th><th>Activity Details</th><th>Client</th></tr></thead><tbody id="aBody">' + UI.skelRows(8, 7) + '</tbody></table></div><div id="aPager"></div></div>' +
      '<div class="card" style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap"><span class="sec-ico" style="background:var(--primary);color:#fff">' + icon('shield') + '</span><div style="flex:1;min-width:240px"><h3 class="sec-title">Audit Trail Compliance Notice (ISO 9001 / GMP)</h3>' +
      '<p class="small t2" style="margin:6px 0 0">Aktivitas sistem, perubahan data, elevasi role dan import tercatat append-only di sheet AuditLog. Aplikasi tidak menyediakan fungsi hapus/ubah log; retensi minimal 2 tahun (PRD §6.5). Backup mingguan otomatis ke Google Drive. Batasi akses edit spreadsheet database hanya untuk pemilik script agar log tetap tidak termodifikasi.</p></div></div>';
    const ACT = { LOGIN: 'b-info', LOGOUT: 'b-pend', VIEW: 'b-pend', CREATE: 'b-ok', EDIT: 'b-warn', DELETE: 'b-err', IMPORT: 'b-info', EXPORT: 'b-pend', CONFIG: 'b-warn', NOTIF: 'b-info', DENIED: 'b-err' };
    let facetsSet = false;
    const params = () => ({ period: 'custom', from: st.from, to: st.to, user: st.user, action: st.action, menu: st.menu, q: st.q, page: st.page, per: st.per });
    const load = async () => {
      const res = await API.call('getAuditLog', params()); if (!ctx.isCurrent()) return; if (!res.success) throw res;
      const d = res.data, k = d.kpi;
      $('#aKpi').innerHTML =
        '<div class="kpi plain compact"><div class="kpi-top"><span class="kpi-label">Total Actions Today</span><span class="kpi-ico">' + icon('trend') + '</span></div><div class="kpi-val">' + num(k.today) + UI.delta(k.deltaYesterday, { title: 'vs kemarin' }) + '</div><div class="kpi-foot"><span>' + num(k.perHour, 1) + ' event/jam · puncak ' + h(k.peakHour) + ' WIB</span></div></div>' +
        '<div class="kpi plain compact"><div class="kpi-top"><span class="kpi-label">Data Modifications</span><span class="kpi-ico warn">' + icon('edit') + '</span></div><div class="kpi-val" style="font-size:24px">' + num(k.edits) + ' Edits / ' + num(k.deletes) + ' Deletes</div><div class="kpi-foot"><span>' + num(k.denied) + ' akses ditolak hari ini</span></div></div>' +
        '<div class="kpi plain compact"><div class="kpi-top"><span class="kpi-label">Data Exports</span><span class="kpi-ico">' + icon('download') + '</span></div><div class="kpi-val">' + num(k.exports) + '<span class="unit">export</span></div><div class="kpi-foot"><span>Excel · hari ini</span></div></div>' +
        '<div class="kpi plain compact"><div class="kpi-top"><span class="kpi-label">System Auth / Logins</span><span class="kpi-ico ok">' + icon('shield') + '</span></div><div class="kpi-val">' + num(k.logins) + '<span class="unit">login</span></div><div class="kpi-foot"><span>Google SSO & email/password</span></div></div>';
      if (!facetsSet) { facetsSet = true; $('#aUser').innerHTML = UI.opts(d.facets.users, st.user, 'Semua user'); $('#aAct').innerHTML = UI.opts(d.facets.actions, st.action, 'Semua action'); $('#aMenu').innerHTML = UI.opts(d.facets.menus, st.menu, 'Semua modul'); }
      $('#aStat').innerHTML = '● Query aktif: <b>' + num(d.total) + '</b> event cocok';
      $('#aBody').innerHTML = d.rows.length ? d.rows.map(a => '<tr class="' + (a.action === 'DELETE' || a.action === 'DENIED' ? 'row-err' : '') + '"><td class="nw"><div class="cell-2">' + UI.date(a.ts) + '<div class="s mono">' + h(String(a.ts).substring(11, 19)) + ' WIB</div></div></td>' +
        '<td><div class="who"><span class="mini-av">' + h(UI.initials(a.name)) + '</span><div class="cell-2"><b>' + h(a.name) + '</b><div class="s">' + h(a.email) + '</div></div></div></td>' +
        '<td>' + (a.role === 'SUPERADMIN' ? '<span class="badge b-closed">Superadmin</span>' : '<span class="badge b-pend">' + h(a.role) + '</span>') + '</td>' +
        '<td><span class="badge ' + (ACT[a.action] || 'b-pend') + '">' + h(a.action) + '</span></td><td class="small">' + h(a.menu) + '</td>' +
        '<td class="small" style="min-width:260px;max-width:460px">' + (a.action === 'DELETE' ? '⚠ ' : '') + h(a.details) + '</td><td class="xs muted">' + h(a.client) + '</td></tr>').join('') : '<tr><td colspan="7">' + UI.empty('Tidak ada event pada filter ini.') + '</td></tr>';
      const pg = $('#aPager'); pg.innerHTML = ''; pg.appendChild(UI.pager(d, (p, per) => { st.page = p; st.per = per; load(); }, { perOptions: [25, 50, 100], noun: 'event' }));
    };
    $('#aApply').onclick = () => { Object.assign(st, { from: $('#aFrom').value, to: $('#aTo').value, user: $('#aUser').value, action: $('#aAct').value, menu: $('#aMenu').value, q: $('#aQ').value.trim(), page: 1 }); load(); };
    $('#aReset').onclick = () => { Object.assign(st, { from: UI.todayYmd().substring(0, 8) + '01', to: UI.todayYmd(), user: '', action: '', menu: '', q: '', page: 1 }); $('#aFrom').value = st.from; $('#aTo').value = st.to; $('#aQ').value = ''; ['#aUser', '#aAct', '#aMenu'].forEach(s => $(s).value = ''); load(); };
    $('#aExp').onclick = (e) => UI.doExport(e.currentTarget, 'audit', params());
    await load();
  }
};

// ============================================================================
Pages.config = {
  crumb: 'System Config', group: 'Settings', saBanner: true,
  async render(el, r, ctx) {
    const { h, icon, num, $ } = UI;
    const res = await API.call('getConfig', {}); if (!ctx.isCurrent()) return; if (!res.success) throw res;
    const draw = (d) => {
      const LIST = ['FINDING_SUBJECTS', 'FINDING_STATUS', 'MRI_STATUS', 'PIC_UNITS', 'MATERIAL_TYPES'];
      const NUMK = ['TAT_TARGET_HARI', 'COMPLETION_TARGET', 'AGING_WARN_HARI', 'AGING_KRITIS_HARI', 'SESSION_MENIT', 'BACKUP_RETENSI'];
      const inp = (it) => {
        if (LIST.indexOf(it.key) > -1) { let arr = []; try { arr = JSON.parse(it.value); } catch (e) {} return '<textarea class="input" data-k="' + it.key + '" rows="5">' + h(arr.join('\n')) + '</textarea><span class="hint">Satu item per baris.</span>'; }
        if (it.key === 'API_SYNC_AKTIF') return '<label class="switch"><input type="checkbox" data-k="' + it.key + '" ' + (it.value === 'YA' ? 'checked' : '') + '><span class="tr"></span><span class="small">Tarik otomatis tiap jam</span></label>';
        return '<input class="input" data-k="' + it.key + '" ' + (NUMK.indexOf(it.key) > -1 ? 'type="number" min="0"' : '') + ' value="' + h(it.value) + '">';
      };
      const s = d.system;
      el.innerHTML =
        '<div class="ph"><div class="ph-title"><div class="eyebrow"><span>Settings module / System configuration</span></div><h1>System Config</h1><p>Ambang KPI & SLA, kategori master, keamanan login, integrasi API, dan pemeliharaan sistem. Semua perubahan tercatat di audit log.</p></div>' +
        '<div class="ph-actions"><button class="btn btn-primary" id="cfgSave" data-busy="Menyimpan…">' + icon('check') + 'Simpan Konfigurasi</button></div></div>' +
        '<div class="grid g-8-4"><div>' + d.groups.map(g => '<section class="card mb"><h2 class="sec-title" style="margin-bottom:16px">' + h(g.title) + '</h2><div class="form-grid">' +
          g.items.map(it => '<div class="field ' + (LIST.indexOf(it.key) > -1 ? '' : '') + '"><label>' + h(it.key) + '</label><span class="hint" style="margin-top:-4px">' + h(it.desc || '') + '</span>' + inp(it) + '</div>').join('') +
          (g.id === 'integrasi' ? '<div class="field"><label>API_SYNC_TOKEN (Bearer)</label><span class="hint" style="margin-top:-4px">Disimpan di Script Properties, tidak pernah tampil utuh</span><input class="input" type="password" id="apiTok" placeholder="' + h(d.apiTokenMasked || 'kosong') + '" autocomplete="off"><label class="check small"><input type="checkbox" id="apiTokDel"> Hapus token</label></div>' : '') +
          (g.id === 'auth' ? '<div class="field span2"><div class="notice" style="margin:0">' + icon('info') + '<div>Buat OAuth Client ID (tipe <b>Web application</b>) di Google Cloud Console → Authorized JavaScript origins: <code>' + h(location.origin) + '</code>. Lihat PANDUAN bagian Google SSO.</div></div></div>' : '') +
          '</div></section>').join('') + '</div>' +
        '<div><section class="card mb"><h2 class="sec-title" style="margin-bottom:14px">' + icon('database') + 'Informasi Sistem</h2><div class="kv-grid">' +
        [['Versi app', 'v' + h(s.version) + ' · skema ' + h(s.schema)], ['Timezone', h(s.timezone)], ['Master Data', num(s.counts.masterData) + ' baris'], ['Finding List', num(s.counts.findings) + ' baris'], ['Users', num(s.counts.users)], ['Backup terakhir', s.lastBackup ? UI.dt(s.lastBackup) : '—']].map(x => '<div class="kv-box"><div class="k">' + x[0] + '</div><div class="v small">' + x[1] + '</div></div>').join('') +
        '<div class="kv-box span2"><div class="k">Trigger terpasang</div><div class="v small">' + (s.triggers.length ? s.triggers.map(t => '<span class="badge b-info nc" style="margin:2px">' + h(t) + '</span>').join('') : '<span style="color:var(--err)">Belum ada — klik Pasang ulang trigger</span>') + '</div></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px"><a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="' + h(s.spreadsheetUrl) + '">' + icon('sheet') + 'Buka spreadsheet database</a>' + (s.folderUrl ? '<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="' + h(s.folderUrl) + '">' + icon('archive') + 'Buka folder Drive</a>' : '') + '</div></section>' +
        '<section class="card"><h2 class="sec-title" style="margin-bottom:14px">' + icon('zap') + 'Pemeliharaan</h2><div style="display:flex;flex-direction:column;gap:8px">' +
        '<button class="btn btn-outline btn-sm" data-op="backupNow" data-busy="Membuat backup…">' + icon('archive') + 'Backup sekarang</button>' +
        '<button class="btn btn-outline btn-sm" data-op="installTriggers">' + icon('clock') + 'Pasang ulang trigger</button>' +
        '<button class="btn btn-outline btn-sm" data-op="setupCheck">' + icon('checkc') + 'Periksa & lengkapi struktur sheet</button>' +
        '<button class="btn btn-outline btn-sm" data-op="clearCache">' + icon('refresh') + 'Bersihkan cache server</button>' +
        '<div class="dd-sep"></div>' +
        (s.counts.masterData === 0 ? '<button class="btn btn-soft btn-sm" data-op="seedDemo" data-busy="Membuat data demo…">' + icon('plus') + 'Isi data demo (UAT)</button>' : '') +
        '<button class="btn btn-soft-danger btn-sm" data-op="clearDemo" data-busy="Menghapus…">' + icon('trash') + 'Hapus data demo (sebelum go-live)</button></div>' +
        '<p class="xs muted" style="margin-bottom:0">Data demo bertanda Source = "Demo" dan memakai nama vendor fiktif.</p></section></div></div>';
      UI.$$('[data-op]').forEach(b => b.onclick = async () => {
        const op = b.dataset.op;
        if (op === 'clearDemo' && !(await UI.confirm({ title: 'Hapus semua data demo?', danger: true, okText: 'Hapus', message: 'Semua baris Master Data & Finding dengan Source = "Demo" dihapus permanen. Data asli tidak tersentuh.' }))) return;
        await UI.busy(b, async () => { const rr = await API.call('systemAction', { op }, { timeout: 300000 }); if (UI.showResult(rr)) { API.invalidate(); App.loadLookups(); if (['seedDemo', 'clearDemo', 'installTriggers'].indexOf(op) > -1) { const again = await API.call('getConfig', {}); if (again.success) draw(again.data); } } });
      });
      $('#cfgSave').onclick = (e) => UI.busy(e.currentTarget, async () => {
        const values = {};
        UI.$$('[data-k]').forEach(i => { const k = i.dataset.k; values[k] = i.type === 'checkbox' ? (i.checked ? 'YA' : 'TIDAK') : i.tagName === 'TEXTAREA' ? JSON.stringify(i.value.split('\n').map(x => x.trim()).filter(Boolean)) : i.value.trim(); });
        const payload = { values };
        if ($('#apiTokDel') && $('#apiTokDel').checked) payload.apiToken = '__HAPUS__'; else if ($('#apiTok') && $('#apiTok').value) payload.apiToken = $('#apiTok').value;
        const rr = await API.call('saveConfig', payload);
        if (UI.showResult(rr)) { API.invalidate(); App.loadLookups(); draw(rr.data); API.call('publicConfig', {}, { silent: true }).then(p => { if (p.success) API.LS.set('mri_pub', JSON.stringify(p.data)); }); }
      });
    };
    draw(res.data);
  }
};
