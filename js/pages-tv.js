/**
 * pages-tv.js — Dashboard TV (Open Access) · v2.6
 * • #/tv/<token> : layar monitoring tanpa login & tanpa sidebar, hanya lihat, auto-refresh 60 dtk, tanpa data pribadi
 *   Opsi URL: #/tv/<token>?p=month|quarter|year|last30|all  ·  &tema=terang
 * • TvLink       : kelola link (Superadmin) — salin, buka, buat link baru (link lama mati), nonaktifkan
 */
window.TvLink = (() => {
  const { h, icon } = UI;
  const linkOf = (c) => (c && c.token ? location.origin + location.pathname + '#/tv/' + encodeURIComponent(c.token) : '');
  function body(c) {
    const url = linkOf(c);
    return (c.aktif
      ? '<div class="notice" style="margin-top:0">' + icon('checkc') + '<div><b>Aktif.</b> Siapa pun yang memegang link ini bisa melihat ringkasan KPI (tanpa login, tanpa nama inspector/purchaser/user).' + (c.dibuat ? ' Dibuat ' + UI.dt(c.dibuat) + '.' : '') + '</div></div>' +
        '<div class="field"><label>Link Dashboard TV</label><div style="display:flex;gap:6px"><input class="input mono" readonly value="' + h(url) + '" data-tv-url style="font-size:12px"><button class="btn btn-outline btn-sm" data-tv="salin">' + icon('copy') + 'Salin</button></div>' +
        '<span class="hint">Tambahkan <span class="mono">?p=year</span> untuk tahun berjalan, <span class="mono">?p=all</span> semua data (bawaan: bulan ini).</span></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="' + h(url) + '">' + icon('tv') + 'Buka layar TV</a>' +
        '<button class="btn btn-outline btn-sm" data-tv="buatBaru">' + icon('refresh') + 'Buat link baru</button><button class="btn btn-soft-danger btn-sm" data-tv="nonaktifkan">' + icon('lock') + 'Nonaktifkan</button></div>'
      : '<div class="notice warn" style="margin-top:0">' + icon('lock') + '<div><b>Nonaktif.</b> Layar yang memakai link lama menampilkan pesan "link tidak valid".</div></div>' +
        '<button class="btn btn-primary btn-sm" data-tv="aktifkan">' + icon('zap') + (c.token ? 'Aktifkan lagi' : 'Aktifkan & buat link') + '</button>');
  }
  async function bind(el, c, refresh) {
    UI.$$('[data-tv]', el).forEach(b => b.onclick = async () => {
      const op = b.dataset.tv;
      if (op === 'salin') { const v = UI.$('[data-tv-url]', el).value; try { await navigator.clipboard.writeText(v); } catch (e) { UI.$('[data-tv-url]', el).select(); document.execCommand && document.execCommand('copy'); } UI.toast('Link Dashboard TV disalin.', 'info'); return; }
      if (op === 'buatBaru' && !(await UI.confirm({ title: 'Buat link baru?', danger: true, okText: 'Buat link baru', message: 'Link lama langsung <b>tidak berlaku</b>. Layar TV yang memakai link lama perlu dibuka ulang dengan link baru.' }))) return;
      if (op === 'nonaktifkan' && !(await UI.confirm({ title: 'Nonaktifkan Dashboard TV?', danger: true, okText: 'Nonaktifkan', message: 'Semua layar yang memakai link ini berhenti menampilkan data.' }))) return;
      await UI.busy(b, async () => { const r = await API.call('tv.configSave', { op }); if (UI.showResult(r)) refresh(r.data); });
    });
    void c;
  }
  /** Kartu di System Config */
  async function card(el) {
    if (!el) return;
    const r = await API.call('tv.config', {}, { silent: true });
    if (!r.success) { el.innerHTML = '<span class="small" style="color:var(--err)">' + h(r.message) + '</span>'; return; }
    const draw = (c) => { el.className = ''; el.innerHTML = body(c); bind(el, c, draw); };
    draw(r.data);
  }
  /** Modal dari tombol "Mode TV" di Dashboard */
  async function open() {
    const m = UI.modal({ title: icon('tv') + ' Dashboard TV (Open Access)', body: '<div class="skel" style="height:24px"></div>' });
    const r = await API.call('tv.config', {});
    if (!r.success) { m.close(); UI.showResult(r); return; }
    const draw = (c) => { m.body.innerHTML = '<p class="small t2" style="margin-top:0">Tampilan monitoring tanpa sidebar untuk TV/monitor di area receiving. Hanya lihat, diperbarui otomatis tiap 60 detik.</p>' + body(c); bind(m.body, c, draw); };
    draw(r.data);
  }
  return { open, card, linkOf };
})();

