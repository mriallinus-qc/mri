/**
 * pages-dashboard.js — Executive KPI Overview (PRD §5.1)
 * v2.6: status mengikuti Excel (Inspected / Revoke / Awaiting Inspection), Top Inspector & produktivitas
 *       SEMUA inspector khusus Superadmin, tombol Mode TV (Superadmin)
 */
Pages.dashboard = {
  crumb: 'Overview', usesPeriod: true,
  prefetch: () => ({ action: 'getDashboard', data: { period: App.period.period, from: App.period.from, to: App.period.to } }),
  async render(el, r, ctx) {
    const { h, icon, num, pct, $ } = UI;
    const P = App.period, isSA = App.can(App.SAO);
    el.innerHTML =
      '<div class="ph"><div class="ph-title"><h1>Executive KPI Overview <span class="badge b-ok b-live">Live feed</span></h1>' +
      '<p>Analitik inspeksi, turnaround time (TAT), dan kesehatan operasional receiving — <b id="dRange">' + h(App.periodLabel()) + '</b>. <span class="muted small" id="dSync"></span></p></div>' +
      '<div class="ph-actions">' + (isSA ? '<button class="btn btn-outline" id="dTv">' + icon('tv') + 'Mode TV</button>' : '') +
      '<button class="btn btn-outline" id="dExport" data-busy="Menyiapkan…">' + icon('download') + 'Export Report</button>' +
      '<button class="btn btn-primary" id="dSyncBtn" data-busy="Menyinkronkan…">' + icon('refresh') + 'Sync Metrics</button></div></div>' +
      '<div class="grid g3 mb" id="dKpi">' + Array.from({ length: 6 }, () => '<div class="kpi"><div class="skel" style="width:50%"></div><div class="skel" style="height:34px;margin-top:14px;width:60%"></div><div class="skel" style="margin-top:14px"></div></div>').join('') + '</div>' +
      '<div class="grid g-7-5 mb">' +
      '<section class="card"><div class="card-h"><div><h2 class="sec-title">Monthly Finding Trend</h2><div class="sec-sub">Total finding (MRIR) vs finding yang sudah closed (12 bulan)</div></div>' +
      '<div class="legend"><span><i style="background:var(--s1)"></i>Total Findings</span><span><i style="background:var(--s2)"></i>Closed</span></div></div>' +
      '<div class="chart-box"><canvas id="cTrend" aria-label="Grafik tren finding bulanan" role="img"></canvas></div>' +
      '<div class="card-f"><span id="trendNote"></span><button class="link-btn small" id="trendTbl">Lihat sebagai tabel</button></div><div id="trendTable"></div></section>' +
      '<section class="card"><div class="card-h"><div><h2 class="sec-title">Inspection Status Distribution</h2><div class="sec-sub">Komposisi status item diterima pada periode ini (sesuai file Excel)</div></div></div>' +
      '<div class="donut-wrap"><div style="position:absolute;inset:0"><canvas id="cStatus" aria-label="Distribusi status inspeksi" role="img"></canvas></div><div class="donut-center"><div><b id="donutTotal">—</b><span class="xs muted" style="letter-spacing:.08em">TOTAL ITEM</span></div></div></div>' +
      '<div class="stat-tiles st3" id="statusTiles"></div></section></div>' +
      '<div class="grid ' + (isSA ? 'g2' : '') + '">' +
      (isSA ? '<section class="card flush"><div class="pad card-h" style="margin:0"><div><h2 class="sec-title">Produktivitas Inspector <span class="badge b-closed nc">Superadmin</span> <span class="badge b-pend nc" id="inspCnt"></span></h2><div class="sec-sub">Semua inspector — jumlah inspeksi selesai, rata-rata TAT & kepatuhan SLA</div></div><a href="#/inspeksi" class="small">Data Inspeksi ' + icon('chevr', 'sm') + '</a></div>' +
        '<div class="tbl-wrap" style="max-height:440px;overflow:auto"><table class="tbl sticky-h"><thead><tr><th>#</th><th>Inspector</th><th class="r">Inspeksi</th><th class="r">Revoke</th><th class="r">Avg TAT</th><th class="r">Finding</th><th class="r">Dalam SLA</th></tr></thead><tbody id="inspBody">' + UI.skelRows(5, 7) + '</tbody></table></div>' +
        '<div class="pad card-f" style="margin:0;border-top:1px solid var(--border)"><span id="inspNote"></span></div></section>' : '') +
      '<section class="card flush"><div class="pad card-h" style="margin:0"><div><h2 class="sec-title">Customer Performance Snapshot</h2><div class="sec-sub">Vendor/customer berdasarkan rata-rata TAT</div></div>' +
      '<div class="seg" id="custSeg"><button class="on" data-k="best">TAT tercepat</button><button data-k="worst">TAT terlama</button></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Customer / Vendor</th><th class="r">Item</th><th class="r">Finding</th><th class="r">Completion</th><th class="r">Avg TAT</th></tr></thead><tbody id="custBody">' + UI.skelRows(5, 5) + '</tbody></table></div>' +
      '<div class="pad card-f" style="margin:0;border-top:1px solid var(--border)"><span id="custNote"></span><a href="#/customer" class="small">Laporan per customer ' + icon('chevr', 'sm') + '</a></div></section></div>';

    let data = null, custKey = 'best';
    const params = { period: P.period, from: P.from, to: P.to };
    const AW = encodeURIComponent('Awaiting Inspection');
    const draw = (d) => {
      if (!ctx.isCurrent()) return;
      data = d; const k = d.kpi, t = d.targets, rc = k.received;
      $('#dSync').textContent = d.lastSync ? '· Sinkron terakhir ' + UI.ago(d.lastSync) : '';
      const bar = (v, cls = '') => '<div class="bar ' + cls + '"><i style="width:' + Math.max(0, Math.min(100, v || 0)) + '%"></i></div>';
      const ti = k.topInspector;
      const agingRatio = t.agingKritis ? Math.min(100, k.aging.avg / t.agingKritis * 100) : 0;
      const bl = k.backlog || { awaiting: rc.awaiting, overTat: 0, oldest: 0 };
      const kartu6 = isSA
        ? '<div class="kpi click" ' + (ti ? 'data-go="#/inspeksi?inspector=' + encodeURIComponent(ti.code || ti.name) + '"' : '') + '><div class="kpi-top"><span class="kpi-label">Top Inspector</span><span class="kpi-ico">' + icon('trophy') + '</span></div>' +
          (ti ? '<div class="who" style="margin-top:12px"><span class="avatar" style="width:44px;height:44px;font-size:15px">' + h(ti.initials) + '</span><div><div style="font-weight:700;font-size:17px">' + h(ti.name) + '</div><div class="small t2">' + num(ti.count) + ' item diinspeksi · avg TAT ' + num(ti.avgTat, 1) + ' hr</div></div></div>' + bar(ti.withinSla) +
            '<div class="kpi-foot"><span>' + pct(ti.withinSla) + ' dalam SLA · ' + num(ti.findings) + ' finding dicatat</span><span class="badge b-closed nc">Superadmin</span></div>' : '<div class="kpi-val muted" style="font-size:18px">Belum ada inspeksi</div>') + '</div>'
        : '<div class="kpi c-warn click" data-go="#/inspeksi?status=' + AW + '"><div class="kpi-top"><span class="kpi-label">Awaiting Inspection</span><span class="kpi-ico warn">' + icon('clock') + '</span></div>' +
          '<div class="kpi-row"><div class="kpi-val">' + num(bl.awaiting) + '<span class="unit">item</span></div>' + (bl.overTat ? '<span class="badge b-err nc">' + num(bl.overTat) + ' > SLA ' + num(t.tat) + ' hr</span>' : '<span class="badge b-ok nc">Dalam SLA</span>') + '</div>' + bar(rc.total ? bl.awaiting / rc.total * 100 : 0, 'warn') +
          '<div class="kpi-foot"><span>Terlama menunggu ' + num(bl.oldest) + ' hari</span></div></div>';
      $('#dKpi').innerHTML = [
        '<div class="kpi click" data-go="#/inspeksi"><div class="kpi-top"><span class="kpi-label">Total Item Received</span><span class="kpi-ico">' + icon('archive') + '</span></div>' +
          '<div class="kpi-row"><div class="kpi-val">' + num(rc.total) + '</div>' + UI.delta(rc.delta) + '</div>' + bar(k.completion.rate) +
          '<div class="kpi-foot"><span><b style="color:var(--ok)">' + num(rc.inspected) + '</b> inspected · <b style="color:var(--err)">' + num(rc.revoke) + '</b> revoke · <b style="color:var(--warn)">' + num(rc.awaiting) + '</b> awaiting</span><span class="muted">' + (rc.prevTotal !== null ? 'periode lalu ' + num(rc.prevTotal) : '') + '</span></div></div>',
        '<div class="kpi click" data-go="#/inspeksi?status=' + AW + '"><div class="kpi-top"><span class="kpi-label">Completion / Pass Rate</span><span class="kpi-ico">' + icon('checkc') + '</span></div>' +
          '<div class="kpi-row"><div class="kpi-val">' + pct(k.completion.rate) + '</div>' + UI.delta(k.completion.prevRate !== null ? k.completion.rate - k.completion.prevRate : null, { unit: ' pp', title: 'Selisih poin persen vs periode lalu' }) + '</div>' + bar(k.completion.rate, k.completion.rate >= t.completion ? 'ok' : '') +
          '<div class="kpi-foot"><span>(Inspected + Revoke) ÷ total · target ' + pct(t.completion, 0) + UI.tgtBtn('COMPLETION_TARGET', t.completion, 'Dashboard') + ' — ' + (k.completion.rate >= t.completion ? '<b style="color:var(--ok)">tercapai</b>' : '<b style="color:var(--err)">belum tercapai</b>') + '</span></div></div>',
        '<div class="kpi click" data-go="#/inspeksi?overTat=1"><div class="kpi-top"><span class="kpi-label">Average TAT</span><span class="kpi-ico">' + icon('clock') + '</span></div>' +
          '<div class="kpi-row"><div class="kpi-val">' + num(k.tat.avg, 1) + '<span class="unit">hari</span></div>' + UI.delta(k.tat.prev !== null ? k.tat.avg - k.tat.prev : null, { invert: true, unit: ' hr', d: 1, title: 'Selisih hari vs periode lalu (turun = lebih baik)' }) + '</div>' + bar(k.tat.withinSla, 's2') +
          '<div class="kpi-foot"><span>' + pct(k.tat.withinSla) + ' item selesai ≤ ' + num(t.tat) + ' hari (batas SLA' + UI.tgtBtn('TAT_TARGET_HARI', t.tat, 'Dashboard') + ')</span></div></div>',
        '<div class="kpi c-warn click" data-go="#/finding"><div class="kpi-top"><span class="kpi-label">Total Findings (MRIR)</span><span class="kpi-ico warn">' + icon('alert') + '</span></div>' +
          '<div class="kpi-row"><div class="kpi-val">' + num(k.findings.total) + '<span class="unit small">' + num(k.findings.open) + ' open</span> <span class="badge b-closed nc">' + num(k.findings.closed) + ' closed</span></div>' + UI.delta(k.findings.delta, { invert: true }) + '</div>' + bar(k.findings.resolution) +
          '<div class="kpi-foot"><span>' + pct(k.findings.resolution) + ' resolution efficiency</span></div></div>',
        '<div class="kpi c-err click" data-go="#/finding?tab=open&aging=crit"><div class="kpi-top"><span class="kpi-label">Avg Aging Quarantine</span><span class="kpi-ico err">' + icon('alertc') + '</span></div>' +
          '<div class="kpi-row"><div class="kpi-val">' + num(k.aging.avg, 1) + '<span class="unit">hari</span></div>' + (k.aging.critical ? '<span class="badge b-err nc" title="Finding yang belum closed dengan umur sejak Tanggal MRIR ≥ ' + t.agingKritis + ' hari">' + num(k.aging.critical) + ' open ≥ ' + t.agingKritis + ' hari</span>' : '<span class="badge b-ok nc">Aman</span>') + '</div>' + bar(agingRatio, 'warn') +
          '<div class="kpi-foot"><span>' + num(k.aging.open) + ' finding open · maks ' + num(k.aging.max) + ' hari' + (k.aging.maxRef ? ' (#' + h(k.aging.maxRef) + ')' : '') + '</span></div></div>',
        kartu6
      ].join('');
      UI.$$('#dKpi [data-go]').forEach(c => { c.tabIndex = 0; c.setAttribute('role', 'link'); const go = () => { location.hash = c.dataset.go; }; c.onclick = go; c.onkeydown = (e) => { if (e.key === 'Enter') go(); }; });

      // Trend
      const tr = d.findingTrend, S = UI.S();
      const peak = tr.reduce((m, x) => (x.total > (m ? m.total : -1) ? x : m), null);
      const resTot = tr.reduce((a, x) => a + x.total, 0), resCl = tr.reduce((a, x) => a + x.closed, 0);
      $('#trendNote').textContent = peak && peak.total ? 'Puncak: ' + UI.BULAN[+peak.month.substring(5) - 1] + ' ' + peak.month.substring(0, 4) + ' (' + num(peak.total) + ' finding) · resolusi 12 bln ' + pct(resTot ? resCl / resTot * 100 : 0) : 'Belum ada finding pada 12 bulan terakhir.';
      $('#trendTable').innerHTML = '';
      UI.chart($('#cTrend'), { type: 'line', data: { labels: tr.map(x => UI.BLN[+x.month.substring(5) - 1] + " '" + x.month.substring(2, 4)),
        datasets: [
          { label: 'Total Findings', data: tr.map(x => x.total), borderColor: S.s1, backgroundColor: S.s1, borderWidth: 2, tension: .35, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: UI.cssVar('--card'), pointBorderWidth: 2 },
          { label: 'Closed', data: tr.map(x => x.closed), borderColor: S.s2, backgroundColor: S.s2, borderWidth: 2, borderDash: [5, 4], tension: .35, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: UI.cssVar('--card'), pointBorderWidth: 2 }] },
        options: { scales: { y: { ticks: { precision: 0 } } } } });

      // Donut status (Inspected / Revoke / Awaiting Inspection)
      const st = d.statusDist, total = UI.MRI_ST.reduce((a, s) => a + (st[s] || 0), 0);
      $('#donutTotal').textContent = num(total);
      $('#statusTiles').innerHTML = UI.MRI_ST.map(s => '<div class="stat-tile" tabindex="0" role="link" data-st="' + h(s) + '"><div class="h"><span class="dot" style="background:' + UI.MRI_COLOR[s] + '"></span>' + h(s) + '</div><div class="v">' + pct(total ? (st[s] || 0) / total * 100 : 0) + '</div><div class="xs muted">' + num(st[s] || 0) + ' item</div></div>').join('');
      UI.$$('#statusTiles [data-st]').forEach(t2 => { t2.onclick = () => { location.hash = '#/inspeksi?status=' + encodeURIComponent(t2.dataset.st); }; t2.onkeydown = (e) => { if (e.key === 'Enter') t2.onclick(); }; });
      UI.chart($('#cStatus'), { type: 'doughnut', data: { labels: UI.MRI_ST, datasets: [{ data: UI.MRI_ST.map(s => st[s] || 0), backgroundColor: UI.MRI_ST.map(s => UI.MRI_COLOR[s]), hoverOffset: 6, spacing: 2 }] },
        options: { cutout: '72%', interaction: { mode: 'nearest', intersect: true }, plugins: { tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + num(c.parsed) + ' (' + pct(total ? c.parsed / total * 100 : 0) + ')' } } } } });

      // Inspector (Superadmin — semua inspector)
      if (isSA && $('#inspBody')) {
        const ins = d.topInspectors || [];
        const maxC = Math.max(1, ...ins.map(i => i.count));
        $('#inspCnt').textContent = num(ins.length) + ' inspector';
        $('#inspBody').innerHTML = ins.length ? ins.map((i, n) => '<tr class="click" data-insp="' + h(i.code || i.name) + '"><td class="muted num">' + (n + 1) + '</td><td><div class="who"><span class="mini-av">' + h(i.initials) + '</span><div style="min-width:120px"><b>' + h(i.name) + '</b><div class="bar thin"><i style="width:' + (i.count / maxC * 100) + '%"></i></div></div></div></td>' +
          '<td class="r num"><b>' + num(i.count) + '</b></td><td class="r num">' + num(i.revoke || 0) + '</td><td class="r num">' + num(i.avgTat, 1) + ' hr</td><td class="r num">' + num(i.findings) + '</td>' +
          '<td class="r"><span class="badge nc ' + (i.withinSla >= 90 ? 'b-ok' : i.withinSla >= 75 ? 'b-warn' : 'b-err') + '">' + pct(i.withinSla) + '</span></td></tr>').join('') :
          '<tr><td colspan="7">' + UI.empty('Belum ada inspeksi selesai pada periode ini.') + '</td></tr>';
        UI.$$('#inspBody [data-insp]').forEach(tr2 => tr2.onclick = () => { location.hash = '#/inspeksi?inspector=' + encodeURIComponent(tr2.dataset.insp); });
        $('#inspNote').textContent = 'Dihitung dari ' + num(d.totalInspections) + ' inspeksi selesai (Inspected + Revoke) pada periode ini. Nama dari kode inspector diatur di Master Data.';
      }
      drawCust();
    };
    const drawCust = () => {
      if (!data) return;
      const c = data.customers[custKey];
      $('#custBody').innerHTML = c.length ? c.map(v => '<tr class="click" data-v="' + h(v.vendor) + '"><td><span class="dot" style="background:' + (v.rate >= 95 ? '#16A34A' : v.rate >= 85 ? '#D97706' : '#DC2626') + ';margin-right:8px" title="Completion ' + pct(v.rate) + '"></span><b>' + h(v.vendor) + '</b></td>' +
        '<td class="r num">' + num(v.total) + '</td><td class="r num" style="color:' + (v.findings > 5 ? 'var(--err)' : v.findings ? 'var(--warn)' : 'inherit') + '">' + num(v.findings) + '</td>' +
        '<td class="r num"><b>' + pct(v.rate) + '</b></td><td class="r num">' + num(v.avgTat, 1) + ' hr</td></tr>').join('') : '<tr><td colspan="5">' + UI.empty('Belum ada data vendor.') + '</td></tr>';
      UI.$$('#custBody [data-v]').forEach(tr2 => tr2.onclick = () => { location.hash = '#/inspeksi?vendor=' + encodeURIComponent(tr2.dataset.v); });
      const w = data.customers.worst[0];
      $('#custNote').textContent = data.customers.count + ' vendor aktif' + (w && custKey === 'worst' ? ' · ' + w.vendor + ' perlu review CAPA' : '');
    };
    UI.$$('#custSeg button').forEach(b => b.onclick = () => { UI.$$('#custSeg button').forEach(x => x.classList.toggle('on', x === b)); custKey = b.dataset.k; drawCust(); });
    $('#trendTbl').onclick = () => {
      const box = $('#trendTable'); if (box.innerHTML) { box.innerHTML = ''; return; }
      box.innerHTML = '<div class="tbl-wrap" style="margin-top:12px"><table class="tbl dense"><thead><tr><th>Bulan</th><th class="r">Total</th><th class="r">Closed</th><th class="r">% Closed</th></tr></thead><tbody>' +
        data.findingTrend.map(x => '<tr><td>' + UI.BULAN[+x.month.substring(5) - 1] + ' ' + x.month.substring(0, 4) + '</td><td class="r num">' + num(x.total) + '</td><td class="r num">' + num(x.closed) + '</td><td class="r num">' + pct(x.total ? x.closed / x.total * 100 : 0) + '</td></tr>').join('') + '</tbody></table></div>';
    };
    $('#dExport').onclick = (e) => UI.doExport(e.currentTarget, 'dashboard', params);
    if (isSA) $('#dTv').onclick = () => (window.TvLink ? TvLink.open() : UI.toast('Modul TV belum dimuat.', 'error'));
    $('#dSyncBtn').onclick = (e) => UI.busy(e.currentTarget, async () => {
      API.invalidate(['getDashboard']);
      const res = await API.call('getDashboard', params);
      if (res.success) { draw(res.data); App.loadLookups(); UI.toast('Metrik diperbarui (' + (res.ms || 0) + ' ms).', 'info'); } else UI.showResult(res);
    });
    await API.swr('getDashboard', params, (d) => draw(d));
  }
};
