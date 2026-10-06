/**
 * app.js — auth, shell (sidebar + topbar), router hash, periode global, idle logout
 * v2.5 (Instant UX PRO): login & buka-ulang = 1 panggilan (bootstrap), prefetch menu saat idle (batch),
 *       warm-up saat kembali dari latar belakang, halaman publik verifikasi dokumen #/v/<kode>
 */
const Pages = {};
const App = (() => {
  const { h, icon, $, $$ } = UI;
  const SA = 'SUPERADMIN', AD = 'ADMIN', US = 'USER';
  const ALL = [SA, AD, US], ADM = [SA, AD], SAO = [SA];
  const MENU = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', roles: ALL },
    { id: 'inspeksi', label: 'Data Inspeksi', icon: 'table', roles: ALL },
    { id: 'finding', label: 'Laporan Finding', icon: 'alert', roles: ALL },
    { id: 'customer', label: 'Laporan Per Customer', icon: 'users', roles: ALL },
    { id: 'periode', label: 'Laporan Periode', icon: 'calendar', roles: ALL },
    { id: 'training', label: 'Training Mandatory', icon: 'award', roles: ALL },
    { group: 'Settings' },
    { id: 'import', label: 'Data Import', icon: 'upload', roles: ADM },
    { id: 'dokumen', label: 'Dokumen & Template', icon: 'printer', roles: ADM },
    { id: 'notifikasi', label: 'WhatsApp & Notifikasi', icon: 'message', roles: ADM },
    { id: 'crm', label: 'CRM Kontak', icon: 'contact', roles: ADM },
    { id: 'users', label: 'User Management', icon: 'usercog', roles: SAO, tag: 'SA' },
    { id: 'audit', label: 'Audit Log', icon: 'history', roles: SAO, tag: 'SA' },
    { id: 'config', label: 'System Config', icon: 'sliders', roles: SAO, tag: 'SA' }
  ];
  const PERIODS = [['today', 'Hari ini'], ['week', 'Minggu ini'], ['month', 'Bulan ini'], ['last30', '30 hari terakhir'], ['quarter', 'Kuartal ini'], ['year', 'Tahun ini (YTD)'], ['all', 'Semua data'], ['custom', 'Rentang kustom…']];

  const state = {
    user: null, pub: null, lookups: null, sessionMinutes: 30, lastActivity: Date.now(),
    period: (() => { try { return JSON.parse(localStorage.getItem('mri_period')) || { period: 'month' }; } catch (e) { return { period: 'month' }; } })()
  };

  // ---------------------------------------------------------------- init
  const verifyCode = () => { const m = location.hash.match(/^#\/v\/([^/?]*)/); return m ? decodeURIComponent(m[1]) : null; };
  async function init() {
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(ev => window.addEventListener(ev, touch, { passive: true }));
    setInterval(checkIdle, 30000);
    window.addEventListener('hashchange', go);
    document.addEventListener('visibilitychange', onVisibility);
    if (!API.configured()) { hideBoot(); return renderNotConfigured(); }
    if (verifyCode() !== null) { hideBoot(); go(); }                 // halaman publik verifikasi QR — tanpa login
    try { state.pub = JSON.parse(API.LS.get('mri_pub') || 'null'); } catch (e) {}
    const pubP = API.call('publicConfig', {}, { silent: true }).then(r => { if (r.success) { state.pub = r.data; API.LS.set('mri_pub', JSON.stringify(r.data)); } return r; });
    if (API.token) {
      try { state.user = JSON.parse(API.LS.get('mri_user') || 'null'); } catch (e) {}
      try { state.lookups = API.peek('getLookups', {}); } catch (e) {}
      const instant = !!state.user;
      if (instant && verifyCode() === null) { renderShell(); hideBoot(); go(); }   // tampil instan dari sesi & cache tersimpan
      // SATU panggilan: profil + lookups (+ dashboard bila belum ada tampilan instan)
      const boot = await API.call('bootstrap', instant ? {} : { dash: dashParams() }, { silent: true });
      if (boot.success) {
        setUser(boot.data.user, boot.data.sessionMinutes);
        applyBoot(boot.data.boot);
        if (verifyCode() === null) { if (!document.querySelector('.shell')) { renderShell(); go(); } else { updateUserUi(); updateTopbar(); } }
        hideBoot(); schedulePrefetch(); return;
      }
      if (boot.code === 'NETWORK' && state.user) { UI.toast(boot.message, 'warn'); return; }
      API.setToken('');
      state.user = null;
    }
    await pubP;
    hideBoot();
    if (verifyCode() === null) renderLogin();
  }
  const dashParams = () => ({ period: state.period.period, from: state.period.from, to: state.period.to });
  /** Data awal dari login/bootstrap → cache (menu pertama tampil tanpa panggilan tambahan) */
  function applyBoot(b) {
    if (!b) return;
    if (b.lookups) { state.lookups = b.lookups; API.prime('getLookups', {}, b.lookups); }
    if (b.dashboard && b.dashboard.data) API.prime('getDashboard', b.dashboard.params, b.dashboard.data);
  }
  /** Prefetch menu utama saat browser idle — 1 panggilan batch, hasil langsung masuk cache */
  let prefetchTimer = null;
  function schedulePrefetch(delay) {
    clearTimeout(prefetchTimer);
    prefetchTimer = setTimeout(() => {
      const run = () => {
        if (!state.user) return;
        const cur = parseHash().id;
        const list = MENU.filter(m => m.id && m.id !== cur && m.roles.indexOf(state.user.role) > -1 && Pages[m.id] && Pages[m.id].prefetch)
          .map(m => { try { return Pages[m.id].prefetch(); } catch (e) { return null; } }).filter(Boolean);
        API.prefetch(list);
      };
      (window.requestIdleCallback || ((f) => setTimeout(f, 1)))(run, { timeout: 4000 });
    }, delay === undefined ? 1500 : delay);
  }
  /** Kembali dari latar belakang > 2 menit → ping pemanas (cold start GAS) + segarkan lookups */
  let hiddenAt = 0;
  function onVisibility() {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (state.user && hiddenAt && Date.now() - hiddenAt > 120000) { API.call('ping', {}, { silent: true, retries: 1 }); loadLookups(); schedulePrefetch(3000); }
  }
  const hideBoot = () => { const b = document.getElementById('boot'); if (b) b.remove(); };
  function setUser(u, minutes) { state.user = u; state.sessionMinutes = minutes || state.sessionMinutes; API.LS.set('mri_user', JSON.stringify(u)); }
  const touch = () => { state.lastActivity = Date.now(); };
  function checkIdle() {
    if (!state.user) return;
    if (Date.now() - state.lastActivity > state.sessionMinutes * 60000) {
      API.call('logout', {}, { silent: true });
      doLogout('Sesi berakhir karena tidak aktif selama ' + state.sessionMinutes + ' menit.');
    }
  }
  function onAuthLost(msg) { if (!state.user) return; doLogout(msg || 'Sesi berakhir. Silakan login kembali.'); }
  function doLogout(msg) {
    state.user = null; API.clearAll(); UI.destroyCharts();
    document.querySelectorAll('.overlay,.drawer,.drawer-ov').forEach(e => e.remove());
    if (location.hash) history.replaceState(null, '', location.pathname);
    renderLogin(msg);
  }
  async function loadLookups(force) {
    const r = await API.call('getLookups', {}, { silent: true });
    if (r.success) { state.lookups = r.data; API.prime('getLookups', {}, r.data); updateTopbar(); }
    return state.lookups;
  }

  // ---------------------------------------------------------------- belum dikonfigurasi
  function renderNotConfigured() {
    document.getElementById('app').innerHTML = '<div class="login-wrap"><div class="login-card"><div class="login-logo"><div class="brand-mark">M</div></div>' +
      '<h1>Dashboard MRI <span class="ver">V' + h(APP_CONFIG.VERSION) + '</span></h1><p class="sub">Frontend belum terhubung ke backend</p>' +
      '<div class="notice warn">' + icon('alert') + '<div>Isi <b>GAS_URL</b> di file <code>js/config.js</code> dengan URL Web App Apps Script (berakhiran <code>/exec</code>), lalu push ulang ke GitHub Pages. Lihat PANDUAN-INSTALASI.md.</div></div></div></div>';
  }

  // ---------------------------------------------------------------- login
  function renderLogin(msg) {
    const pub = state.pub || {};
    document.getElementById('app').innerHTML =
      '<main class="login-wrap"><div class="login-card">' +
      '<div class="login-logo"><div class="brand-mark">M</div></div>' +
      '<h1>' + h(pub.appName || 'Dashboard MRI') + ' <span class="ver">V' + h(APP_CONFIG.VERSION) + '</span></h1>' +
      '<p class="sub">Material Receiving Inspection System' + (pub.institusi ? ' · ' + h(pub.institusi) : '') + '</p>' +
      '<div class="notice">' + icon('shield') + '<div>Gateway internal perusahaan dengan audit log ISO/GMP aktif. Seluruh aktivitas tercatat.</div></div>' +
      (msg ? '<div class="notice warn" role="alert">' + icon('clock') + '<div>' + h(msg) + '</div></div>' : '') +
      '<div id="gsiBtn"></div><div id="gsiNote" class="hint" style="text-align:center;margin-top:6px"></div>' +
      '<div class="divider-text">atau masuk dengan email</div>' +
      '<form id="loginForm" novalidate>' +
      '<div class="field" style="margin-bottom:14px"><label for="lgEmail">Work Email</label><input id="lgEmail" class="input" type="email" autocomplete="username" placeholder="nama@company.com" required></div>' +
      '<div class="field" style="margin-bottom:18px"><label for="lgPass" style="display:flex;justify-content:space-between">Password <a href="#" id="forgot" class="small">Lupa password?</a></label>' +
      '<div class="rel"><input id="lgPass" class="input" type="password" autocomplete="current-password" placeholder="••••••••" required style="padding-right:42px">' +
      '<button type="button" class="icon-btn" id="togglePw" style="position:absolute;right:2px;top:2px" aria-label="Tampilkan password">' + icon('eye') + '</button></div></div>' +
      '<div id="loginErr"></div>' +
      '<button class="btn btn-soft btn-block btn-lg" type="submit" id="lgBtn" data-busy="Memverifikasi…">Sign In with Email &amp; Password</button>' +
      '</form><p class="xs muted" style="text-align:center;margin:18px 0 0">Sesi otomatis berakhir setelah ' + (pub.sessionMinutes || 30) + ' menit tidak aktif.</p></div></main>';
    const f = $('#loginForm');
    $('#togglePw').onclick = () => { const p = $('#lgPass'); p.type = p.type === 'password' ? 'text' : 'password'; };
    $('#forgot').onclick = (e) => { e.preventDefault(); UI.modal({ title: 'Lupa password', size: 'sm', body: '<p style="margin:0">Password hanya dapat direset oleh <b>Superadmin</b> melalui menu User Management. Hubungi Superadmin/IT, atau gunakan <b>Sign in with Google</b> bila akun Anda terdaftar dengan email Google Workspace.</p>' }); };
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#lgEmail').value.trim(), password = $('#lgPass').value;
      if (!email || !password) { showLoginErr('Email dan password wajib diisi.'); return; }
      await UI.busy($('#lgBtn'), async () => afterLogin(await API.call('login', { email, password, appUrl: appUrl(), dash: dashParams() })));
    });
    setupGoogle();
    setTimeout(() => { const a = document.activeElement; if ($('#lgEmail') && (!a || a === document.body)) $('#lgEmail').focus(); }, 50);
  }
  const appUrl = () => location.origin + location.pathname;
  const showLoginErr = (m) => { const el = $('#loginErr'); if (el) el.innerHTML = '<div class="notice err" role="alert">' + icon('alertc') + '<div>' + h(m) + '</div></div>'; };
  async function setupGoogle() {
    const box = $('#gsiBtn'), note = $('#gsiNote');
    const cid = state.pub && state.pub.googleClientId;
    const fallback = (why) => {
      box.innerHTML = '<button class="btn btn-primary btn-block btn-lg" type="button" id="gFake">' + UI.GOOGLE_G.replace('<svg', '<svg style="background:#fff;border-radius:3px;padding:1px"') + ' Sign In with Google</button>';
      $('#gFake').onclick = () => UI.toast(why, 'info', 6000);
    };
    if (!cid) { fallback('Login Google belum dikonfigurasi. Superadmin perlu mengisi GOOGLE_CLIENT_ID di System Config.'); return; }
    try {
      await UI.loadScript(APP_CONFIG.CDN.GSI);
      google.accounts.id.initialize({ client_id: cid, ux_mode: 'popup', auto_select: false, hd: state.pub.allowedDomain || undefined,
        callback: async (resp) => { box.style.opacity = .5; afterLogin(await API.call('loginGoogle', { credential: resp.credential, appUrl: appUrl(), dash: dashParams() })); box.style.opacity = 1; } });
      google.accounts.id.renderButton(box, { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'rectangular', width: Math.min(360, box.clientWidth || 360), logo_alignment: 'center' });
      if (state.pub.allowedDomain) note.textContent = 'Khusus akun @' + state.pub.allowedDomain;
    } catch (e) { fallback('Layanan Google Sign-In tidak dapat dimuat. Gunakan email & password.'); }
  }
  function afterLogin(res) {
    if (!res.success) { showLoginErr(res.message); return; }
    API.setToken(res.data.token);
    setUser(res.data.user, res.data.sessionMinutes);
    applyBoot(res.data.boot);                                           // lookups + dashboard sudah ikut di respons login
    touch();
    renderShell();
    if (!location.hash || verifyCode() !== null) location.hash = '#/dashboard'; else go();
    if (!res.data.boot) loadLookups();
    schedulePrefetch();
    UI.toast(res.message || 'Login berhasil.');
    if (res.data.user.mustChange) setTimeout(() => changePassword(true), 400);
  }

  // ---------------------------------------------------------------- shell
  function renderShell() {
    const u = state.user;
    const items = MENU.filter(m => m.group || m.roles.indexOf(u.role) > -1);
    const hasSettings = items.some(m => !m.group && MENU.indexOf(m) > MENU.findIndex(x => x.group));
    let navHtml = '', inSettings = false;
    items.forEach(m => {
      if (m.group) { if (!hasSettings) return; inSettings = true; navHtml += '<div class="nav-sep"></div><div class="nav-group" data-grp tabindex="0" role="button" aria-expanded="true">' + h(m.group) + icon('chevd', 'sm') + '</div><div data-grp-body>'; return; }
      navHtml += '<a class="nav-item" href="#/' + m.id + '" data-nav="' + m.id + '">' + icon(m.icon) + '<span>' + h(m.label) + '</span>' + (m.tag ? '<span class="tag">' + m.tag + '</span>' : '') + '</a>';
    });
    if (inSettings) navHtml += '</div>';
    document.getElementById('app').innerHTML =
      '<div class="shell" id="shell"><aside class="side" aria-label="Navigasi utama">' +
      '<div class="side-brand"><div class="brand-mark">M</div><b>Dashboard MRI</b><span class="ver">v' + h(APP_CONFIG.VERSION) + '</span></div>' +
      '<nav class="side-nav">' + navHtml + '</nav>' +
      '<div class="side-user"><div class="avatar" id="suAv"></div><div style="min-width:0;flex:1"><div class="nm" id="suName"></div><div class="rl"><span class="role-pill" id="suRole"></span><span id="suRole2"></span></div></div>' +
      '<button class="icon-btn" id="suMenu" aria-label="Menu akun" style="color:#94A3B8">' + icon('more') + '</button></div></aside>' +
      '<div class="backdrop" id="backdrop"></div>' +
      '<div class="main"><header class="top">' +
      '<button class="icon-btn menu-toggle" id="menuToggle" aria-label="Buka menu">' + icon('menu', 'lg') + '</button>' +
      '<div class="crumbs" id="crumbs"></div>' +
      '<div class="top-right"><div class="rel" id="periodWrap"></div>' +
      '<span class="sync-pill hide-sm" id="syncPill" title="">SYNCED</span>' +
      '<button class="icon-btn" id="bellBtn" aria-label="Peringatan">' + icon('bell', 'lg') + '<span class="dot-badge hidden" id="bellCnt"></span></button>' +
      '<button class="icon-btn hide-sm" id="themeBtn" aria-label="Ganti tema">' + icon('moon', 'lg') + '</button>' +
      '<div class="rel"><button class="user-btn" id="userBtn" aria-label="Menu akun"></button></div></div></header>' +
      '<div id="saBanner"></div><main class="content" id="content" tabindex="-1"></main></div></div>';
    updateUserUi();
    $('#menuToggle').onclick = () => $('#shell').classList.toggle('nav-open');
    $('#backdrop').onclick = () => $('#shell').classList.remove('nav-open');
    $$('.nav-item').forEach(a => a.addEventListener('click', () => $('#shell').classList.remove('nav-open')));
    const grp = $('[data-grp]');
    if (grp) { const tgl = () => { grp.classList.toggle('closed'); $('[data-grp-body]').classList.toggle('hidden'); grp.setAttribute('aria-expanded', !grp.classList.contains('closed')); }; grp.onclick = tgl; grp.onkeydown = (e) => { if (e.key === 'Enter') tgl(); }; }
    $('#userBtn').onclick = (e) => userMenu(e.currentTarget);
    $('#suMenu').onclick = (e) => userMenu($('#userBtn'));
    $('#themeBtn').onclick = toggleTheme;
    $('#bellBtn').onclick = bellMenu;
    updateThemeIcon();
    updateTopbar();
  }
  function updateUserUi() {
    const u = state.user; if (!u || !$('#suName')) return;
    $('#suAv').textContent = u.initials || UI.initials(u.name); $('#userBtn').textContent = u.initials || UI.initials(u.name);
    $('#suName').textContent = u.name;
    $('#suRole').textContent = u.role === SA ? 'SUPER' : u.role === AD ? 'ADMIN' : 'USER';
    $('#suRole2').textContent = u.role === SA ? 'Superadmin' : u.role === AD ? (u.dept || 'Admin') : (u.dept || 'Inspector');
  }
  function updateTopbar() {
    const l = state.lookups, pill = $('#syncPill'), cnt = $('#bellCnt');
    if (pill) {
      if (l) { pill.className = 'sync-pill hide-sm'; pill.textContent = 'SYNCED'; pill.title = 'Import/sinkron terakhir: ' + (l.lastSync ? UI.dt(l.lastSync) : 'belum ada'); }
    }
    if (cnt && l && l.alerts) { const n = (l.alerts.critical || 0) + (l.alerts.trainingOverdue || 0); cnt.textContent = n > 99 ? '99+' : n; cnt.classList.toggle('hidden', !n); }
  }
  function renderPeriodBtn(show) {
    const w = $('#periodWrap'); if (!w) return;
    if (!show) { w.innerHTML = ''; return; }
    w.innerHTML = '<button class="period-btn" id="periodBtn" aria-haspopup="true">' + icon('calendar') + '<span>' + h(periodLabel()) + '</span>' + icon('chevd', 'sm') + '</button>';
    $('#periodBtn').onclick = periodMenu;
  }
  function periodLabel(p) {
    p = p || state.period;
    if (p.period === 'custom') return UI.date(p.from) + ' – ' + UI.date(p.to);
    return (PERIODS.find(x => x[0] === p.period) || PERIODS[2])[1];
  }
  function closeDropdowns() { $$('.dropdown').forEach(d => d.remove()); }
  function dropdown(anchor, html, onClick) {
    closeDropdowns();
    const d = document.createElement('div'); d.className = 'dropdown'; d.innerHTML = html;
    anchor.parentElement.appendChild(d);
    const off = (e) => { if (!d.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) { d.remove(); document.removeEventListener('mousedown', off); } };
    setTimeout(() => document.addEventListener('mousedown', off), 0);
    d.addEventListener('click', (e) => onClick && onClick(e, d));
    return d;
  }
  function periodMenu(e) {
    const btn = e.currentTarget;
    const html = PERIODS.map(p => '<button class="dd-item ' + (state.period.period === p[0] ? 'on' : '') + '" data-per="' + p[0] + '">' + h(p[1]) + '</button>').join('') +
      '<div class="dd-sep"></div><div style="padding:6px 8px" class="' + (state.period.period === 'custom' ? '' : 'hidden') + '" id="custBox">' +
      '<div class="field" style="margin-bottom:8px"><label>Dari</label><input type="date" class="input" id="pFrom" value="' + h(state.period.from || '') + '"></div>' +
      '<div class="field" style="margin-bottom:10px"><label>Sampai</label><input type="date" class="input" id="pTo" value="' + h(state.period.to || UI.todayYmd()) + '"></div>' +
      '<button class="btn btn-primary btn-sm btn-block" id="pApply">Terapkan</button></div>';
    dropdown(btn, html, (ev, d) => {
      const b = ev.target.closest('[data-per]');
      if (b) {
        if (b.dataset.per === 'custom') { $('#custBox', d).classList.remove('hidden'); return; }
        setPeriod({ period: b.dataset.per }); d.remove();
      }
      if (ev.target.id === 'pApply') {
        const from = $('#pFrom', d).value, to = $('#pTo', d).value;
        if (!from || !to) { UI.toast('Isi tanggal dari & sampai.', 'error'); return; }
        setPeriod({ period: 'custom', from, to }); d.remove();
      }
    });
  }
  function setPeriod(p) {
    state.period = p; try { localStorage.setItem('mri_period', JSON.stringify(p)); } catch (e) {}
    renderPeriodBtn(true); go(); schedulePrefetch(2500);
  }
  function userMenu(anchor) {
    const u = state.user;
    dropdown(anchor, '<div style="padding:8px 10px"><b>' + h(u.name) + '</b><div class="small muted">' + h(u.email) + '</div><div style="margin-top:6px">' + UI.roleBadge(u.role) + '</div></div><div class="dd-sep"></div>' +
      '<button class="dd-item" data-act="pw">' + icon('key') + 'Ganti password</button>' +
      '<button class="dd-item" data-act="theme">' + icon(isDark() ? 'sun' : 'moon') + (isDark() ? 'Mode terang' : 'Mode gelap') + '</button>' +
      '<button class="dd-item" data-act="refresh">' + icon('refresh') + 'Muat ulang data</button>' +
      '<button class="dd-item" data-act="help">' + icon('info') + 'Bantuan & hak akses</button>' +
      '<div class="dd-sep"></div><button class="dd-item" data-act="logout" style="color:var(--err)">' + icon('logout') + 'Keluar</button>', (e, d) => {
      const b = e.target.closest('[data-act]'); if (!b) return; d.remove();
      if (b.dataset.act === 'pw') changePassword(false);
      if (b.dataset.act === 'theme') toggleTheme();
      if (b.dataset.act === 'refresh') { API.invalidate(); loadLookups(); go(); UI.toast('Data dimuat ulang dari server.', 'info'); }
      if (b.dataset.act === 'help') helpModal();
      if (b.dataset.act === 'logout') { API.call('logout', {}, { silent: true }); doLogout('Anda telah keluar.'); }
    });
  }
  function bellMenu(e) {
    const l = state.lookups || {}, a = l.alerts || {};
    dropdown(e.currentTarget, '<div style="padding:8px 10px"><b>Peringatan operasional</b></div><div class="dd-sep"></div>' +
      '<button class="dd-item" data-go="#/finding?aging=crit&tab=open">' + icon('alert') + '<span><b>' + UI.num(a.critical || 0) + '</b> finding open ≥ ' + (l.agingKritis || 14) + ' hari</span></button>' +
      '<button class="dd-item" data-go="#/inspeksi?overTat=1&status=Pending">' + icon('clock') + '<span><b>' + UI.num(a.overTat || 0) + '</b> material pending > target TAT</span></button>' +
      '<button class="dd-item" data-go="#/finding?tab=inv">' + icon('search') + '<span><b>' + UI.num(a.underInv || 0) + '</b> finding under investigation</span></button>' +
      '<button class="dd-item" data-go="#/training?status=Overdue">' + icon('award') + '<span><b>' + UI.num(a.trainingOverdue || 0) + '</b> training inspector overdue</span></button>' +
      '<button class="dd-item" data-go="#/training?status=Due%20Soon">' + icon('calendar') + '<span><b>' + UI.num(a.trainingDue || 0) + '</b> training jatuh tempo ≤ 30 hari</span></button>', (ev, d) => {
      const b = ev.target.closest('[data-go]'); if (b) { d.remove(); location.hash = b.dataset.go; }
    });
  }
  function helpModal() {
    UI.modal({ title: 'Bantuan & Hak Akses', size: 'lg', body:
      '<table class="tbl dense"><thead><tr><th>Fitur</th><th class="c">Superadmin</th><th class="c">Admin</th><th class="c">User</th></tr></thead><tbody>' +
      [['Dashboard, Data Inspeksi (lihat), semua Laporan, Export Excel', 1, 1, 1], ['Tambah / edit data inspeksi & finding', 1, 1, 0], ['Hapus data (soft delete, wajib alasan)', 1, 0, 0],
       ['Ubah target Completion Rate & batas SLA TAT (ikon pensil di kartu KPI)', 1, 1, 0], ['Training Mandatory: lihat matriks & cetak rekap', 1, 1, 1], ['Training Mandatory: tambah/edit, kirim reminder WA', 1, 1, 0],
       ['Cetak dokumen PDF ber-QR (MRIR, NCR, Summary)', 1, 1, 1], ['Arsip dokumen & daftar pejabat (lihat)', 1, 1, 0], ['Edit template Google Docs, pejabat & tarik dokumen', 1, 0, 0],
       ['Import Excel & sinkron API', 1, 1, 0], ['Migrasi spreadsheet lama', 1, 0, 0], ['Blast WhatsApp & CRM Kontak', 1, 1, 0], ['User Management, Audit Log, System Config, Konfigurasi Notifikasi', 1, 0, 0]]
        .map(r => '<tr><td>' + r[0] + '</td>' + r.slice(1).map(x => '<td class="c">' + (x ? '<span style="color:var(--ok)">✔</span>' : '<span class="muted">—</span>') + '</td>').join('') + '</tr>').join('') +
      '</tbody></table><p class="small muted" style="margin-top:14px">Tips: klik kartu KPI untuk drill-down ke tabel detail. Data ditampilkan seketika dari cache lokal lalu diperbarui dari server. Sesi berakhir otomatis setelah ' + state.sessionMinutes + ' menit tanpa aktivitas.</p>' });
  }
  function changePassword(forced) {
    const m = UI.modal({ title: forced ? 'Ganti password sementara Anda' : 'Ganti password', size: 'sm',
      body: (forced ? '<div class="notice warn">' + icon('key') + '<div>Anda login dengan password sementara. Demi keamanan, ganti sekarang.</div></div>' : '') +
        '<div class="field" style="margin-bottom:12px"><label>Password lama</label><input type="password" class="input" id="pwOld" autocomplete="current-password"></div>' +
        '<div class="field" style="margin-bottom:12px"><label>Password baru</label><input type="password" class="input" id="pwNew" autocomplete="new-password"><span class="hint">Minimal 8 karakter, berisi huruf dan angka.</span></div>' +
        '<div class="field"><label>Ulangi password baru</label><input type="password" class="input" id="pwNew2" autocomplete="new-password"></div>',
      footer: '<button class="btn btn-ghost" data-c>Nanti</button><button class="btn btn-primary" id="pwSave">Simpan password</button>' });
    m.el.querySelector('[data-c]').onclick = m.close;
    $('#pwSave').onclick = () => UI.busy($('#pwSave'), async () => {
      if ($('#pwNew').value !== $('#pwNew2').value) { UI.toast('Konfirmasi password tidak sama.', 'error'); return; }
      const r = await API.call('changePassword', { oldPassword: $('#pwOld').value, newPassword: $('#pwNew').value });
      if (UI.showResult(r)) { state.user.mustChange = false; setUser(state.user); m.close(); }
    });
  }
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  function toggleTheme() {
    const t = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('mri_theme', t); } catch (e) {}
    updateThemeIcon(); go();
  }
  function updateThemeIcon() { const b = $('#themeBtn'); if (b) b.innerHTML = icon(isDark() ? 'sun' : 'moon', 'lg'); }

  // ---------------------------------------------------------------- router
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const q = {}; new URLSearchParams(qs || '').forEach((v, k) => { q[k] = v; });
    return { id: parts[0] || 'dashboard', sub: parts[1] ? decodeURIComponent(parts[1]) : '', q };
  }
  let routeSeq = 0;
  async function go() {
    const vc = verifyCode();
    if (vc !== null) { closeDropdowns(); if (window.Verifikasi) Verifikasi.render(vc); return; }      // publik, tanpa login
    if (!state.user) { if (!document.querySelector('.login-wrap') && API.configured() && !API.token) renderLogin(); return; }
    if (!$('#content')) { renderShell(); }
    closeDropdowns();
    const r = parseHash(), menu = MENU.find(m => m.id === r.id), page = Pages[r.id];
    const content = $('#content');
    const seq = ++routeSeq;
    UI.destroyCharts();
    $$('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.nav === r.id));
    if (!page || !menu) { location.hash = '#/dashboard'; return; }
    if (menu.roles.indexOf(state.user.role) === -1) {
      content.innerHTML = '<div class="card">' + UI.empty('Akses ditolak — halaman ini khusus ' + menu.roles.join(' / ') + '.', 'lock') + '</div>';
      return;
    }
    const crumbGroup = page.group || 'Receiving Inspection';
    $('#crumbs').innerHTML = '<a href="#/dashboard" aria-label="Beranda" class="t2">' + icon('home') + '</a><span class="muted">/</span><span class="hide-xs">' + h(crumbGroup) + '</span><span class="muted hide-xs">/</span><span class="cur">' + h(r.sub && page.subTitle ? page.subTitle(r.sub) : (page.crumb || menu.label)) + '</span>';
    renderPeriodBtn(!!page.usesPeriod && !r.sub);
    $('#saBanner').innerHTML = page.saBanner ? '<div class="sa-banner">' + icon('shield') + '<b>SUPERADMIN PRIVILEGES ACTIVE</b><span>Semua akses, konfigurasi & perubahan tercatat di audit log (ISO 9001 & GMP).</span><span class="pill">● SESI TERVERIFIKASI</span></div>' : '';
    document.title = (page.crumb || menu.label) + ' — Dashboard MRI';
    content.innerHTML = '';
    window.scrollTo(0, 0);
    try { await page.render(content, r, { isCurrent: () => seq === routeSeq }); }
    catch (err) {
      if (seq !== routeSeq) return;
      const msg = (err && err.message) || 'Gagal memuat halaman.';
      if (err && err.code === 'AUTH') return;
      content.innerHTML = '<div class="card"><div class="empty">' + icon('alertc') + '<div><b>Gagal memuat data</b></div><div class="small" style="margin:6px 0 14px">' + h(msg) + '</div><button class="btn btn-outline btn-sm" id="retryBtn">' + icon('refresh') + 'Coba lagi</button></div></div>';
      $('#retryBtn').onclick = go;
      console.error(err);
    }
  }

  return {
    init, go, touch, onAuthLost, loadLookups, dropdown, closeDropdowns, periodLabel, changePassword, schedulePrefetch,
    get user() { return state.user; }, get lookups() { return state.lookups; }, get period() { return state.period; },
    can: (roles) => !!state.user && roles.indexOf(state.user.role) > -1, SA, AD, US, ALL, ADM, SAO
  };
})();
