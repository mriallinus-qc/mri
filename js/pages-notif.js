/**
 * pages-notif.js — WhatsApp & Notifikasi (Blast · Antrean · Konfigurasi) + CRM Kontak
 */
Pages.notifikasi = {
  crumb: 'WhatsApp & Notifikasi', group: 'Settings',
  async render(el, r, ctx) {
    const { h, icon } = UI;
    const isSA = App.can(App.SAO);
    const tab = r.q.tab || (Pages.notifikasi._preset ? 'blast' : Pages.notifikasi._tab || 'blast');
    Pages.notifikasi._tab = tab;
    el.innerHTML = '<div class="ph"><div class="ph-title"><div class="eyebrow"><span>Settings module / Notifikasi</span></div><h1>WhatsApp & Notifikasi</h1>' +
      '<p>Notifikasi otomatis (finding baru, aging kritis, TAT, ringkasan harian) via WhatsApp Fonnte & Email, plus blast WhatsApp per batch yang aman dari banned.</p></div></div>' +
      '<div class="tabs mb" role="tablist">' + [['blast', '📣 Blast WhatsApp'], ['antrean', '📬 Antrean & Riwayat']].concat(isSA ? [['konfig', '⚙️ Konfigurasi']] : [])
        .map(t => '<button class="tab ' + (tab === t[0] ? 'on' : '') + '" data-t="' + t[0] + '" role="tab">' + t[1] + '</button>').join('') + '</div><div id="nBody"></div>';
    UI.$$('.tabs [data-t]', el).forEach(b => b.onclick = () => { location.hash = '#/notifikasi?tab=' + b.dataset.t; });
    const body = UI.$('#nBody');
    if (tab === 'antrean') return Pages.notifikasi.antrean(body, ctx);
    if (tab === 'konfig' && isSA) return Pages.notifikasi.konfig(body, ctx);
    return Pages.notifikasi.blast(body, ctx);
  },

  async blast(body, ctx) {
    const { h, icon, num, $ } = UI;
    const cfgRes = App.can(App.SAO) ? await API.call('notif.config', {}, { silent: true }) : null;
    const cfg = cfgRes && cfgRes.success ? cfgRes.data : null;
    const st = { rows: [], ringkas: null, pick: new Set(), onlyWA: false, batch: cfg ? cfg.batchDefault : 20, jeda: cfg ? cfg.jeda : '5', active: null, auto: false, timer: null, count: 0 };
    body.innerHTML =
      (cfg && !cfg.waAktif ? '<div class="notice warn">' + icon('alert') + '<div>WhatsApp belum aktif. Isi token Fonnte & nyalakan saklar di tab <a href="#/notifikasi?tab=konfig">Konfigurasi</a>.</div></div>' : '') +
      '<div class="grid g2 mb"><section class="card"><h2 class="sec-title" style="margin-bottom:14px">1. Pilih Sasaran</h2>' +
      '<div class="form-grid"><div class="field"><label>Sumber</label><select class="select" id="bSrc"><option value="">CRM — semua kontak</option><option value="Staf">CRM — Staf</option><option value="PIC Unit">CRM — PIC Unit</option><option value="Vendor">CRM — Vendor</option><option value="Lainnya">CRM — Lainnya</option><option value="manual">Tempel manual</option></select></div>' +
      '<div class="field"><label>Tag (opsional)</label><input class="input" id="bTag" list="bTags" placeholder="mis. Procurement"><datalist id="bTags"></datalist></div>' +
      '<div class="field span2 hidden" id="bManWrap"><label>Daftar nomor (satu per baris: 0812…|Nama)</label><textarea class="input" id="bMan" rows="4" placeholder="081234567890|Budi\n082111222333|Siti"></textarea></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="bLoad" data-busy="Memuat…">' + icon('users') + 'Muat Penerima</button><button class="btn btn-outline btn-sm" id="bDetect" data-busy="Mengecek…">' + icon('phone') + 'Deteksi Nomor WA</button></div>' +
      '<div id="bChips" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:14px"></div>' +
      '<label class="check small" style="margin-top:10px"><input type="checkbox" id="bOnlyWA"> Kirim hanya ke nomor yang terdeteksi WhatsApp</label>' +
      '<div class="tbl-wrap" style="max-height:320px;overflow:auto;margin-top:12px;border:1px solid var(--border);border-radius:8px"><table class="tbl dense"><thead><tr><th><input type="checkbox" id="bAll" checked aria-label="Pilih semua"></th><th>Nama</th><th>Nomor</th><th>Status WA</th></tr></thead><tbody id="bRows"><tr><td colspan="4">' + UI.empty('Klik "Muat Penerima".', 'users') + '</td></tr></tbody></table></div></section>' +
      '<section class="card"><h2 class="sec-title" style="margin-bottom:14px">2. Tulis Pesan</h2>' +
      '<div class="field" style="margin-bottom:10px"><label for="bJudul">Judul internal</label><input class="input" id="bJudul" placeholder="mis. Pengumuman jadwal audit vendor Q4"></div>' +
      '<div class="var-btns">' + ['nama', 'institusi', 'link'].map(v => '<button type="button" data-var="{' + v + '}">{' + v + '}</button>').join('') + '</div>' +
      '<textarea class="input" id="bPesan" rows="6" placeholder="Assalamu\'alaikum {nama}, …">Yth. {nama},\n\n\n— QC {institusi}</textarea>' +
      '<div class="lbl up" style="margin:12px 0 6px">Pratinjau (penerima pertama)</div><div class="wa-preview" id="bPrev"></div>' +
      '<h2 class="sec-title" style="margin:20px 0 10px">3. Ukuran Batch & Jeda</h2>' +
      '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><div class="seg" id="bBatch">' + [10, 20, 50].map(n => '<button data-n="' + n + '">' + n + '</button>').join('') + '</div>' +
      '<label class="small" style="display:flex;gap:6px;align-items:center">Jeda <input class="input" id="bJeda" style="width:80px;height:32px" value="' + h(st.jeda) + '"> detik</label></div>' +
      '<div class="small t2" id="bSum" style="margin:10px 0 14px"></div>' +
      '<button class="btn btn-primary btn-block btn-lg" id="bGo" data-busy="Membuat blast…">' + icon('send') + 'Mulai Blast</button>' +
      '<p class="xs muted" style="margin:10px 0 0">Tips anti-banned: gunakan nomor "hangat", mulai dari batch 10, jeda acak ≥ 5 detik (mis. 5-12), hindari link sama ke ratusan orang dalam 1 jam.</p></section></div>' +
      '<section class="card mb hidden" id="bProg"></section>' +
      '<section class="card flush"><div class="pad"><h2 class="sec-title">Riwayat Blast</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Judul</th><th>Sasaran</th><th>Batch · Jeda</th><th>Progres</th><th>Status</th><th class="r">Aksi</th></tr></thead><tbody id="bHist"></tbody></table></div></section>';
    const L = App.lookups || {};
    const vars = (row) => ({ nama: row ? row.nama : 'Bapak/Ibu', institusi: L.institusi || '', link: location.origin + location.pathname });
    const recips = () => st.rows.filter(x => x.valid && !x.ganda && !x.optOut && st.pick.has(x.id) && (!st.onlyWA || x.statusWA === 'Terdaftar'));
    const preview = () => { const f = recips()[0]; $('#bPrev').textContent = $('#bPesan').value.replace(/\{(\w+)\}/g, (m, k) => (vars(f)[k] !== undefined ? vars(f)[k] : m)); };
    const summary = () => {
      const n = recips().length, b = st.batch, j = String($('#bJeda').value || '5').split('-').map(Number), avgJ = j.length > 1 ? (j[0] + j[1]) / 2 : j[0];
      const batches = Math.ceil(n / b), mins = Math.max(batches, Math.ceil(n * (avgJ || 5) / 60));
      $('#bSum').innerHTML = '<b>' + num(n) + '</b> penerima → <b>' + num(batches) + '</b> batch · estimasi ±' + num(mins) + ' menit';
      $('#bGo').innerHTML = icon('send') + 'Mulai Blast (' + num(n) + ' nomor)';
      UI.$$('#bBatch button').forEach(x => x.classList.toggle('on', +x.dataset.n === b));
    };
    const drawRows = () => {
      const R = st.ringkas;
      $('#bChips').innerHTML = R ? [['Total', R.total], ['Valid', R.valid], ['Tidak valid', R.tidakValid], ['Ganda', R.ganda], ['✓ WA', R.terdaftarWA], ['Opt-out', R.optOut]].map(c => '<span class="chip">' + c[0] + ' <b>' + num(c[1]) + '</b></span>').join('') : '';
      $('#bRows').innerHTML = st.rows.length ? st.rows.slice(0, 1000).map(x => { const bad = !x.valid || x.ganda || x.optOut; return '<tr class="' + (bad ? 'dim' : '') + '"><td><input type="checkbox" data-id="' + h(x.id) + '" ' + (st.pick.has(x.id) && !bad ? 'checked' : '') + ' ' + (bad ? 'disabled' : '') + '></td><td>' + h(x.nama || '—') + (x.optOut ? ' <span class="badge b-err nc">opt-out</span>' : '') + '</td><td class="mono">' + h(x.hp || '—') + (x.ganda ? ' <span class="xs muted">ganda</span>' : '') + '</td><td>' + (x.valid ? UI.waBadge(x.statusWA) : '<span class="wa-badge tidak">nomor tidak valid</span>') + '</td></tr>'; }).join('') : '<tr><td colspan="4">' + UI.empty('Tidak ada kontak.') + '</td></tr>';
      summary(); preview();
    };
    const loadAud = async (btn, preset) => UI.busy(btn, async () => {
      const src = $('#bSrc').value;
      const p = src === 'manual' ? { sumber: 'manual', manual: $('#bMan').value } : { segmen: src, tag: $('#bTag').value.trim(), ids: preset || undefined };
      const res = await API.call('wa.audience', p); if (!res.success) { UI.showResult(res); return; }
      st.rows = res.data.rows; st.ringkas = res.data.ringkas; st.pick = new Set(st.rows.filter(x => x.valid && !x.ganda && !x.optOut).map(x => x.id));
      drawRows();
    });
    $('#bSrc').onchange = () => $('#bManWrap').classList.toggle('hidden', $('#bSrc').value !== 'manual');
    $('#bLoad').onclick = (e) => loadAud(e.currentTarget);
    $('#bRows').onchange = (e) => { const c = e.target.closest('[data-id]'); if (c) { c.checked ? st.pick.add(c.dataset.id) : st.pick.delete(c.dataset.id); summary(); preview(); } };
    $('#bAll').onchange = () => { st.pick = $('#bAll').checked ? new Set(st.rows.filter(x => x.valid && !x.ganda && !x.optOut).map(x => x.id)) : new Set(); drawRows(); };
    $('#bOnlyWA').onchange = () => { st.onlyWA = $('#bOnlyWA').checked; summary(); preview(); };
    $('#bDetect').onclick = (e) => UI.busy(e.currentTarget, async () => {
      const nums = Array.from(new Set(st.rows.filter(x => x.valid && !x.ganda).map(x => x.hp)));
      if (!nums.length) { UI.toast('Muat penerima dulu.', 'warn'); return; }
      for (let i = 0; i < nums.length; i += 50) {
        e.currentTarget.innerHTML = '<span class="spinner sm"></span> Mengecek ' + Math.min(i + 50, nums.length) + '/' + nums.length;
        const res = await API.call('wa.validate', { nomor: nums.slice(i, i + 50) });
        if (!res.success) { UI.showResult(res); break; }
        st.rows.forEach(x => { if (res.data.hasil[x.hp]) x.statusWA = res.data.hasil[x.hp]; });
      }
      st.ringkas.terdaftarWA = st.rows.filter(x => x.statusWA === 'Terdaftar').length; drawRows();
    });
    UI.$$('[data-var]').forEach(b => b.onclick = () => { const t = $('#bPesan'), p = t.selectionStart; t.value = t.value.slice(0, p) + b.dataset.var + t.value.slice(t.selectionEnd); t.focus(); preview(); });
    $('#bPesan').oninput = preview; $('#bJeda').oninput = summary;
    UI.$$('#bBatch button').forEach(b => b.onclick = () => { st.batch = +b.dataset.n; summary(); });
    $('#bGo').onclick = (e) => {
      const list = recips(); if (!list.length) { UI.toast('Belum ada penerima valid yang dipilih.', 'error'); return; }
      if (!$('#bJudul').value.trim()) { UI.toast('Isi judul internal blast.', 'error'); return; }
      UI.confirm({ title: 'Mulai blast?', message: 'Pesan akan dikirim ke <b>' + num(list.length) + '</b> nomor dalam ' + Math.ceil(list.length / st.batch) + ' batch (' + st.batch + ' per batch, jeda ' + h($('#bJeda').value) + ' dtk). Server tetap mengirim 1 batch/menit walau halaman ditutup.', okText: 'Mulai blast' }).then(ok => ok && UI.busy(e.currentTarget, async () => {
        const res = await API.call('wa.blastCreate', { judul: $('#bJudul').value.trim(), pesan: $('#bPesan').value, ukuranBatch: st.batch, jeda: $('#bJeda').value.trim(), sasaran: ($('#bSrc').selectedOptions[0] || {}).text + ($('#bTag').value ? ' · tag ' + $('#bTag').value : ''), penerima: list.map(x => ({ hp: x.hp, nama: x.nama })) });
        if (UI.showResult(res)) { monitor(res.data.blastId); hist(); }
      }));
    };
    const drawProg = (b) => {
      const box = $('#bProg'); if (!box || !b) return; box.classList.remove('hidden');
      const run = b.Status === 'Berjalan';
      box.innerHTML = '<div class="card-h"><div><h2 class="sec-title">' + icon('send') + h(b.Judul) + ' <span class="badge ' + (run ? 'b-info b-live' : b.Status === 'Selesai' ? 'b-ok' : 'b-pend') + '">' + h(b.Status) + '</span></h2><div class="sec-sub">' + h(b.BlastID) + ' · batch ' + b.UkuranBatch + ' · jeda ' + h(b.JedaDetik) + ' dtk</div></div></div>' +
        '<div class="bar ok" style="height:10px"><i style="width:' + b.persen + '%"></i></div><div class="kpi-foot"><span><b>' + num(b.Terkirim) + '</b> terkirim · <b style="color:var(--err)">' + num(b.Gagal) + '</b> gagal · <b>' + num(b.sisa) + '</b> sisa dari ' + num(b.Total) + '</span><span>' + b.persen + '%</span></div>' +
        (run ? '<div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="pNext" data-busy="Mengirim batch…">' + icon('play') + 'Kirim Batch Berikutnya Sekarang</button>' +
          '<label class="switch"><input type="checkbox" id="pAuto" ' + (st.auto ? 'checked' : '') + '><span class="tr"></span><span class="small">Otomatis <span id="pCd"></span></span></label>' +
          '<button class="btn btn-soft-danger btn-sm" id="pStop">' + icon('stop') + 'Hentikan</button></div><p class="xs muted" style="margin:10px 0 0">Server tetap mengirim 1 batch/menit walau halaman ditutup.</p>' : '');
      if (!run) { st.auto = false; clearInterval(st.timer); return; }
      $('#pNext').onclick = (e) => UI.busy(e.currentTarget, step);
      $('#pAuto').onchange = () => { st.auto = $('#pAuto').checked; tick(); };
      $('#pStop').onclick = async () => { if (!(await UI.confirm({ title: 'Hentikan blast?', danger: true, message: 'Pesan yang belum terkirim dibatalkan.', okText: 'Hentikan' }))) return; const rr = await API.call('wa.blastStop', { blastId: b.BlastID }); if (UI.showResult(rr)) { st.auto = false; hist(); monitor(b.BlastID); } };
    };
    const step = async () => { const res = await API.call('wa.blastProcess', { blastId: st.active }); if (res.success) { drawProg(res.data.blast); hist(); } else UI.showResult(res); };
    const tick = () => {
      clearInterval(st.timer); if (!st.auto) { const cd = $('#pCd'); if (cd) cd.textContent = ''; return; }
      const wait = Math.max(30, st.batch * (parseInt($('#bJeda').value, 10) || 5)); st.count = wait;
      st.timer = setInterval(async () => {
        if (!ctx.isCurrent()) { clearInterval(st.timer); return; }
        st.count--; const cd = $('#pCd'); if (cd) cd.textContent = '(' + st.count + ' dtk)';
        if (st.count <= 0) { clearInterval(st.timer); await step(); if (st.auto) tick(); }
      }, 1000);
    };
    const monitor = async (id) => { st.active = id; const res = await API.call('wa.blastList', {}, { silent: true }); if (res.success) drawProg(res.data.rows.find(b => b.BlastID === id)); };
    const hist = async () => {
      const res = await API.call('wa.blastList', {}, { silent: true }); if (!res.success || !ctx.isCurrent()) return;
      $('#bHist').innerHTML = res.data.rows.length ? res.data.rows.map(b => '<tr><td><b>' + h(b.Judul) + '</b><div class="xs muted">' + h(b.BlastID) + ' · ' + UI.dt(b.Tanggal) + ' · ' + h(b.DibuatOleh) + '</div></td><td class="small">' + h(b.Sasaran) + '</td><td class="small">' + b.UkuranBatch + ' · ' + h(b.JedaDetik) + ' dtk</td>' +
        '<td style="min-width:160px"><div class="bar ok thin"><i style="width:' + b.persen + '%"></i></div><div class="xs muted">' + num(b.Terkirim) + '/' + num(b.Total) + (b.Gagal ? ' · ' + b.Gagal + ' gagal' : '') + '</div></td>' +
        '<td><span class="badge ' + (b.Status === 'Berjalan' ? 'b-info' : b.Status === 'Selesai' ? 'b-ok' : 'b-pend') + '">' + h(b.Status) + '</span></td><td class="r"><button class="btn btn-ghost btn-xs" data-mon="' + h(b.BlastID) + '">Pantau</button></td></tr>').join('') : '<tr><td colspan="6">' + UI.empty('Belum ada blast.') + '</td></tr>';
      UI.$$('[data-mon]').forEach(x => x.onclick = () => { monitor(x.dataset.mon); window.scrollTo({ top: $('#bProg').offsetTop - 80, behavior: 'smooth' }); });
    };
    // tag datalist
    API.call('crm.list', { per: 1 }, { silent: true }).then(res => { if (res.success && ctx.isCurrent()) $('#bTags').innerHTML = Object.keys(res.data.facet.tags || {}).map(t => '<option value="' + h(t) + '">').join(''); });
    summary(); preview(); hist();
    const preset = Pages.notifikasi._preset; Pages.notifikasi._preset = null;
    if (preset && preset.ids) { await loadAud($('#bLoad'), preset.ids); UI.toast(preset.ids.length + ' kontak dari CRM dimuat.', 'info'); }
    const running = await API.call('wa.blastList', {}, { silent: true });
    if (running.success) { const b = running.data.rows.find(x => x.Status === 'Berjalan'); if (b) monitor(b.BlastID); }
  },

  async antrean(body, ctx) {
    const { h, icon, num, $ } = UI;
    const st = { status: '', kanal: '' };
    body.innerHTML = '<div class="grid g4 mb" id="qKpi"></div><div class="card flush"><div class="pad" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<select class="select" id="qSt" style="width:auto">' + UI.opts(['Antri', 'Terkirim', 'Gagal', 'Batal'], '', 'Semua status') + '</select><select class="select" id="qKn" style="width:auto">' + UI.opts(['WA', 'EMAIL'], '', 'Semua kanal') + '</select>' +
      '<span style="flex:1"></span><button class="btn btn-outline btn-sm" id="qProc" data-busy="Memproses…">' + icon('play') + 'Proses sekarang</button>' + (App.can(App.SAO) ? '<button class="btn btn-outline btn-sm" id="qRetry">' + icon('refresh') + 'Ulangi yang gagal</button>' : '') + '</div>' +
      '<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Waktu</th><th>Kanal</th><th>Tujuan</th><th>Event</th><th>Pesan</th><th>Status</th></tr></thead><tbody id="qBody">' + UI.skelRows(6, 6) + '</tbody></table></div></div>';
    const load = async () => {
      const res = await API.call('notif.queue', st); if (!ctx.isCurrent()) return; if (!res.success) throw res;
      const R = res.data.ringkas;
      $('#qKpi').innerHTML = [['Menunggu', R.Antri, 'clock', ''], ['Terkirim', R.Terkirim, 'checkc', 'ok'], ['Gagal', R.Gagal, 'alertc', 'err'], ['Dibatalkan', R.Batal, 'x', 'warn']].map(k => '<div class="kpi plain compact"><div class="kpi-top"><span class="kpi-label">' + k[0] + '</span><span class="kpi-ico ' + k[3] + '">' + icon(k[2]) + '</span></div><div class="kpi-val">' + num(k[1] || 0) + '</div><div class="kpi-foot"><span>3.000 antrean terakhir</span></div></div>').join('');
      $('#qBody').innerHTML = res.data.rows.length ? res.data.rows.map(x => '<tr><td class="nw small">' + UI.dt(x.DikirimPada || x.DibuatPada) + '</td><td><span class="badge ' + (x.Kanal === 'WA' ? 'b-ok' : 'b-info') + '">' + h(x.Kanal) + '</span></td><td class="mono small">' + h(x.Tujuan) + '<div class="xs muted">' + h(x.NamaPenerima) + '</div></td>' +
        '<td class="small">' + h(x.Event) + (x.BlastID ? '<div class="xs muted">' + h(x.BlastID) + '</div>' : '') + '</td><td class="small" style="max-width:360px">' + (x.Subjek ? '<b>' + h(x.Subjek) + '</b><br>' : '') + h(x.Pesan) + '</td>' +
        '<td><span class="badge ' + ({ Terkirim: 'b-ok', Gagal: 'b-err', Antri: 'b-pend', Batal: 'b-warn' }[x.Status] || 'b-pend') + '">' + h(x.Status) + '</span>' + (x.Respon && x.Status !== 'Terkirim' ? '<div class="xs muted">' + h(x.Respon) + '</div>' : '') + '</td></tr>').join('') : '<tr><td colspan="6">' + UI.empty('Antrean kosong.') + '</td></tr>';
    };
    $('#qSt').onchange = () => { st.status = $('#qSt').value; load(); }; $('#qKn').onchange = () => { st.kanal = $('#qKn').value; load(); };
    $('#qProc').onclick = (e) => UI.busy(e.currentTarget, async () => { const rr = await API.call('notif.processNow', {}); if (rr.success) { UI.toast('Diproses: ' + (rr.data.terkirim || 0) + ' terkirim' + (rr.data.info ? ' (' + rr.data.info + ')' : '') + '.', 'info'); load(); } else UI.showResult(rr); });
    if (App.can(App.SAO)) $('#qRetry').onclick = async () => { const rr = await API.call('notif.retry', {}); if (UI.showResult(rr)) load(); };
    await load();
  },

  async konfig(body, ctx) {
    const { h, icon, num, $ } = UI;
    const res = await API.call('notif.config', {}); if (!ctx.isCurrent()) return; if (!res.success) throw res;
    const c = res.data, M = JSON.parse(JSON.stringify(c.matriks));
    body.innerHTML = '<div class="grid g2 mb">' +
      '<section class="card"><div class="card-h"><h2 class="sec-title">' + icon('message') + 'WhatsApp (Fonnte)</h2><label class="switch"><input type="checkbox" id="kWa" ' + (c.waAktif ? 'checked' : '') + '><span class="tr"></span><b id="kWaL">' + (c.waAktif ? 'AKTIF' : 'NONAKTIF') + '</b></label></div>' +
      '<div class="field" style="margin-bottom:12px"><label>Token Fonnte</label><input class="input" type="password" id="kTok" placeholder="' + h(c.tokenMask || 'Belum diisi — tempel token dari fonnte.com') + '" autocomplete="off"><span class="hint">Disimpan di Script Properties; tidak pernah dikirim ke browser.</span></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn btn-outline btn-sm" id="kDev" data-busy="Mengecek…">' + icon('zap') + 'Cek Perangkat</button><input class="input" id="kTestNo" placeholder="0812… untuk tes" style="width:170px;height:32px"><button class="btn btn-outline btn-sm" id="kTestWa" data-busy="Mengirim…">' + icon('send') + 'Kirim Tes WA</button></div><div id="kDevInfo"></div>' +
      '<div class="form-grid"><div class="field"><label>Batch default blast</label><select class="select" id="kBatch">' + UI.opts([10, 20, 50], c.batchDefault) + '</select></div><div class="field"><label>Jeda antarpesan (detik)</label><input class="input" id="kJeda" value="' + h(c.jeda) + '"><span class="hint">Angka (5) atau rentang acak (3-8)</span></div>' +
      '<label class="switch span2"><input type="checkbox" id="kDet" ' + (c.deteksiOtomatis ? 'checked' : '') + '><span class="tr"></span><span class="small">Deteksi otomatis nomor kontak baru (tiap ±10 menit, 50 nomor)</span></label></div></section>' +
      '<section class="card"><div class="card-h"><h2 class="sec-title">' + icon('mail') + 'Email (Gmail)</h2><label class="switch"><input type="checkbox" id="kEm" ' + (c.emailAktif ? 'checked' : '') + '><span class="tr"></span><b>' + (c.emailAktif ? 'AKTIF' : 'NONAKTIF') + '</b></label></div>' +
      '<div class="kv-grid" style="margin-bottom:12px"><div class="kv-box"><div class="k">Sisa kuota email hari ini</div><div class="v">' + (c.kuotaEmail === null ? '—' : num(c.kuotaEmail)) + '</div></div><div class="kv-box"><div class="k">Trigger antrean (1 menit)</div><div class="v">' + (c.trigger ? '<span style="color:var(--ok)">● Aktif</span>' : '<span style="color:var(--err)">● Belum terpasang</span>') + '</div></div></div>' +
      '<div class="form-grid"><div class="field"><label>Nama pengirim</label><input class="input" id="kNama" value="' + h(c.namaPengirim) + '"></div><div class="field"><label>Jam kirim notifikasi harian (WIB)</label><input class="input" type="number" min="0" max="23" id="kJam" value="' + c.jamHarian + '"></div>' +
      '<div class="field span2"><label>URL app (untuk {link})</label><input class="input" id="kUrl" value="' + h(c.appUrl) + '" placeholder="https://username.github.io/dashboard-mri/"></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><input class="input" id="kTestEm" placeholder="email untuk tes" style="width:220px;height:32px"><button class="btn btn-outline btn-sm" id="kTestEmail" data-busy="Mengirim…">' + icon('send') + 'Kirim Tes Email</button></div></section></div>' +
      '<section class="card flush mb"><div class="pad card-h" style="margin:0"><div><h2 class="sec-title">Matriks Notifikasi Otomatis</h2><div class="sec-sub">Pilih event mana yang dikirim lewat WA dan/atau Email. Saklar utama kanal harus aktif.</div></div></div>' +
      '<div class="tbl-wrap"><table class="tbl matrix"><thead><tr><th>Event</th><th>Penerima</th><th class="c">WhatsApp</th><th class="c">Email</th><th class="r">Template</th></tr></thead><tbody id="kMx"></tbody></table></div></section>' +
      '<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary btn-lg" id="kSave" data-busy="Menyimpan…">' + icon('check') + 'Simpan Konfigurasi</button></div>';
    const drawMx = () => {
      const wa = $('#kWa').checked, em = $('#kEm').checked;
      $('#kMx').innerHTML = Object.keys(M).map(k => { const m = M[k]; return '<tr data-k="' + k + '"><td><b>' + h(m.label) + '</b><div class="xs muted mono">' + k + '</div></td><td class="small t2" style="max-width:280px">' + h(m.penerima) + '</td>' +
        '<td class="c"><label class="switch"><input type="checkbox" data-ch="wa" ' + (m.wa ? 'checked' : '') + ' ' + (wa ? '' : 'disabled') + ' aria-label="WA ' + h(m.label) + '"><span class="tr"></span></label></td>' +
        '<td class="c"><label class="switch"><input type="checkbox" data-ch="email" ' + (m.email ? 'checked' : '') + ' ' + (em ? '' : 'disabled') + ' aria-label="Email ' + h(m.label) + '"><span class="tr"></span></label></td>' +
        '<td class="r"><button class="btn btn-ghost btn-xs" data-ed>' + icon('edit', 'sm') + 'Ubah</button></td></tr>' +
        '<tr class="hidden" data-edrow="' + k + '"><td colspan="5" style="background:var(--bg)"><div class="grid g2"><div><div class="field" style="margin-bottom:8px"><label>Subjek email</label><input class="input" data-f="subjek" value="' + h(m.subjek) + '"></div>' +
        '<div class="field"><label>Isi pesan</label><textarea class="input" data-f="pesan" rows="7">' + h(m.pesan) + '</textarea></div><div class="var-btns">' + ['nama', 'institusi', 'link'].concat(m.vars || []).map(v => '<button type="button" data-v="{' + v + '}">{' + v + '}</button>').join('') + '</div>' +
        '<button class="link-btn small" data-def>↺ Kembalikan bawaan</button></div><div><div class="lbl up" style="margin-bottom:6px">Pratinjau</div><div class="wa-preview" data-prev></div></div></div></td></tr>'; }).join('');
      UI.$$('#kMx tr[data-k]').forEach(tr => {
        const k = tr.dataset.k, ed = $('[data-edrow="' + k + '"]');
        UI.$$('[data-ch]', tr).forEach(cb => cb.onchange = () => { M[k][cb.dataset.ch] = cb.checked; });
        const prev = () => { $('[data-prev]', ed).textContent = $('[data-f=pesan]', ed).value.replace(/\{(\w+)\}/g, (m0, v) => '[' + v + ']'); };
        $('[data-ed]', tr).onclick = () => { ed.classList.toggle('hidden'); prev(); };
        UI.$$('[data-f]', ed).forEach(i => i.oninput = () => { M[k][i.dataset.f] = i.value; prev(); });
        UI.$$('[data-v]', ed).forEach(b => b.onclick = () => { const t = $('[data-f=pesan]', ed), p = t.selectionStart; t.value = t.value.slice(0, p) + b.dataset.v + t.value.slice(t.selectionEnd); M[k].pesan = t.value; prev(); });
        $('[data-def]', ed).onclick = () => { M[k].pesan = M[k].pesanDefault; M[k].subjek = M[k].subjekDefault; $('[data-f=pesan]', ed).value = M[k].pesan; $('[data-f=subjek]', ed).value = M[k].subjek; prev(); };
      });
    };
    drawMx();
    $('#kWa').onchange = () => { $('#kWaL').textContent = $('#kWa').checked ? 'AKTIF' : 'NONAKTIF'; drawMx(); }; $('#kEm').onchange = drawMx;
    $('#kDev').onclick = (e) => UI.busy(e.currentTarget, async () => { const rr = await API.call('wa.device', {}); $('#kDevInfo').innerHTML = rr.success ? '<div class="notice">' + icon('phone') + '<div>Perangkat <b>' + h(rr.data.device) + '</b> · status <b style="color:' + (rr.data.status === 'connect' ? 'var(--ok)' : 'var(--err)') + '">' + h(rr.data.status) + '</b> · paket ' + h(rr.data.paket) + ' · kuota ' + h(rr.data.kuota) + '</div></div>' : '<div class="notice err">' + icon('alertc') + '<div>' + h(rr.message) + ' (simpan token dulu bila baru diisi)</div></div>'; });
    $('#kTestWa').onclick = (e) => UI.busy(e.currentTarget, async () => UI.showResult(await API.call('wa.test', { nomor: $('#kTestNo').value })));
    $('#kTestEmail').onclick = (e) => UI.busy(e.currentTarget, async () => UI.showResult(await API.call('email.test', { email: $('#kTestEm').value })));
    $('#kSave').onclick = (e) => UI.busy(e.currentTarget, async () => {
      const rr = await API.call('notif.configSave', { waAktif: $('#kWa').checked, emailAktif: $('#kEm').checked, token: $('#kTok').value.trim(), batchDefault: +$('#kBatch').value, jeda: $('#kJeda').value.trim(),
        deteksiOtomatis: $('#kDet').checked, namaPengirim: $('#kNama').value.trim(), appUrl: $('#kUrl').value.trim(), jamHarian: +$('#kJam').value, matriks: M });
      if (UI.showResult(rr)) App.go();
    });
  }
};

