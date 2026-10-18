/**
 * ui.js — komponen & helper UI (vanilla JS, tanpa framework)
 */
const UI = (() => {
  // ------------------------------------------------------------------ ikon (garis 24px)
  const P = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/><path d="m13 14 2 2 3-3"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4M12 17h.01"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    usercog: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4"/><circle cx="18" cy="18" r="3"/><path d="M18 13.5v1.5M18 21v1.5M22.5 18H21M15 18h-1.5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    message: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"/>',
    contact: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 9h3M15 13h3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5Z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkc: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    chevd: '<path d="m6 9 6 6 6-6"/>', chevr: '<path d="m9 18 6-6-6-6"/>', chevl: '<path d="m15 18-6-6 6-6"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2-1.2.5-2 2-2 3.8M14 14.7V17c0 .6.5 1 1 1.2 1.2.5 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0Z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alertc: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    sheet: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z"/><path d="M14 2v6h6M8 13h2M14 13h2M8 17h2M14 17h2"/>',
    cloud: '<path d="M12 13v8M8 17l4-4 4 4"/><path d="M20.4 18.4A5 5 0 0 0 18 9h-1.3A8 8 0 1 0 4 16.3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7.5" cy="7.5" r="1"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    google: '', stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>', play: '<path d="m6 3 14 9-14 9Z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    merge: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.3 17 22l-5-3-5 3 1.5-8.7"/>',
    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h3v4h-3"/>',
    pen: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    tv: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/><path d="M9 7h7M9 11h5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>'
  };
  const icon = (n, cls = '') => '<svg class="i ' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || P.info) + '</svg>';
  const GOOGLE_G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  // ------------------------------------------------------------------ util
  const h = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const nf = new Intl.NumberFormat('id-ID');
  const num = (v, d) => (v === null || v === undefined || v === '' || isNaN(v)) ? '—' : (d !== undefined ? Number(v).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) : nf.format(v));
  const pct = (v, d = 1) => (v === null || v === undefined || v === '' || isNaN(v)) ? '—' : Number(v).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const date = (s) => { if (!s) return '—'; const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + ' ' + BLN[+m[2] - 1] + ' ' + m[1] : h(s); };
  const dt = (s) => { if (!s) return '—'; const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); return m ? m[3] + ' ' + BLN[+m[2] - 1] + ' ' + m[1] + ', ' + m[4] + ':' + m[5] + ' WIB' : date(s); };
  const ago = (s) => {
    if (!s) return 'belum pernah';
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):?(\d{2})?/);
    const t = m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 7, +m[5], +(m[6] || 0)) : Date.parse(s);
    const d = (Date.now() - t) / 1000;
    if (isNaN(d)) return h(s);
    if (d < 60) return 'baru saja'; if (d < 3600) return Math.floor(d / 60) + ' mnt lalu'; if (d < 86400) return Math.floor(d / 3600) + ' jam lalu';
    return Math.floor(d / 86400) + ' hari lalu';
  };
  const initials = (n) => String(n || '?').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const todayYmd = () => { const d = new Date(Date.now() + 7 * 3600000); return d.toISOString().substring(0, 10); };

  // ------------------------------------------------------------------ badge
  // v2.6 — status mengikuti file Excel (TEXT AFTER)
  const MRI_B = { Inspected: ['b-ok', 'Inspected'], Revoke: ['b-err', 'Revoke'], 'Awaiting Inspection': ['b-warn', 'Awaiting Inspection'] };
  const MRI_ST = ['Inspected', 'Revoke', 'Awaiting Inspection'];
  const MRI_COLOR = { Inspected: '#16A34A', Revoke: '#DC2626', 'Awaiting Inspection': '#D97706' };
  const mriBadge = (s) => { const b = MRI_B[s] || ['b-pend', s || '—']; return '<span class="badge ' + b[0] + '">' + h(b[1]) + '</span>'; };
  const FD_B = { Open: 'b-err', 'Under Investigation': 'b-warn', Pending: 'b-pend', 'Sent to Customer': 'b-info', Closed: 'b-closed' };
  const fdTone = (s) => FD_B[s] || (/closed|selesai/i.test(s) ? 'b-closed' : /sent|kirim/i.test(s) ? 'b-info' : /open/i.test(s) ? 'b-err' : 'b-warn');
  const fdBadge = (s) => '<span class="badge nc ' + fdTone(s) + '">' + h(s) + '</span>';
  const agingBadge = (f) => f.agingLevel === 'closed' ? '<span class="muted num">' + num(f.aging) + ' hr</span>' :
    '<span class="badge nc ' + (f.agingLevel === 'crit' ? 'b-err' : f.agingLevel === 'warn' ? 'b-warn' : 'b-ok') + ' num">' + num(f.aging) + ' hari</span>';
  const delta = (v, opts = {}) => {
    if (v === null || v === undefined || isNaN(v)) return '<span class="delta flat">—</span>';
    const good = opts.invert ? v < 0 : v > 0, flat = Math.abs(v) < 0.05;
    const arrow = v > 0 ? '↑' : v < 0 ? '↓' : '→';
    return '<span class="delta ' + (flat ? 'flat' : good ? 'up' : 'down') + '" title="' + h(opts.title || 'vs periode sebelumnya') + '">' + arrow + ' ' + (v > 0 ? '+' : '') + num(v, opts.d !== undefined ? opts.d : 1) + (opts.unit || '%') + '</span>';
  };
  const waBadge = (s) => s === 'Terdaftar' ? '<span class="wa-badge ya">✓ WA</span>' : s === 'Tidak Terdaftar' ? '<span class="wa-badge tidak">✕ bukan WA</span>' : '<span class="wa-badge belum">? belum dicek</span>';
  const roleBadge = (r) => r === 'SUPERADMIN' ? '<span class="badge b-closed">🛡 Superadmin</span>' : r === 'ADMIN' ? '<span class="badge b-info">Admin</span>' : '<span class="badge b-pend">User</span>';

  // ------------------------------------------------------------------ toast
  function toast(msg, type = 'success', ms = 4200) {
    const box = document.getElementById('toasts'); if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type; el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = icon(type === 'error' ? 'alertc' : type === 'warn' ? 'alert' : type === 'info' ? 'info' : 'checkc') + '<div>' + h(msg) + '</div>';
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, ms);
  }

  // ------------------------------------------------------------------ modal / drawer / confirm
  function modal({ title, body, footer, size = '', onClose, drawer = false }) {
    const ov = document.createElement('div');
    ov.className = drawer ? 'drawer-ov' : 'overlay';
    const box = document.createElement('div');
    box.className = drawer ? 'drawer' : 'modal ' + size;
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', typeof title === 'string' ? title.replace(/<[^>]+>/g, '') : 'Dialog');
    box.innerHTML = '<div class="modal-h"><h3>' + title + '</h3><button class="icon-btn" data-x aria-label="Tutup">' + icon('x') + '</button></div><div class="modal-b">' + (body || '') + '</div>' + (footer ? '<div class="modal-f">' + footer + '</div>' : '');
    const prevFocus = document.activeElement;
    const close = () => { ov.remove(); if (drawer) box.remove(); document.removeEventListener('keydown', esc); if (onClose) onClose(); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    if (drawer) { document.body.appendChild(ov); document.body.appendChild(box); ov.addEventListener('click', close); }
    else { ov.appendChild(box); document.body.appendChild(ov); ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); }); }
    box.querySelector('[data-x]').addEventListener('click', close);
    setTimeout(() => { if (box.contains(document.activeElement) && document.activeElement.matches('input,select,textarea')) return; const f = box.querySelector('input:not([type=hidden]):not([disabled]), select, textarea, .modal-f .btn-primary'); if (f) f.focus(); }, 30);
    return { el: box, close, body: box.querySelector('.modal-b') };
  }
  function confirm({ title = 'Konfirmasi', message = '', okText = 'Ya, lanjutkan', danger = false, input = null, inputLabel = '', placeholder = '' }) {
    return new Promise((resolve) => {
      let done = false;
      const m = modal({ title: h(title), size: 'sm',
        body: '<p style="margin:0 0 12px">' + message + '</p>' + (input ? '<div class="field"><label>' + h(inputLabel) + ' <span class="req">*</span></label><textarea class="input" data-in rows="3" placeholder="' + h(placeholder) + '"></textarea></div>' : ''),
        footer: '<button class="btn btn-ghost" data-no>Batal</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + h(okText) + '</button>',
        onClose: () => { if (!done) resolve(null); } });
      m.el.querySelector('[data-no]').onclick = () => m.close();
      m.el.querySelector('[data-ok]').onclick = () => {
        let v = true;
        if (input) { v = m.el.querySelector('[data-in]').value.trim(); if (!v) { toast(inputLabel + ' wajib diisi.', 'error'); return; } }
        done = true; m.close(); resolve(v);
      };
    });
  }
  /** Tombol dengan status loading */
  async function busy(btn, fn) {
    if (!btn) return fn();
    const html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner sm"></span> ' + (btn.dataset.busy || 'Memproses…');
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
  }
  function showResult(res, okMsg) {
    if (res && res.success) { toast(res.message || okMsg || 'Berhasil.', 'success'); return true; }
    if (res && res.code !== 'AUTH') toast((res && res.message) || 'Gagal.', 'error', 6500);
    return false;
  }

  // ------------------------------------------------------------------ pager & tabel
  function pager(info, onPage, opts = {}) {
    const { page = 1, pages = 1, total = 0, per = 10 } = info || {};
    const from = total ? (page - 1) * per + 1 : 0, to = Math.min(page * per, total);
    const btns = [];
    const add = (p) => btns.push('<button class="pg ' + (p === page ? 'on' : '') + '" data-p="' + p + '">' + p + '</button>');
    const win = [1, page - 1, page, page + 1, pages].filter((p, i, a) => p >= 1 && p <= pages && a.indexOf(p) === i).sort((a, b) => a - b);
    win.forEach((p, i) => { if (i && p - win[i - 1] > 1) btns.push('<span class="muted">…</span>'); add(p); });
    const perSel = opts.perOptions ? '<label class="small muted" style="display:inline-flex;gap:6px;align-items:center">Tampilkan <select class="select" style="height:32px;width:auto" data-per>' +
      opts.perOptions.map(n => '<option ' + (n === per ? 'selected' : '') + '>' + n + '</option>').join('') + '</select> per halaman</label>' : '';
    const el = document.createElement('div');
    el.className = 'pager';
    el.innerHTML = '<div class="small t2" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span>Menampilkan <b>' + num(from) + '–' + num(to) + '</b> dari <b>' + num(total) + '</b> ' + (opts.noun || 'data') + '</span>' + perSel + '</div>' +
      '<div class="pages"><button class="pg" data-p="' + (page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya">' + icon('chevl', 'sm') + '</button>' + btns.join('') +
      '<button class="pg" data-p="' + (page + 1) + '" ' + (page >= pages ? 'disabled' : '') + ' aria-label="Berikutnya">' + icon('chevr', 'sm') + '</button></div>';
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b && !b.disabled) onPage(+b.dataset.p, per); });
    const sel = el.querySelector('[data-per]'); if (sel) sel.addEventListener('change', () => onPage(1, +sel.value));
    return el;
  }
  /** Header tabel yang bisa di-sort */
  function thSort(label, field, st, cls = '') {
    const on = st.sort === field;
    return '<th class="sortable ' + cls + (on ? ' sorted' : '') + '" data-sort="' + field + '" aria-sort="' + (on ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '">' + label + '<span class="arr">' + (on ? (st.dir === 'asc' ? '▲' : '▼') : '↕') + '</span></th>';
  }
  function bindSort(root, st, reload) {
    $$('th[data-sort]', root).forEach(th => th.addEventListener('click', () => {
      const f = th.dataset.sort; st.dir = st.sort === f && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = f; st.page = 1; reload();
    }));
  }
  const empty = (msg = 'Belum ada data.', ico = 'database') => '<div class="empty">' + icon(ico) + '<div>' + h(msg) + '</div></div>';
  const skelRows = (n = 6, cols = 6) => Array.from({ length: n }, () => '<tr>' + Array.from({ length: cols }, () => '<td><div class="skel"></div></td>').join('') + '</tr>').join('');
  const opts = (arr, sel, allLabel) => (allLabel !== undefined ? '<option value="">' + h(allLabel) + '</option>' : '') + (arr || []).map(v => {
    const val = typeof v === 'object' ? v.value : v, lab = typeof v === 'object' ? v.label : v;
    return '<option value="' + h(val) + '" ' + (String(sel) === String(val) ? 'selected' : '') + '>' + h(lab) + '</option>';
  }).join('');

  // ------------------------------------------------------------------ lazy script & chart
  const loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = () => res(); s.onerror = () => { delete loaded[src]; rej(new Error('Gagal memuat ' + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  const ensureChart = () => window.Chart ? Promise.resolve() : loadScript(APP_CONFIG.CDN.CHART);
  const ensureXLSX = () => window.XLSX ? Promise.resolve() : loadScript(APP_CONFIG.CDN.XLSX);
  const charts = [];
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function destroyCharts() { while (charts.length) { try { charts.pop().destroy(); } catch (e) {} } }
  /** Chart.js dengan tema dari token CSS (mengikuti light/dark) */
  async function chart(canvas, cfg) {
    if (!canvas) return null;
    const fast = !!UI.fast;                                   // render dari cache → tanpa animasi (terasa instan)
    try { await ensureChart(); } catch (e) { canvas.parentElement.innerHTML = '<div class="empty">Grafik tidak dapat dimuat (library chart gagal diunduh). Data tetap tersedia di tabel.</div>'; return null; }
    if (!canvas.isConnected) return null;
    const prev = Chart.getChart(canvas); if (prev) { prev.destroy(); const i = charts.indexOf(prev); if (i > -1) charts.splice(i, 1); }
    const text2 = cssVar('--text-2'), muted = cssVar('--muted'), grid = cssVar('--grid'), card = cssVar('--card');
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif'; Chart.defaults.font.size = 12; Chart.defaults.color = muted;
    const base = {
      responsive: true, maintainAspectRatio: false, animation: { duration: fast ? 0 : 300 },
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: cssVar('--rail') || '#0F172A', titleColor: '#fff', bodyColor: '#E2E8F0', padding: 10, cornerRadius: 6, boxPadding: 4, usePointStyle: true,
        callbacks: { label: (c) => ' ' + (c.dataset.label ? c.dataset.label + ': ' : '') + num(c.parsed.y !== undefined ? c.parsed.y : c.parsed, Number.isInteger(c.parsed.y !== undefined ? c.parsed.y : c.parsed) ? undefined : 1) + (c.dataset.unit || '') } } },
      scales: cfg.type === 'doughnut' ? {} : {
        x: { grid: { display: false }, border: { color: grid }, ticks: { color: muted } },
        y: { grid: { color: grid }, border: { display: false }, ticks: { color: muted, callback: (v) => num(v) }, beginAtZero: true }
      }
    };
    const merged = deepMerge(base, cfg.options || {});
    (cfg.data.datasets || []).forEach(ds => { if (cfg.type === 'doughnut') { ds.borderColor = card; ds.borderWidth = 2; } });
    const c = new Chart(canvas, { type: cfg.type, data: cfg.data, options: merged, plugins: cfg.plugins || [] });
    charts.push(c);
    return c;
  }
  function deepMerge(a, b) {
    const o = Array.isArray(a) ? a.slice() : Object.assign({}, a);
    Object.keys(b || {}).forEach(k => { o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && typeof a[k] === 'object' ? deepMerge(a[k] || {}, b[k]) : b[k]; });
    return o;
  }
  const S = () => ({ s1: cssVar('--s1'), s2: cssVar('--s2'), s3: cssVar('--s3'), ok: '#16A34A', warn: '#D97706', err: '#DC2626', pend: '#94A3B8', muted: cssVar('--muted'), border: cssVar('--border-strong') });

  // ------------------------------------------------------------------ Excel
  async function exportXlsx(payload) {
    await ensureXLSX();
    const wb = XLSX.utils.book_new();
    (payload.sheets || []).forEach(sh => {
      const ws = XLSX.utils.aoa_to_sheet([sh.headers].concat(sh.rows));
      ws['!cols'] = sh.headers.map((hd, i) => ({ wch: Math.min(48, Math.max(String(hd).length + 2, ...sh.rows.slice(0, 200).map(r => String(r[i] === null || r[i] === undefined ? '' : r[i]).length + 1))) }));
      XLSX.utils.book_append_sheet(wb, ws, String(sh.name).substring(0, 31));
    });
    XLSX.writeFile(wb, payload.fileName || 'export.xlsx');
  }
  async function doExport(btn, dataset, params, action = 'exportExcel') {
    return busy(btn, async () => {
      const res = await API.call(action, action === 'exportExcel' ? { dataset, params } : params);
      if (!res.success) { showResult(res); return; }
      try { await exportXlsx(res.data); toast('File ' + res.data.fileName + ' diunduh (' + num(res.data.sheets[0].rows.length) + ' baris).'); }
      catch (e) { toast('Gagal membuat file Excel: ' + e.message, 'error'); }
    });
  }
  /**
   * Baca .xlsx/.xls/.csv → array objek (header terdeteksi otomatis di 10 baris pertama).
   * v2.6: tanggal dibaca dari NOMOR SERI Excel (bukan cellDates) — dulu di zona WIB SheetJS menghasilkan
   * jam 23:59:48 hari sebelumnya sehingga semua tanggal tersimpan mundur 1 hari. Sel error (#N/A) = kosong.
   * Kolom tanggal berupa TEKS (mis. 08/25/2026) diseragamkan per kolom: bila ada nilai > 12 urutannya pasti.
   */
  async function readSheetFile(file, expectHeaders = []) {
    await ensureXLSX();
    const buf = await file.arrayBuffer();
    const csv = /\.(csv|txt)$/i.test(file.name || '');
    const wb = XLSX.read(buf, { type: 'array', cellDates: false, cellNF: true, raw: csv });
    return parseWorkbook(wb, expectHeaders);
  }
  const pad = (n) => String(n).padStart(2, '0');
  function serialYmd(n, d1904) {
    const d = new Date(Math.round((Math.floor(Number(n) + 1e-7) - (d1904 ? 24107 : 25569)) * 86400000));
    return isNaN(d.getTime()) ? '' : d.toISOString().substring(0, 10);
  }
  function cellVal(c, d1904) {
    if (!c || c.t === 'z') return '';
    if (c.t === 'e') return '';                                                    // #N/A, #REF!, …
    if (c.t === 'n' && c.z && XLSX.SSF.is_date(c.z)) return serialYmd(c.v, d1904);
    if (c.t === 'd' && c.v instanceof Date) { const d = new Date(c.v.getTime() + 12 * 3600000); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    return c.v === undefined || c.v === null ? '' : c.v;
  }
  const TXT_DATE = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}|\d{2})(?:[ T].*)?$/;
  /** Seragamkan kolom tanggal teks: bukti hari > 12 di posisi pertama → D/M, di posisi kedua → M/D */
  function normTextDates(rows, header) {
    const hasil = {};
    header.forEach((k) => {
      if (!k) return;
      let dmy = 0, mdy = 0, n = 0;
      rows.forEach((o) => { const m = typeof o[k] === 'string' ? o[k].trim().match(TXT_DATE) : null; if (!m) return; n++; if (+m[1] > 12 && +m[2] <= 12) dmy++; else if (+m[2] > 12 && +m[1] <= 12) mdy++; });
      if (!n || (dmy && mdy) || (!dmy && !mdy)) return;
      const isMdy = mdy > 0; hasil[k] = isMdy ? 'M/D/Y' : 'D/M/Y';
      rows.forEach((o) => {
        const m = typeof o[k] === 'string' ? o[k].trim().match(TXT_DATE) : null; if (!m) return;
        const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]), mo = isMdy ? +m[1] : +m[2], d = isMdy ? +m[2] : +m[1];
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) o[k] = y + '-' + pad(mo) + '-' + pad(d);
      });
    });
    return hasil;
  }
  function parseWorkbook(wb, expectHeaders = []) {
    const ws = wb.Sheets[wb.SheetNames[0]];
    const d1904 = !!(wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904);
    const range = ws && ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
    const aoa = [];
    if (range) for (let R = range.s.r; R <= range.e.r; R++) {
      const row = []; for (let C = range.s.c; C <= range.e.c; C++) row.push(cellVal(ws[XLSX.utils.encode_cell({ r: R, c: C })], d1904));
      aoa.push(row);
    }
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    const want = expectHeaders.map(norm);
    let hi = 0, best = -1;
    aoa.slice(0, 10).forEach((r, i) => { const sc = r.filter(c => c !== '' && (want.length ? want.indexOf(norm(c)) > -1 : true)).length; if (sc > best) { best = sc; hi = i; } });
    const header = (aoa[hi] || []).map(x => String(x).trim());
    const r0 = range ? range.s.r : 0;
    const rows = aoa.map((r, i) => [r, i]).slice(hi + 1).filter(([r]) => r.some(c => c !== '')).map(([r, i]) => {
      const o = { __row: r0 + i + 1 }; header.forEach((k, j) => { if (k) o[k] = r[j]; }); return o;
    });
    const tanggalTeks = normTextDates(rows, header);
    return { rows, header, headerRow: r0 + hi + 1, sheet: wb.SheetNames[0], tanggalTeks };
  }
  async function downloadTemplate(headers, name, sample) {
    await ensureXLSX();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers].concat(sample ? [sample] : []));
    ws['!cols'] = headers.map(h2 => ({ wch: Math.max(14, h2.length + 4) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, name);
  }

  // ------------------------------------------------------------------ v2.5: target KPI editable (Superadmin & Admin)
  const TARGET_DEF = {
    COMPLETION_TARGET: { label: 'Target Completion Rate', unit: '%', min: 1, max: 100, step: 0.5, chips: [85, 90, 95, 98, 100],
      help: 'Persentase item yang sudah selesai (Inspected + Revoke) dari seluruh item diterima. Dipakai di Dashboard, Laporan Per Customer & Laporan Periode.' },
    TAT_TARGET_HARI: { label: 'Batas SLA Average Inspection TAT', unit: 'hari', min: 0.5, max: 60, step: 0.5, chips: [1, 2, 3, 5, 7],
      help: 'Inspeksi dianggap dalam SLA bila TAT ≤ nilai ini. Dipakai di Dashboard, Data Inspeksi, Laporan Customer & Periode, serta alert material pending.' }
  };
  /** Tombol pensil kecil di samping nilai target (hanya Superadmin & Admin) */
  function tgtBtn(key, cur, menu) {
    if (typeof App === 'undefined' || !App.can(App.ADM)) return '';
    return '<button type="button" class="tgt-edit" data-target-edit="' + key + '" data-cur="' + h(cur) + '" data-menu="' + h(menu || '') + '" title="Ubah ' + h(TARGET_DEF[key].label) + '" aria-label="Ubah ' + h(TARGET_DEF[key].label) + '">' + icon('pen', 'sm') + '</button>';
  }
  function editTarget(key, cur, menu) {
    const d = TARGET_DEF[key]; if (!d) return;
    const m = modal({ title: icon('target') + ' ' + h(d.label), size: 'sm', body:
      '<p class="small t2" style="margin:0 0 14px">' + h(d.help) + '</p>' +
      '<div class="field"><label for="tgVal">Nilai baru (' + h(d.unit) + ')</label><div style="display:flex;gap:8px;align-items:center"><input class="input" id="tgVal" type="number" inputmode="decimal" min="' + d.min + '" max="' + d.max + '" step="' + d.step + '" value="' + h(cur) + '" style="max-width:140px;font-size:18px;font-weight:700"><span class="t2">' + h(d.unit) + '</span></div>' +
      '<span class="hint">Rentang ' + d.min + '–' + d.max + ' ' + h(d.unit) + '. Nilai saat ini: <b>' + h(cur) + ' ' + h(d.unit) + '</b>.</span></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">' + d.chips.map(c => '<button type="button" class="chip' + (Number(cur) === c ? ' on' : '') + '" data-chip="' + c + '">' + c + ' ' + h(d.unit) + '</button>').join('') + '</div>' +
      '<div class="notice" style="margin-bottom:0">' + icon('history') + '<div>Perubahan target tercatat di Audit Log dan langsung berlaku untuk semua user.</div></div>',
      footer: '<button class="btn btn-ghost" data-c>Batal</button><button class="btn btn-primary" id="tgSave" data-busy="Menyimpan…">' + icon('check') + 'Simpan target</button>' });
    m.el.querySelector('[data-c]').onclick = m.close;
    $$('[data-chip]', m.el).forEach(c => c.onclick = () => { $('#tgVal').value = c.dataset.chip; $$('[data-chip]', m.el).forEach(x => x.classList.toggle('on', x === c)); });
    const save = () => busy($('#tgSave'), async () => {
      const v = Number($('#tgVal').value);
      if (!$('#tgVal').value || isNaN(v) || v < d.min || v > d.max) { toast(d.label + ' harus ' + d.min + '–' + d.max + ' ' + d.unit + '.', 'error'); return; }
      const res = await API.call('setKpiTarget', { key, value: v, menu: menu || 'KPI Target' });
      if (!showResult(res)) return;
      m.close();
      if (App.lookups && res.data) { App.lookups.completionTarget = res.data.completion; App.lookups.tatTarget = res.data.tat; }
      API.invalidate(['getDashboard', 'getData', 'getDetail', 'getReportCustomer', 'getReportPeriod', 'getLookups']);
      App.loadLookups(); App.go();
    });
    $('#tgSave').onclick = save;
    $('#tgVal').addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  }
  // Capture: klik pensil tidak ikut memicu navigasi kartu KPI yang bisa diklik
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-target-edit]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    editTarget(b.dataset.targetEdit, b.dataset.cur, b.dataset.menu);
  }, true);
  document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-target-edit]')) e.stopPropagation(); }, true);

  /** base64 PDF → URL blob (untuk pratinjau, cetak, unduh) */
  function pdfUrl(b64) {
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
  }

  return { icon, GOOGLE_G, h, $, $$, num, pct, date, dt, ago, initials, debounce, todayYmd, BLN, BULAN, mriBadge, fdBadge, fdTone, MRI_ST, MRI_COLOR, agingBadge, delta, waBadge, roleBadge,
    toast, modal, confirm, busy, showResult, pager, thSort, bindSort, empty, skelRows, opts, loadScript, ensureChart, ensureXLSX, chart, destroyCharts, cssVar, S,
    exportXlsx, doExport, readSheetFile, parseWorkbook, downloadTemplate, tgtBtn, editTarget, pdfUrl, fast: false,
    cetak: (kode, params, opts) => (window.DocPrint ? DocPrint.open(kode, params, opts) : toast('Modul dokumen belum dimuat.', 'error')) };
})();
