/**
 * api.js — komunikasi ke GAS REST API (Instant UX PRO, v2.6)
 * • POST text/plain (tanpa preflight CORS) { action, token, data, client, reqId }
 * • Timeout + retry: aksi BACA diulang otomatis (maks 3×), aksi TULIS membawa reqId unik
 *   sehingga aman diulang saat jaringan HP putus-sambung (server idempoten 6 jam)
 * • SWR + batas kesegaran: data yang masih segar langsung dipakai TANPA ke server;
 *   setelah itu ditampilkan dari cache lalu diperbarui di latar (render ulang hanya bila berubah)
 * • Cache per user + versi skema (mri:v25:) · prefetch beberapa menu dalam 1 panggilan (batch)
 * • Perf.table() di console: total vs waktu server per aksi
 */
const API = (() => {
  const NS = 'mri:v26:';                                   // v2.6: bentuk data berubah (status Excel) → cache lama tidak dipakai
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
    keys() { try { return Object.keys(localStorage); } catch (e) { return []; } }
  };
  LS.keys().filter(k => k.indexOf('swr:') === 0 || k.indexOf('mri:v25:') === 0).forEach(k => LS.del(k));   // cache versi lama dibuang
  let token = LS.get('mri_token') || '';
  let inflight = 0;
  const progress = (on) => {
    inflight = Math.max(0, inflight + (on ? 1 : -1));
    const el = document.getElementById('progress');
    if (el) el.classList.toggle('on', inflight > 0);
  };
  const client = () => ({ ua: (navigator.userAgent.match(/(Edg|Chrome|Firefox|Safari)\/[\d.]+/) || ['Browser'])[0] + ' · ' + (navigator.platform || '') });
  const configured = () => !!(window.APP_CONFIG && APP_CONFIG.GAS_URL && APP_CONFIG.GAS_URL.indexOf('GANTI_DENGAN') === -1);
  const READ = /^(ping|publicConfig|verifikasiDokumen|me|bootstrap|batch|get[A-Z]\w*|filterData|exportExcel|migrasiScan|training\.list|doc\.(prepare|download|templates|pejabat|arsip)|notif\.(config|queue)|wa\.(device|audience|blastList)|crm\.(list|stats|detail|duplicates|export)|master\.get|tv\.(data|config))$/;
  const isRead = (a) => READ.test(a);
  const rid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const waitOnline = () => navigator.onLine === false ? new Promise(r => { const f = () => { window.removeEventListener('online', f); r(); }; window.addEventListener('online', f); setTimeout(f, 20000); }) : Promise.resolve();

  // ---------------------------------------------------------------- pengukur (Prinsip 0)
  const Perf = {
    rows: [],
    add(action, total, server, info) {
      this.rows.push({ action, total: Math.round(total), server: server === undefined ? null : server, net: server != null ? Math.round(total - server) : null, info: info || '', at: new Date().toLocaleTimeString('id-ID') });
      if (this.rows.length > 300) this.rows.shift();
    },
    table() { console.table(this.rows.slice(-40)); },
    ringkas() {
      const g = {}; this.rows.forEach(r => { (g[r.action] = g[r.action] || []).push(r.total); });
      console.table(Object.keys(g).map(a => ({ action: a, n: g[a].length, rata2: Math.round(g[a].reduce((s, x) => s + x, 0) / g[a].length), maks: Math.max(...g[a]) })));
    }
  };
  window.Perf = Perf;

  async function once(action, data, timeout, reqId) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(APP_CONFIG.GAS_URL, {
        method: 'POST', redirect: 'follow', signal: ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token, data: data || {}, client: client(), reqId })
      });
      const text = await res.text();
      try { return JSON.parse(text); }
      catch (e) { const er = new Error('Respons server bukan JSON (HTTP ' + res.status + ').'); er.retry = true; throw er; }   // halaman error Google
    } catch (err) {
      if (err.name === 'AbortError') { const er = new Error('timeout'); er.retry = true; er.timeout = true; throw er; }
      if (err.retry) throw err;
      const er = new Error(err.message || 'network'); er.retry = true; throw er;
    } finally { clearTimeout(timer); }
  }

  /** opts: silent, timeout, retries, read (paksa jenis), reqId */
  async function call(action, data, opts = {}) {
    if (!configured()) return { success: false, code: 'CONFIG', message: 'GAS_URL di js/config.js belum diisi.' };
    const read = opts.read !== undefined ? opts.read : isRead(action);
    const reqId = read ? undefined : (opts.reqId || rid());
    const max = opts.retries !== undefined ? opts.retries : (read ? 3 : 2);
    const t0 = performance.now();
    if (!opts.silent) progress(true);
    try {
      for (let i = 0; i < max; i++) {
        await waitOnline();
        const to = opts.timeout || (read ? (i === 0 ? 25000 : 45000) : 90000);
        try {
          const json = await once(action, data, to, reqId);
          if (!json.success && json.code === 'BUSY' && i < max - 1) { await sleep(900 * (i + 1)); continue; }   // server sibuk: aman diulang
          Perf.add(action, performance.now() - t0, json.ms, i ? 'retry ' + i : (json.idempotent ? 'idem' : ''));
          if (!json.success && json.code === 'AUTH' && typeof App !== 'undefined') App.onAuthLost(json.message);
          if (typeof App !== 'undefined') App.touch();
          return json;
        } catch (err) {
          if (i === max - 1) {
            Perf.add(action, performance.now() - t0, null, 'gagal');
            return { success: false, code: 'NETWORK', message: err.timeout ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet / GAS_URL.' };
          }
          await sleep(i === 0 ? 600 : 1800);
        }
      }
    } finally { if (!opts.silent) progress(false); }
  }

  // ---------------------------------------------------------------- cache SWR (memori + localStorage)
  const stable = (o) => {
    if (o === null || typeof o !== 'object') return JSON.stringify(o === undefined ? null : o);
    if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']';
    return '{' + Object.keys(o).filter(k => o[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}';
  };
  const uid = () => (typeof App !== 'undefined' && App.user ? App.user.userId : '');   // const global bukan properti window
  const keyOf = (action, data) => NS + 'swr:' + uid() + ':' + action + ':' + stable(data || {});
  const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; };
  const mem = new Map();
  function getC(k) {
    if (mem.has(k)) return mem.get(k);
    const raw = LS.get(k); if (!raw) return null;
    try { const c = JSON.parse(raw); mem.set(k, c); return c; } catch (e) { return null; }
  }
  function putC(k, d) {
    const s = JSON.stringify(d), c = { t: Date.now(), h: hashStr(s), d };
    mem.set(k, c);
    const js = '{"t":' + c.t + ',"h":' + JSON.stringify(c.h) + ',"d":' + s + '}';
    if (js.length < 1500000 && !LS.set(k, js)) { prune(true); LS.set(k, js); }
    return c;
  }
  // Batas kesegaran per aksi (ms): dalam rentang ini pindah menu = 0 panggilan server
  const FRESH = { getLookups: 120000, getDashboard: 45000, getData: 45000, getReportFinding: 45000, getReportCustomer: 60000, getReportPeriod: 90000,
    'training.list': 45000, 'doc.templates': 30000, 'doc.arsip': 20000, 'doc.pejabat': 60000, getAuditLog: 15000, getImportLog: 15000, 'notif.queue': 10000, 'master.get': 30000 };
  /** render(data, fromCache) dipanggil maks. 2× dan hanya bila data berbeda */
  async function swr(action, data, render, opts = {}) {
    const k = keyOf(action, data), c = getC(k);
    const fresh = opts.fresh !== undefined ? opts.fresh : (FRESH[action] || 30000);
    if (c) { UI.fast = true; try { render(c.d, true); } catch (e) { console.error(e); } finally { UI.fast = false; } }
    if (c && !opts.force && Date.now() - c.t < fresh) { Perf.add(action, 0, 0, 'cache segar'); return { success: true, data: c.d, cached: true }; }
    const res = await call(action, data, { silent: !!c });
    if (res.success) {
      const n = putC(k, res.data);
      if (!c || c.h !== n.h) render(res.data, false);
      return res;
    }
    if (!c && res.code !== 'AUTH') throw res;
    if (res.code !== 'AUTH' && !opts.quiet) UI.toast('Menampilkan data tersimpan — ' + res.message, 'warn');
    return res;
  }
  /** Isi cache dari data yang sudah didapat (login/bootstrap/batch) */
  function prime(action, data, payload) { if (payload !== undefined && payload !== null) putC(keyOf(action, data), payload); }
  function peek(action, data) { const c = getC(keyOf(action, data)); return c ? c.d : null; }
  function isFresh(action, data) { const c = getC(keyOf(action, data)); return !!c && Date.now() - c.t < (FRESH[action] || 30000); }
  /** Prefetch beberapa aksi baca dalam SATU panggilan (memo sheet server dipakai bersama) */
  async function prefetch(list) {
    const need = (list || []).filter(x => x && !isFresh(x.action, x.data)).slice(0, 10);
    if (!need.length || !token) return 0;
    const res = await call('batch', { calls: need.map((x, i) => ({ key: String(i), action: x.action, data: x.data || {} })) }, { silent: true, retries: 1 });
    if (!res.success) return 0;
    let n = 0;
    need.forEach((x, i) => { const r = res.data[String(i)]; if (r && r.success) { prime(x.action, x.data, r.data); n++; } });
    return n;
  }
  function prune(all) {
    LS.keys().filter(k => k.indexOf(NS + 'swr:') === 0 && (all || k.indexOf(NS + 'swr:' + uid() + ':') !== 0)).forEach(k => LS.del(k));
    if (all) mem.clear();
  }
  /** Hapus cache agar data berikutnya fresh (dipanggil setelah operasi tulis) */
  function invalidate(prefixActions) {
    const hit = (k) => k.indexOf(NS + 'swr:') === 0 && (!prefixActions || prefixActions.some(a => k.indexOf(':' + a + ':') > -1));
    Array.from(mem.keys()).filter(hit).forEach(k => mem.delete(k));
    LS.keys().filter(hit).forEach(k => LS.del(k));
  }
  return {
    call, swr, prime, peek, prefetch, invalidate, configured, LS, rid, stable,
    get token() { return token; },
    setToken(t) { token = t || ''; if (t) LS.set('mri_token', t); else LS.del('mri_token'); },
    clearAll() { prune(true); LS.del('mri_token'); LS.del('mri_user'); token = ''; }
  };
})();