// ============================================================================
Pages.crm = {
  crumb: 'CRM Kontak', group: 'Settings',
  async render(el, r, ctx) {
    const { h, icon, num, $ } = UI;
    const st = { cari: '', segmen: '', tag: '', statusWA: '', emailValid: '', optOut: '', duplikat: '', masalah: '', halaman: 1, per: 50, sort: 'Nama', dir: 'asc' };
    const sel = new Set();
    let stats = null;
    el.innerHTML = '<div class="ph"><div class="ph-title"><div class="eyebrow"><span>Settings module / CRM</span></div><h1>CRM Kontak</h1><p>Satu daftar kontak Nama · Email · WhatsApp — staf (otomatis dari Users), PIC Unit, dan vendor — untuk notifikasi finding & blast.</p></div>' +
      '<div class="ph-actions"><button class="btn btn-outline" id="kSync" data-busy="Sinkron…">' + icon('refresh') + 'Sinkron Sekarang</button><button class="btn btn-outline" id="kDup">' + icon('merge') + 'Periksa Duplikat</button>' +
      '<button class="btn btn-outline" id="kImp">' + icon('upload') + 'Import CSV/Excel</button><button class="btn btn-primary" id="kAdd">' + icon('plus') + 'Tambah Kontak</button></div></div>' +
      '<div class="grid mb" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))" id="kKpi"></div>' +
      '<div class="card pad-s mb"><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px" id="kSeg"></div><div class="filterbar">' +
      '<div class="grow input-icon">' + icon('search') + '<input class="input soft" id="kq" placeholder="Cari nama, email, nomor, tag…"></div>' +
      '<select class="select soft" id="kWaF">' + UI.opts([{ value: 'Terdaftar', label: '✓ Terdaftar WA' }, { value: 'Tidak Terdaftar', label: '✕ Bukan WA' }, { value: 'belum', label: '? Belum dicek' }], '', 'Status WA: semua') + '</select>' +
      '<select class="select soft" id="kEmF">' + UI.opts([{ value: 'YA', label: 'Email valid' }, { value: 'TIDAK', label: 'Email tidak valid' }], '', 'Email: semua') + '</select>' +
      '<select class="select soft" id="kOpF">' + UI.opts([{ value: 'YA', label: 'Opt-out' }, { value: 'TIDAK', label: 'Tidak opt-out' }], '', 'Opt-out: semua') + '</select>' +
      '<input class="input soft" id="kTagF" list="kTags" placeholder="Tag…" style="max-width:160px"><datalist id="kTags"></datalist></div></div>' +
      '<div class="card flush"><div id="kBulk"></div><div class="tbl-wrap"><table class="tbl"><thead id="kHead"></thead><tbody id="kBody">' + UI.skelRows(8, 8) + '</tbody></table></div><div id="kPager"></div></div>';
    const loadStats = async () => { const res = await API.call('crm.stats', {}, { silent: true }); if (!res.success || !ctx.isCurrent()) return; stats = res.data; const s = stats;
      $('#kKpi').innerHTML = [['Total Kontak', s.total, '', 'contact', ''], ['WA Terverifikasi', s.terdaftarWA, 'statusWA=Terdaftar', 'checkc', 'ok'], ['Email Valid', s.emailValid, 'emailValid=YA', 'mail', ''], ['Belum Dicek WA', s.belumCekWA, 'statusWA=belum', 'phone', 'warn'], ['Opt-out', s.optOut, 'optOut=YA', 'x', 'err'], ['Duplikat', s.duplikat, 'duplikat=1', 'merge', 'warn'], ['Tak bisa dihubungi', s.tidakBisa, 'masalah=1', 'alertc', 'err']]
        .map(k => '<div class="kpi plain compact click" data-f="' + k[2] + '"><div class="kpi-top"><span class="kpi-label" style="font-size:11px">' + k[0] + '</span><span class="kpi-ico ' + k[4] + '" style="width:30px;height:30px">' + icon(k[3], 'sm') + '</span></div><div class="kpi-val" style="font-size:26px">' + num(k[1]) + '</div></div>').join('');
      UI.$$('#kKpi [data-f]').forEach(c => c.onclick = () => { Object.assign(st, { statusWA: '', emailValid: '', optOut: '', duplikat: '', masalah: '', halaman: 1 }); if (c.dataset.f) { const [a, b] = c.dataset.f.split('='); st[a] = b; } ['#kWaF', '#kEmF', '#kOpF'].forEach(x => $(x).value = ''); if (st.statusWA) $('#kWaF').value = st.statusWA; if (st.emailValid) $('#kEmF').value = st.emailValid; if (st.optOut) $('#kOpF').value = st.optOut; load(); });
    };
    const bulkBar = () => {
      $('#kBulk').innerHTML = sel.size ? '<div class="bulkbar"><b>' + sel.size + ' kontak dipilih</b><button class="btn btn-soft btn-xs" data-b="deteksiWA">' + icon('phone', 'sm') + 'Deteksi WA</button><button class="btn btn-soft btn-xs" data-b="tag">' + icon('tag', 'sm') + 'Beri Tag</button>' +
        '<button class="btn btn-soft btn-xs" data-b="blast">' + icon('send', 'sm') + 'Blast ke terpilih</button><button class="btn btn-soft-danger btn-xs" data-b="optout">Opt-out</button><button class="btn btn-ghost btn-xs" data-b="optin">Opt-in</button>' +
        '<button class="btn btn-ghost btn-xs" data-b="hapusManual">' + icon('trash', 'sm') + 'Hapus (manual)</button>' + (App.can(App.SAO) ? '<button class="btn btn-ghost btn-xs" data-b="export">' + icon('download', 'sm') + 'Ekspor</button>' : '') + '<button class="btn btn-ghost btn-xs" data-b="clear">Batal</button></div>' : '';
      UI.$$('#kBulk [data-b]').forEach(b => b.onclick = async () => {
        const a = b.dataset.b, ids = Array.from(sel);
        if (a === 'clear') { sel.clear(); load(); return; }
        if (a === 'blast') { Pages.notifikasi._preset = { ids }; location.hash = '#/notifikasi?tab=blast'; return; }
        if (a === 'export') return UI.doExport(b, null, st, 'crm.export');
        let nilai = '';
        if (a === 'tag') { nilai = await UI.confirm({ title: 'Beri tag', input: true, inputLabel: 'Nama tag', placeholder: 'mis. Procurement / PT Sinar Kabel', message: 'Tag dipakai untuk menentukan penerima notifikasi (nama PIC Unit / nama vendor).' }); if (!nilai) return; }
        if (a === 'hapusManual' && !(await UI.confirm({ title: 'Hapus kontak manual?', danger: true, message: 'Hanya kontak bersumber manual yang dihapus. Kontak staf dikelola di User Management.', okText: 'Hapus' }))) return;
        await UI.busy(b, async () => { const rr = await API.call('crm.bulk', { ids, aksi: a, nilai }); if (UI.showResult(rr)) { if (a !== 'deteksiWA') sel.clear(); load(); loadStats(); } });
      });
    };
    const draw = (d) => {
      if (!ctx.isCurrent()) return;
      const segs = d.facet.segmen;
      $('#kSeg').innerHTML = '<span class="chip ' + (!st.segmen ? 'on' : '') + '" data-s="">Semua <b>' + num(Object.values(segs).reduce((a, b) => a + b, 0)) + '</b></span>' + Object.keys(segs).map(s => '<span class="chip ' + (st.segmen === s ? 'on' : '') + '" data-s="' + h(s) + '">' + h(s) + ' <b>' + num(segs[s]) + '</b></span>').join('');
      UI.$$('#kSeg [data-s]').forEach(c => c.onclick = () => { st.segmen = c.dataset.s; st.halaman = 1; load(); });
      $('#kTags').innerHTML = Object.keys(d.facet.tags).map(t => '<option value="' + h(t) + '">').join('');
      $('#kHead').innerHTML = '<tr><th style="width:36px"><input type="checkbox" id="kAll" aria-label="Pilih semua"></th>' + UI.thSort('Nama', 'Nama', st) + UI.thSort('Email', 'Email', st) + '<th>WhatsApp</th><th>Tag</th>' + UI.thSort('Terakhir dihubungi', 'TerakhirDihubungi', st) + UI.thSort('Pesan', 'JumlahPesan', st, 'r') + '<th class="r">Aksi</th></tr>';
      UI.bindSort($('#kHead'), st, load);
      $('#kAll').onchange = () => { d.rows.forEach(k => $('#kAll').checked ? sel.add(k.KontakID) : sel.delete(k.KontakID)); draw(d); };
      $('#kBody').innerHTML = d.rows.length ? d.rows.map(k => '<tr class="' + (sel.has(k.KontakID) ? 'sel ' : '') + (!k.bisaDihubungi || k.duplikat ? 'row-warn' : '') + '" data-k="' + h(k.KontakID) + '"><td><input type="checkbox" data-s ' + (sel.has(k.KontakID) ? 'checked' : '') + '></td>' +
        '<td><div class="who"><span class="mini-av">' + h(UI.initials(k.Nama)) + '</span><div class="cell-2"><b>' + h(k.Nama) + '</b>' + (String(k.OptOut) === 'YA' ? ' <span class="badge b-err nc">opt-out</span>' : '') + '<div class="s"><span class="badge b-pend nc" style="height:18px">' + h(k.Segmen) + '</span>' + (k.duplikat ? ' <span class="xs" style="color:var(--warn)">duplikat</span>' : '') + '</div></div></div></td>' +
        '<td class="small">' + (k.Email ? h(k.Email) + ' ' + (k.EmailValid === 'YA' ? '<span style="color:var(--ok)">✓</span>' : '<span style="color:var(--warn)">⚠</span>') : '<span class="muted">—</span>') + '</td>' +
        '<td class="nw">' + (k.NoWA ? '<span class="mono small">' + h(k.NoWA) + '</span> ' + UI.waBadge(k.StatusWA) + (k.waValid ? ' <a href="https://wa.me/' + h(k.NoWA.replace(/^0/, '62')) + '" target="_blank" rel="noopener" aria-label="Chat WhatsApp">' + icon('message', 'sm') + '</a>' : '') : '<span class="muted">—</span>') + '</td>' +
        '<td class="small">' + String(k.Tag || '').split(',').filter(t => t.trim()).map(t => '<span class="badge b-info nc" style="margin:1px">' + h(t.trim()) + '</span>').join('') + '</td>' +
        '<td class="small nw">' + (k.TerakhirDihubungi ? UI.ago(k.TerakhirDihubungi) : '<span class="muted">—</span>') + '</td><td class="r num">' + num(k.JumlahPesan || 0) + '</td>' +
        '<td class="r"><button class="btn btn-ghost btn-xs" data-d>Detail</button></td></tr>').join('') : '<tr><td colspan="8">' + UI.empty('Tidak ada kontak. Klik "Sinkron Sekarang" untuk menarik staf dari User Management, atau tambah kontak PIC Unit/Vendor.', 'contact') + '</td></tr>';
      $('#kBody').onclick = (e) => { const tr = e.target.closest('[data-k]'); if (!tr) return; const id = tr.dataset.k;
        if (e.target.closest('[data-s]')) { e.target.checked ? sel.add(id) : sel.delete(id); tr.classList.toggle('sel', e.target.checked); bulkBar(); return; }
        if (e.target.closest('a')) return; openDetail(id); };
      const pg = $('#kPager'); pg.innerHTML = ''; pg.appendChild(UI.pager({ page: d.halaman, pages: d.pages, total: d.total, per: d.per }, (p, per) => { st.halaman = p; st.per = per; load(); }, { perOptions: [25, 50, 100], noun: 'kontak' }));
      bulkBar();
    };
    const load = async () => { const res = await API.call('crm.list', st); if (!ctx.isCurrent()) return; if (!res.success) throw res; draw(res.data); };
    const kForm = (k, onDone) => {
      const v = k || { Segmen: 'PIC Unit', OptOut: 'TIDAK' }, locked = k && k.Sumber === 'staf';
      const sug = (stats && stats.saran) || { picUnits: [], vendors: [] };
      const m = UI.modal({ title: k ? 'Edit kontak' : 'Tambah kontak', body:
        (locked ? '<div class="notice" style="margin-top:0">' + icon('info') + '<div>Kontak staf tersinkron dari User Management; perubahan nama/email/WA ditulis balik ke data user.</div></div>' : '') +
        '<div class="form-grid"><div class="field"><label>Nama <span class="req">*</span></label><input class="input" id="ckN" value="' + h(v.Nama || '') + '"></div>' +
        '<div class="field"><label>Segmen</label><select class="select" id="ckS" ' + (locked ? 'disabled' : '') + '>' + UI.opts((stats && stats.segmenList) || ['Staf', 'PIC Unit', 'Vendor', 'Lainnya'], v.Segmen) + '</select></div>' +
        '<div class="field"><label>No. WhatsApp</label><input class="input" id="ckW" value="' + h(v.NoWA || '') + '" placeholder="0812…"></div><div class="field"><label>Email</label><input class="input" id="ckE" type="email" value="' + h(v.Email || '') + '"></div>' +
        '<div class="field span2"><label>Tag (pisahkan koma)</label><input class="input" id="ckT" list="ckTl" value="' + h(v.Tag || '') + '" placeholder="nama PIC Unit atau nama vendor persis"><datalist id="ckTl">' + sug.picUnits.concat(sug.vendors).map(x => '<option value="' + h(x) + '">').join('') + '</datalist>' +
        '<span class="hint">Notifikasi finding dikirim ke kontak segmen <b>PIC Unit</b> ber-tag nama unit, dan segmen <b>Vendor</b> ber-tag nama vendor.</span></div>' +
        '<div class="field span2"><label>Catatan</label><textarea class="input" id="ckC" rows="2">' + h(v.Catatan || '') + '</textarea></div>' +
        '<label class="switch span2"><input type="checkbox" id="ckO" ' + (String(v.OptOut) === 'YA' ? 'checked' : '') + '><span class="tr"></span><span class="small">Opt-out dari blast (notifikasi transaksional tetap dikirim)</span></label></div>',
        footer: '<button class="btn btn-ghost" data-c>Batal</button><button class="btn btn-primary" id="ckSave" data-busy="Menyimpan…">Simpan</button>' });
      m.el.querySelector('[data-c]').onclick = m.close;
      UI.$('#ckSave').onclick = () => UI.busy(UI.$('#ckSave'), async () => {
        const rr = await API.call('crm.save', { kontak: { KontakID: k ? k.KontakID : '', Nama: UI.$('#ckN').value, Segmen: UI.$('#ckS').value, NoWA: UI.$('#ckW').value, Email: UI.$('#ckE').value, Tag: UI.$('#ckT').value, Catatan: UI.$('#ckC').value, OptOut: UI.$('#ckO').checked ? 'YA' : 'TIDAK' } });
        if (UI.showResult(rr)) { m.close(); load(); loadStats(); onDone && onDone(); }
      });
    };
    const openDetail = async (id) => {
      const m = UI.modal({ title: 'Detail kontak', drawer: true, body: '<div class="skel" style="height:24px"></div>' });
      const rr = await API.call('crm.detail', { kontakId: id }); if (!rr.success) { m.close(); UI.showResult(rr); return; }
      const k = rr.data.kontak, tl = rr.data.timeline;
      m.body.innerHTML = '<div class="who" style="margin-bottom:16px"><span class="avatar" style="width:48px;height:48px;font-size:16px">' + h(UI.initials(k.Nama)) + '</span><div><div style="font-size:18px;font-weight:700">' + h(k.Nama) + '</div><div class="small muted">' + h(k.Segmen) + ' · sumber ' + h(k.Sumber) + ' · ' + h(k.KontakID) + '</div></div></div>' +
        '<div class="kv-grid"><div class="kv-box"><div class="k">WhatsApp</div><div class="v mono">' + h(k.NoWA || '—') + ' ' + (k.NoWA ? UI.waBadge(k.StatusWA) : '') + '</div></div><div class="kv-box"><div class="k">Email</div><div class="v small">' + h(k.Email || '—') + '</div></div>' +
        '<div class="kv-box"><div class="k">Pesan terkirim</div><div class="v">' + num(k.JumlahPesan || 0) + '</div></div><div class="kv-box"><div class="k">Terakhir dihubungi</div><div class="v small">' + (k.TerakhirDihubungi ? UI.dt(k.TerakhirDihubungi) : '—') + '</div></div>' +
        '<div class="kv-box span2"><div class="k">Tag</div><div class="v">' + (String(k.Tag || '').split(',').filter(t => t.trim()).map(t => '<span class="badge b-info nc" style="margin:1px">' + h(t.trim()) + '</span>').join('') || '—') + '</div></div>' + (k.Catatan ? '<div class="kv-box span2"><div class="k">Catatan</div><div class="v small" style="font-weight:400">' + h(k.Catatan) + '</div></div>' : '') + '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0">' + (k.waValid ? '<a class="btn btn-soft btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + h(k.NoWA.replace(/^0/, '62')) + '">' + icon('message') + 'Chat WA</a>' : '') + (k.Email ? '<a class="btn btn-soft btn-sm" href="mailto:' + h(k.Email) + '">' + icon('mail') + 'Email</a>' : '') + '<button class="btn btn-outline btn-sm" id="cdEdit">' + icon('edit') + 'Edit</button></div>' +
        '<h3 class="sec-title" style="font-size:14px">Catat interaksi</h3><div style="display:flex;gap:8px;margin:8px 0 16px;flex-wrap:wrap"><select class="select" id="ciK" style="width:auto">' + UI.opts(['Telepon', 'WA Manual', 'Email Manual', 'Kunjungan', 'Catatan'], 'Telepon') + '</select><input class="input" id="ciR" placeholder="Ringkasan…" style="flex:1;min-width:160px"><button class="btn btn-primary btn-sm" id="ciSave">Catat</button></div>' +
        '<h3 class="sec-title" style="font-size:14px;margin-bottom:10px">Timeline</h3>' + (tl.length ? '<ul class="timeline">' + tl.map(t => '<li><div class="t">' + UI.dt(t.tanggal) + ' · ' + h(t.kanal) + (t.status ? ' · ' + h(t.status) : '') + (t.oleh ? ' · ' + h(t.oleh) : '') + '</div><div class="small">' + h(t.ringkasan) + '</div></li>').join('') + '</ul>' : '<p class="small muted">Belum ada interaksi.</p>');
      UI.$('#cdEdit').onclick = () => { m.close(); kForm(k); };
      UI.$('#ciSave').onclick = async () => { const rs = await API.call('crm.interaksi', { kontakId: k.KontakID, kanal: UI.$('#ciK').value, ringkasan: UI.$('#ciR').value }); if (UI.showResult(rs)) { m.close(); openDetail(id); load(); } };
    };
    $('#kq').addEventListener('input', UI.debounce(() => { st.cari = $('#kq').value.trim(); st.halaman = 1; load(); }));
    $('#kTagF').addEventListener('change', () => { st.tag = $('#kTagF').value.trim(); st.halaman = 1; load(); });
    [['#kWaF', 'statusWA'], ['#kEmF', 'emailValid'], ['#kOpF', 'optOut']].forEach(([s, k]) => $(s).onchange = () => { st[k] = $(s).value; st.halaman = 1; load(); });
    $('#kAdd').onclick = () => kForm(null);
    $('#kSync').onclick = (e) => UI.busy(e.currentTarget, async () => { const rr = await API.call('crm.sync', {}); if (UI.showResult(rr)) { load(); loadStats(); } });
    $('#kDup').onclick = async () => {
      const rr = await API.call('crm.duplicates', {}); if (!rr.success) return UI.showResult(rr);
      const g = rr.data.grup;
      const m = UI.modal({ title: 'Periksa duplikat (' + g.length + ' grup)', size: 'lg', body: g.length ? g.map((x, i) => '<div class="card pad-s mb" style="box-shadow:none"><b class="small">' + h(x.kunci) + '</b><table class="tbl dense" style="margin-top:6px"><tbody>' +
        x.kontak.map(k => '<tr><td><label class="check"><input type="radio" name="u' + i + '" value="' + h(k.KontakID) + '" ' + (k.Sumber === 'staf' ? 'checked' : '') + '> ' + h(k.Nama) + '</label></td><td class="small">' + h(k.Segmen) + ' · ' + h(k.Sumber) + '</td><td class="small">' + h(k.Tag || '') + '</td></tr>').join('') +
        '</tbody></table><button class="btn btn-soft btn-xs" style="margin-top:8px" data-merge="' + i + '">' + icon('merge', 'sm') + 'Gabungkan ke yang dipilih</button></div>').join('') : UI.empty('Tidak ada duplikat. 👍') });
      UI.$$('[data-merge]', m.el).forEach(b => b.onclick = async () => { const i = +b.dataset.merge, utama = (UI.$('input[name=u' + i + ']:checked', m.el) || {}).value; if (!utama) { UI.toast('Pilih kontak utama.', 'error'); return; }
        const r2 = await API.call('crm.merge', { utama, gabung: g[i].kontak.map(k => k.KontakID) }); if (UI.showResult(r2)) { b.closest('.card').remove(); load(); loadStats(); } });
    };
    $('#kImp').onclick = () => {
      const m = UI.modal({ title: 'Import kontak', body: '<p style="margin-top:0">Kolom: <b>Nama, Email, WA, Segmen, Tag, Catatan</b>. Segmen: Staf / PIC Unit / Vendor / Lainnya. Tag = nama PIC Unit atau vendor. Nomor yang sudah ada akan diperbarui.</p>' +
        '<label class="drop"><input type="file" hidden accept=".xlsx,.xls,.csv" id="kiF"><div class="ic">' + icon('upload', 'lg') + '</div>Pilih file</label><div id="kiInfo"></div>',
        footer: '<button class="btn btn-ghost" id="kiTpl">' + icon('download') + 'Template</button><button class="btn btn-primary" id="kiGo" disabled data-busy="Mengimpor…">Import</button>' });
      let rows = [];
      UI.$('#kiTpl').onclick = () => UI.downloadTemplate(['Nama', 'Email', 'WA', 'Segmen', 'Tag', 'Catatan'], 'Template_CRM_Kontak.xlsx', ['Budi (PIC Procurement)', 'budi@company.com', '081234567890', 'PIC Unit', 'Procurement', '']);
      UI.$('#kiF').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const p = await UI.readSheetFile(f, ['Nama', 'WA', 'Email']); rows = p.rows; UI.$('#kiInfo').innerHTML = '<div class="notice">' + icon('sheet') + '<div>' + h(f.name) + ' · ' + num(rows.length) + ' baris</div></div>'; UI.$('#kiGo').disabled = !rows.length; };
      UI.$('#kiGo').onclick = () => UI.busy(UI.$('#kiGo'), async () => { const rr = await API.call('crm.import', { rows }); if (UI.showResult(rr)) { m.close(); load(); loadStats(); if (rr.data.ditolak.length) UI.toast(rr.data.ditolak.slice(0, 3).join(' · '), 'warn', 8000); } });
    };
    await Promise.all([load(), loadStats()]);
  }
};