Pages.tv = {
  _timer: null, _clock: null,
  async render(token) {
    const { h, icon, num, pct } = UI;
    const q = new URLSearchParams((location.hash.split('?')[1]) || '');
    const per = ['month', 'quarter', 'year', 'last30', 'all'].indexOf(q.get('p')) > -1 ? q.get('p') : 'month';
    const LBL = { month: 'Bulan ini', quarter: 'Kuartal ini', year: 'Tahun ini', last30: '30 hari terakhir', all: 'Semua data' };
    if (q.get('tema') !== 'terang') document.documentElement.setAttribute('data-theme', 'dark');
    document.title = 'Dashboard TV — MRI';
    clearInterval(Pages.tv._timer); clearInterval(Pages.tv._clock);
    const app = document.getElementById('app');
    app.innerHTML = '<div class="tv" id="tv"><header class="tv-top"><div class="tv-brand"><div class="brand-mark">M</div><div><b id="tvApp">Dashboard MRI</b><span id="tvInst"></span></div></div>' +
      '<div class="tv-title">Receiving Inspection · <span>Live Monitor</span></div>' +
      '<div class="tv-right"><div class="tv-per">' + ['month', 'quarter', 'year', 'all'].map(p => '<a href="#/tv/' + encodeURIComponent(token) + '?p=' + p + '" class="' + (p === per ? 'on' : '') + '">' + LBL[p] + '</a>').join('') + '</div>' +
      '<div class="tv-clock"><b id="tvJam">--:--</b><span id="tvTgl"></span></div><button class="tv-btn" id="tvFs" title="Layar penuh" aria-label="Layar penuh">' + icon('maximize', 'lg') + '</button></div></header>' +
      '<main class="tv-body" id="tvBody"><div class="tv-loading"><div class="spinner"></div><span>Memuat data…</span></div></main>' +
      '<footer class="tv-foot"><span><span class="tv-dot"></span> Live · diperbarui otomatis tiap 60 detik · <span id="tvUpd">—</span></span><span>Periode: <b>' + h(LBL[per]) + '</b> · Tanpa data pribadi · Dashboard MRI v' + h(APP_CONFIG.VERSION) + '</span></footer></div>';
    const tick = () => {
      const d = new Date(Date.now() + 7 * 3600000);
      const jam = document.getElementById('tvJam'); if (!jam) { clearInterval(Pages.tv._clock); return; }
      jam.textContent = String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ':' + String(d.getUTCSeconds()).padStart(2, '0');
      document.getElementById('tvTgl').textContent = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + UI.BULAN[d.getUTCMonth()] + ' ' + d.getUTCFullYear() + ' · WIB';
    };
    tick(); Pages.tv._clock = setInterval(tick, 1000);
    document.getElementById('tvFs').onclick = () => { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); };
    const tile = (lbl, val, sub, tone, ico) => '<div class="tv-tile ' + (tone || '') + '"><div class="tv-tile-h"><span>' + lbl + '</span>' + icon(ico || 'info') + '</div><div class="tv-tile-v">' + val + '</div><div class="tv-tile-s">' + (sub || '') + '</div></div>';
    let gagal = 0;
    const load = async () => {
      const r = await API.call('tv.data', { token, period: per }, { silent: true, retries: 2 });
      const body = document.getElementById('tvBody'); if (!body) { clearInterval(Pages.tv._timer); return; }
      if (!r.success) {
        if (r.code === 'TV_INVALID') { clearInterval(Pages.tv._timer); body.innerHTML = '<div class="tv-error">' + icon('lock', 'lg') + '<b>Link Dashboard TV tidak valid</b><span>' + h(r.message) + '</span></div>'; return; }
        gagal++; document.getElementById('tvUpd').textContent = 'koneksi terputus — mencoba lagi (' + gagal + ')'; return;
      }
      gagal = 0; UI.destroyCharts();                                    // layar TV menyala berjam-jam: buang chart lama agar memori tidak terus naik
      const d = r.data, k = d.kpi, t = d.targets;
      document.getElementById('tvApp').textContent = d.app || 'Dashboard MRI';
      document.getElementById('tvInst').textContent = d.institusi || '';
      document.getElementById('tvUpd').textContent = 'terakhir ' + String(d.serverTime || '').substring(11, 16) + ' WIB';
      const fcol = (s) => ({ 'b-err': '#EF4444', 'b-warn': '#F59E0B', 'b-pend': '#94A3B8', 'b-info': '#3B82F6', 'b-closed': '#22C55E' }[UI.fdTone(s)] || '#A78BFA');
      body.innerHTML =
        '<section class="tv-kpis">' +
        tile('Item diterima', num(k.total), 'Hari ini: ' + num(k.today.received) + ' diterima · ' + num(k.today.inspected) + ' diinspeksi', '', 'archive') +
        tile('Inspected', num(k.inspected), pct(k.total ? k.inspected / k.total * 100 : 0) + ' dari item periode ini', 'ok', 'checkc') +
        tile('Awaiting Inspection', num(k.awaiting), 'Backlog total ' + num(k.backlog) + ' · ' + num(k.backlogOverTat) + ' > SLA · terlama ' + num(k.oldest) + ' hr', k.backlogOverTat ? 'warn' : '', 'clock') +
        tile('Revoke', num(k.revoke), 'Penerimaan dibatalkan (MvT 102)', 'err', 'x') +
        tile('Pass Rate', pct(k.passRate), '(Inspected + Revoke) ÷ total · target ' + pct(t.completion, 0), k.passRate >= t.completion ? 'ok' : 'warn', 'shield') +
        tile('Average TAT', num(k.avgTat, 1) + '<small> hari</small>', pct(k.withinSla) + ' ≤ SLA ' + num(t.tat) + ' hari', k.avgTat <= t.tat ? 'ok' : 'err', 'clock') +
        '</section>' +
        '<section class="tv-grid">' +
        '<div class="tv-card span2"><div class="tv-card-h"><b>Volume Inspected vs Awaiting Inspection · ' + h(d.year) + '</b><div class="tv-legend"><span><i style="background:#22C55E"></i>Inspected</span><span><i style="background:#F59E0B"></i>Awaiting</span><span><i style="background:#EF4444"></i>Revoke</span></div></div><div class="tv-chart"><canvas id="tvMon"></canvas></div></div>' +
        '<div class="tv-card tv-fcard"><div class="tv-card-h"><b>Finding (MRIR) per Status</b><span>' + num(k.findings) + ' periode ini</span></div><div class="tv-donut"><canvas id="tvFs2"></canvas><div class="tv-donut-c"><b>' + num(k.openAll) + '</b><span>open</span></div></div>' +
          '<div class="tv-legend tv-dleg">' + d.findingStatus.map(x => '<span><i style="background:' + fcol(x.status) + '"></i>' + h(x.status) + ' <b>' + num(x.n) + '</b></span>').join('') + '</div>' +
          '<div class="tv-mini"><div><b class="err">' + num(k.urgentAll) + '</b><span>open ≥ ' + t.agingKritis + ' hari</span></div><div><b>' + num(k.avgAgingOpen, 1) + '</b><span>avg aging (hr)</span></div><div><b class="ok">' + num(k.findingsClosed) + '</b><span>closed</span></div></div></div>' +
        '<div class="tv-card"><div class="tv-card-h"><b>Finding Open per PIC Unit</b><span>semua periode</span></div><div class="tv-bars">' +
          (d.picUnits.length ? d.picUnits.map(u => { const mx = Math.max(1, d.picUnits[0].open); return '<div class="tv-bar"><span class="nm">' + h(u.unit) + '</span><div class="tr"><i style="width:' + (u.open / mx * 100) + '%"></i>' + (u.urgent ? '<em style="width:' + (u.urgent / mx * 100) + '%"></em>' : '') + '</div><b>' + num(u.open) + '</b></div>'; }).join('') : '<div class="tv-empty">Tidak ada finding open 🎉</div>') + '</div><div class="tv-note"><i class="sw" style="background:#3B82F6"></i>open · <i class="sw" style="background:#EF4444"></i>≥ ' + t.agingKritis + ' hari</div></div>' +
        '<div class="tv-card"><div class="tv-card-h"><b>Type PO</b><span>' + h(LBL[per]) + '</span></div><div class="tv-chart sm"><canvas id="tvTp"></canvas></div></div>' +
        '<div class="tv-card"><div class="tv-card-h"><b>Backlog Awaiting per Vendor</b><span>terbanyak</span></div><table class="tv-tbl"><tbody>' +
          (d.backlogVendor.length ? d.backlogVendor.map(v => '<tr><td>' + h(v.vendor) + '</td><td class="r"><b>' + num(v.n) + '</b></td><td class="r ' + (v.oldest > t.tat ? 'err' : '') + '">' + num(v.oldest) + ' hr</td></tr>').join('') : '<tr><td class="tv-empty">Tidak ada backlog 🎉</td></tr>') +
          '</tbody></table>' + (d.subjects.length ? '<div class="tv-subj">' + d.subjects.map(s => '<span>' + h(s.subject) + ' <b>' + num(s.n) + '</b></span>').join('') + '</div>' : '') + '</div>' +
        '</section>';
      const grid = '#26334D', txt = '#CBD5E1', light = q.get('tema') === 'terang';
      const base = { scales: { x: { grid: { display: false }, ticks: { color: light ? undefined : txt, font: { size: 14 } } }, y: { grid: { color: light ? undefined : grid }, ticks: { color: light ? undefined : txt, font: { size: 13 } } } }, animation: { duration: 0 } };
      UI.chart(document.getElementById('tvMon'), { type: 'bar', data: { labels: d.monthly.map(x => x.label + (x.partial ? '*' : '')), datasets: [
        { label: 'Inspected', data: d.monthly.map(x => x.inspected), backgroundColor: '#22C55E', borderRadius: 4, maxBarThickness: 34 },
        { label: 'Awaiting Inspection', data: d.monthly.map(x => x.awaiting), backgroundColor: '#F59E0B', borderRadius: 4, maxBarThickness: 34 },
        { label: 'Revoke', data: d.monthly.map(x => x.revoke), backgroundColor: '#EF4444', borderRadius: 4, maxBarThickness: 34 }] }, options: base });
      UI.chart(document.getElementById('tvFs2'), { type: 'doughnut', data: { labels: d.findingStatus.map(x => x.status), datasets: [{ data: d.findingStatus.map(x => x.n), backgroundColor: d.findingStatus.map(x => fcol(x.status)), borderWidth: 0 }] },
        options: { cutout: '68%', animation: { duration: 0 }, plugins: { legend: { display: false } } } });
      UI.chart(document.getElementById('tvTp'), { type: 'bar', data: { labels: d.byTypePo.map(x => x.type), datasets: [
        { label: 'Inspected', data: d.byTypePo.map(x => x.inspected), backgroundColor: '#22C55E', stack: 's' },
        { label: 'Awaiting', data: d.byTypePo.map(x => x.awaiting), backgroundColor: '#F59E0B', stack: 's' },
        { label: 'Revoke', data: d.byTypePo.map(x => x.revoke), backgroundColor: '#EF4444', stack: 's' }] },
        options: Object.assign({ indexAxis: 'y' }, base, { plugins: { legend: { display: true, position: 'bottom', labels: { color: light ? undefined : txt, boxWidth: 12, font: { size: 13 } } } },
          scales: { x: { stacked: true, beginAtZero: true, grid: { color: light ? undefined : grid }, ticks: { color: light ? undefined : txt, font: { size: 13 }, callback: (v) => num(v) } },
                    y: { stacked: true, grid: { display: false }, ticks: { color: light ? undefined : txt, font: { size: 15, weight: '600' }, callback: function (v) { return this.getLabelForValue(v); } } } } }) });
    };
    await load();
    Pages.tv._timer = setInterval(load, 60000);
  }
};
