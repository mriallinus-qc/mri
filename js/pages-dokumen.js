/**
 * pages-dokumen.js — Mesin Dokumen (gas-doc-engine) di frontend · v2.5
 *  • DocPrint.open(kode, params)  : alur "cetak langsung" untuk SEMUA dokumen (MRIR, NCR, summary, rekap training)
 *  • Verifikasi.render(kode)      : halaman publik #/v/<kode> (tanpa login) + cek hash PDF di peramban
 *  • Pages.dokumen                : arsip dokumen · template Google Docs · pejabat penanda tangan
 */
window.DocPrint = (() => {
  const { h, icon } = UI;
  const LANGKAH = ['Menyusun data dari database', 'Menyalin template Google Docs', 'Mengisi placeholder, tabel & tanda tangan', 'Membuat PDF + QR verifikasi + hash', 'Mengarsipkan dokumen'];
  const CARA = { inspector: 'otomatis: inspector pada data', pencetak: 'otomatis: user yang mencetak', jabatan: 'otomatis: pejabat aktif sesuai jabatan', pilih: 'dipilih saat cetak', tetap: 'pejabat tetap' };

  function fieldHtml(b, v) {
    const id = 'dei_' + b.kunci, val = v === undefined || v === null ? '' : v;
    const lab = '<label for="' + id + '">' + h(b.label) + (b.wajib ? ' <span class="req">*</span>' : '') + '</label>';
    let inp;
    if (b.tipe === 'area' || b.tipe === 'naskah') inp = '<textarea class="input" id="' + id + '" rows="3">' + h(String(val).replace(/<[^>]+>/g, '')) + '</textarea>';
    else if (b.tipe === 'pilihan' && (b.opsi || []).length) inp = '<select class="select" id="' + id + '">' + UI.opts(b.opsi, val, '— pilih —') + '</select>';
    else inp = '<input class="input" id="' + id + '" type="' + ({ tanggal: 'date', angka: 'number' }[b.tipe] || 'text') + '" value="' + h(val) + '">';
    return '<div class="field ' + (b.tipe === 'area' || b.tipe === 'naskah' ? 'span2' : '') + '">' + lab + inp + (b.bantu ? '<span class="hint">' + h(b.bantu) + '</span>' : '') + '</div>';
  }
  function slotHtml(s, pj) {
    const opts = (s.cara === 'inspector' || s.cara === 'pencetak' ? '<option value="">' + h((s.nama || '(kosong)') + ' — ' + (s.cara === 'inspector' ? 'inspector' : 'pencetak')) + '</option>' : '<option value="">— pilih pejabat —</option>') +
      pj.map(p => '<option value="' + h(p.id) + '" ' + (p.id === s.pejabatId ? 'selected' : '') + '>' + h(p.nama + ' · ' + p.jabatan) + (p.spesimen ? ' ✍' : '') + '</option>').join('');
    const kosongJab = s.cara === 'jabatan' && !s.pejabatId;
    return '<div class="slot-card" data-slot="' + s.slot + '"><div class="slot-h"><b>' + h(s.label) + '</b><span class="xs muted">' + h(CARA[s.cara] || s.cara) + '</span></div>' +
      (s.bisaPilih ? '<select class="select" data-pj>' + opts + '</select>' : '<div class="slot-fixed">' + h(s.nama || '—') + '</div>') +
      '<div class="small t2" data-jab style="margin-top:6px">' + h(s.jabatan || '') + '</div>' +
      (kosongJab ? '<div class="xs" style="color:var(--warn);margin-top:4px">Belum ada pejabat aktif dengan jabatan "' + h(s.jabatan) + '". ' + (App.can(App.SAO) ? 'Tambahkan di menu Dokumen & Template › Pejabat.' : 'Hubungi Superadmin.') + '</div>' : '') +
      '<div class="seg" style="margin-top:8px" data-tanda><button type="button" data-t="kosong" class="' + (s.tanda !== 'spesimen' ? 'on' : '') + '">Ruang TTD basah</button><button type="button" data-t="spesimen" class="' + (s.tanda === 'spesimen' ? 'on' : '') + '">Spesimen TTD</button></div></div>';
  }

  async function open(kode, params, opts = {}) {
    const m = UI.modal({ title: icon('printer') + ' Cetak dokumen', size: 'lg',
      body: '<div class="skel" style="height:22px;width:55%"></div><div class="skel" style="margin-top:14px"></div><div class="skel" style="margin-top:10px;width:80%"></div><div class="grid g2" style="margin-top:18px;gap:12px"><div class="skel" style="height:90px"></div><div class="skel" style="height:90px"></div></div>',
      onClose: () => { if (m && m._url) URL.revokeObjectURL(m._url); } });
    const res = await API.call('doc.prepare', { kode, params: params || {} });
    if (!res.success) {
      m.body.innerHTML = '<div class="notice err">' + icon('alertc') + '<div><b>Dokumen belum bisa disiapkan.</b><br>' + h(res.message) + '</div></div><button class="btn btn-outline btn-sm" id="dpRetry">' + icon('refresh') + 'Coba lagi</button>';
      UI.$('#dpRetry', m.el).onclick = () => { m.close(); open(kode, params, opts); };
      return;
    }
    form(m, res.data, kode, params || {});
  }

  function form(m, d, kode, params) {
    const pj = d.pejabat || [], byId = {}; pj.forEach(p => { byId[p.id] = p; });
    const t = d.terakhir, sama = t && t.dataSama && t.versiSama;
    m.el.querySelector('.modal-h h3').innerHTML = icon('printer') + ' ' + h(d.nama);
    m.body.innerHTML =
      '<div class="dp-head"><div><div class="xs muted" style="letter-spacing:.06em;text-transform:uppercase">Dokumen dari template Google Docs · versi ' + h(d.versi) + '</div><div style="font-weight:700;font-size:16px;margin-top:2px">' + h(d.judul) + '</div>' +
      (d.baris ? '<div class="small muted">' + UI.num(d.baris) + ' baris tabel akan dicetak</div>' : '') + '</div><span class="badge b-info nc">' + icon('qr', 'sm') + ' QR verifikasi</span></div>' +
      (t ? '<div class="notice ' + (sama ? '' : 'warn') + '">' + icon(sama ? 'checkc' : 'history') + '<div style="flex:1">Sudah pernah diterbitkan: <b>No. ' + h(t.nomor) + '</b> · ' + UI.dt(t.terbit) + ' oleh ' + h(t.oleh) + '. ' +
        (sama ? 'Data & template belum berubah — unduh dokumen yang sama tanpa menambah nomor.' : 'Data atau template sudah berubah — mencetak akan menerbitkan nomor baru' + (d.perRecord ? ' dan dokumen lama otomatis berstatus <b>DITARIK</b> (QR lama menunjukkan penggantinya).' : '.')) +
        '<div style="margin-top:8px"><button class="btn btn-outline btn-sm" id="dpOld" data-busy="Mengunduh…">' + icon('download') + 'Unduh No. ' + h(t.nomor) + '</button></div></div></div>' : '') +
      (d.slot.length ? '<h3 class="sec-title" style="font-size:14px;margin:16px 0 8px">Penanda tangan <span class="small muted" style="font-weight:400">— nama & jabatan otomatis dari daftar pejabat</span></h3><div class="grid g' + Math.min(3, d.slot.length) + '" style="gap:12px">' + d.slot.map(s => slotHtml(s, pj)).join('') + '</div>' : '') +
      (d.bidang.length ? '<h3 class="sec-title" style="font-size:14px;margin:18px 0 8px">Isian tambahan <span class="small muted" style="font-weight:400">— kolom dari template (bisa ditambah admin di Google Docs)</span></h3><div class="form-grid">' + d.bidang.map(b => fieldHtml(b, (d.isianTerakhir || {})[b.kunci])).join('') + '</div>' : '') +
      '<div class="small muted" style="margin-top:16px">' + icon('shield', 'sm') + ' Nomor, tanggal, kode verifikasi & hash SHA-256 diisi server. Perkiraan waktu ±' + d.perkiraanDetik + ' detik.</div>';
    let foot = m.el.querySelector('.modal-f');
    if (!foot) { foot = document.createElement('div'); foot.className = 'modal-f'; m.el.appendChild(foot); }
    foot.innerHTML = '<button class="btn btn-ghost" data-c>Batal</button><button class="btn btn-primary" id="dpGo">' + icon('printer') + (sama ? 'Cetak (pakai dokumen yang sama)' : 'Cetak PDF') + '</button>';
    foot.querySelector('[data-c]').onclick = m.close;
    // interaksi slot: ganti pejabat → jabatan & ketersediaan spesimen
    UI.$$('.slot-card', m.body).forEach(card => {
      const s = d.slot.find(x => String(x.slot) === card.dataset.slot), sel = card.querySelector('[data-pj]');
      const upd = () => {
        const p = sel && sel.value ? byId[sel.value] : (s.pejabatId ? byId[s.pejabatId] : null);
        card.querySelector('[data-jab]').textContent = p ? p.jabatan : (sel && !sel.value && (s.cara === 'inspector' || s.cara === 'pencetak') ? s.jabatan : s.jabatan || '');
        const bisa = !!(p && p.spesimen), b2 = card.querySelector('[data-t="spesimen"]');
        b2.disabled = !bisa; b2.title = bisa ? '' : 'Pejabat ini belum punya spesimen TTD';
        if (!bisa && b2.classList.contains('on')) { b2.classList.remove('on'); card.querySelector('[data-t="kosong"]').classList.add('on'); }
      };
      if (sel) sel.onchange = upd;
      UI.$$('[data-tanda] button', card).forEach(b => b.onclick = () => { if (b.disabled) return; UI.$$('[data-tanda] button', card).forEach(x => x.classList.toggle('on', x === b)); });
      upd();
    });
    const old = UI.$('#dpOld', m.el);
    if (old) old.onclick = () => UI.busy(old, async () => { const r = await API.call('doc.download', { id: t.id }); if (r.success) hasil(m, r.data, kode, params, d); else UI.showResult(r); });
    UI.$('#dpGo', m.el).onclick = () => kirim(m, d, kode, params, false);
  }

  function kumpul(m, d) {
    const slot = UI.$$('.slot-card', m.body).map(card => {
      const sel = card.querySelector('[data-pj]'), on = card.querySelector('[data-tanda] .on');
      return { slot: +card.dataset.slot, pejabatId: sel ? sel.value : '', tanda: on ? on.dataset.t : 'kosong' };
    });
    const isian = {}, kurang = [];
    d.bidang.forEach(b => { const el = UI.$('#dei_' + b.kunci, m.body); if (!el) return; isian[b.kunci] = el.value.trim(); if (b.wajib && !isian[b.kunci]) kurang.push(b.label); });
    return { slot, isian, kurang };
  }

  async function kirim(m, d, kode, params, baru, prev) {
    const k = prev || kumpul(m, d);
    if (k.kurang.length) { UI.toast('Wajib diisi: ' + k.kurang.join(', '), 'error', 6000); return; }
    const foot = m.el.querySelector('.modal-f');
    const simpan = m.body.innerHTML;
    if (foot) foot.innerHTML = '<span class="small muted">Jangan tutup jendela ini…</span>';
    m.body.innerHTML = '<div class="dp-progress"><div class="dp-ring"><span class="spinner"></span></div><div style="flex:1"><b>Menerbitkan dokumen…</b><ol class="dp-steps">' + LANGKAH.map((x, i) => '<li data-i="' + i + '">' + h(x) + '</li>').join('') + '</ol>' +
      '<div class="bar"><i id="dpBar" style="width:4%"></i></div><div class="xs muted" id="dpEta">±' + d.perkiraanDetik + ' detik</div></div></div>';
    const t0 = Date.now(), dur = Math.max(4, d.perkiraanDetik) * 1000;
    const tick = setInterval(() => {
      const p = Math.min(0.95, (Date.now() - t0) / dur), idx = Math.min(LANGKAH.length - 1, Math.floor(p * LANGKAH.length));
      const bar = UI.$('#dpBar', m.el); if (!bar) return;
      bar.style.width = Math.round(p * 100) + '%';
      UI.$$('.dp-steps li', m.el).forEach((li, i) => { li.className = i < idx ? 'done' : i === idx ? 'on' : ''; });
      UI.$('#dpEta', m.el).textContent = Math.round((Date.now() - t0) / 1000) + ' detik berlalu';
    }, 250);
    const res = await API.call('doc.print', { kode, params, slot: k.slot, isian: k.isian, baru: !!baru }, { timeout: 240000, retries: 2 });
    clearInterval(tick);
    if (!m.el.isConnected) return;
    if (!res.success) {
      d.isianTerakhir = Object.assign({}, d.isianTerakhir, k.isian);      // isian user tidak hilang
      m.body.innerHTML = simpan;
      form(m, d, kode, params);
      UI.showResult(res);
      return;
    }
    hasil(m, res.data, kode, params, d, k, res.message);
    if (!res.data.reused) { API.invalidate(['doc.arsip']); }
  }

  function hasil(m, r, kode, params, d, k, pesan) {
    const doc = r.dokumen;
    if (m._url) URL.revokeObjectURL(m._url);
    const url = m._url = UI.pdfUrl(r.pdf);
    const namaFile = String(r.namaFile || 'dokumen.pdf').replace(/[^\w.()\- ]+/g, '-').replace(/\s*-\s*-+\s*/g, ' - ').replace(/\s+/g, ' ').trim();   // nama berkas aman untuk semua peramban
    const lebar = window.innerWidth >= 768;
    m.body.innerHTML =
      '<div class="dp-done"><span class="dp-ok">' + icon('checkc', 'lg') + '</span><div style="flex:1;min-width:0"><b style="font-size:16px">' + (r.reused ? 'Dokumen No. ' + h(doc.nomor) + ' (sudah terbit)' : 'Dokumen No. ' + h(doc.nomor) + ' terbit') + '</b>' +
      '<div class="small t2">' + h(doc.jenis) + ' · ' + UI.dt(doc.terbit) + ' · oleh ' + h(doc.oleh) + (r.diganti ? ' · menggantikan No. ' + h(r.diganti) : '') + '</div>' +
      (r.reused && r.alasan === 'sama' ? '<div class="xs muted" style="margin-top:2px">Data, isian & penanda tangan sama dengan terbitan sebelumnya — nomor tidak bertambah.</div>' : '') + '</div></div>' +
      '<div class="dp-meta"><div><div class="k">Kode verifikasi</div><div class="mono"><b>' + h(doc.kodeVerifikasi) + '</b></div></div>' +
      '<div style="min-width:0"><div class="k">Halaman verifikasi (isi QR)</div><div class="small ellip" style="max-width:100%"><a href="' + h(doc.url) + '" target="_blank" rel="noopener">' + h(doc.url || '—') + '</a></div></div>' +
      '<div><div class="k">SHA-256 PDF</div><div class="mono xs ellip" title="' + h(doc.hashPdf) + '">' + h(String(doc.hashPdf).substring(0, 24)) + '…</div></div></div>' +
      (lebar ? '<iframe class="pdf-frame" src="' + url + '#view=FitH" title="Pratinjau PDF"></iframe>' : '<div class="notice">' + icon('info') + '<div>Pratinjau tidak tersedia di layar kecil — gunakan tombol Buka / Unduh.</div></div>');
    let foot = m.el.querySelector('.modal-f');
    if (!foot) { foot = document.createElement('div'); foot.className = 'modal-f'; m.el.appendChild(foot); }
    foot.innerHTML = (r.reused && d ? '<button class="btn btn-ghost" id="dpNew" title="Terbitkan nomor baru walau data sama">' + icon('refresh') + 'Terbitkan ulang</button>' : '') +
      '<button class="btn btn-outline" id="dpCopy">' + icon('link') + 'Salin link verifikasi</button>' +
      '<a class="btn btn-outline" href="' + url + '" download="' + h(namaFile) + '">' + icon('download') + 'Unduh PDF</a>' +
      '<a class="btn btn-primary" href="' + url + '" target="_blank" rel="noopener" id="dpOpen">' + icon('printer') + 'Buka & Cetak</a>';
    UI.$('#dpCopy', m.el).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(doc.url || doc.kodeVerifikasi); UI.toast('Link verifikasi disalin.', 'info'); };
    const nb = UI.$('#dpNew', m.el);
    if (nb) nb.onclick = async () => {
      const ok = await UI.confirm({ title: 'Terbitkan nomor baru?', message: 'Dokumen akan diterbitkan ulang dengan nomor & kode verifikasi baru' + (d.perRecord ? '; dokumen No. ' + h(doc.nomor) + ' otomatis ditarik.' : '.'), okText: 'Terbitkan ulang' });
      if (ok) kirim(m, d, kode, params, true, k || { slot: [], isian: d.isianTerakhir || {}, kurang: [] });
    };
  }
  return { open };
})();

// ============================================================================
// HALAMAN PUBLIK VERIFIKASI — #/v/<kode>
// ============================================================================
window.Verifikasi = {
  async render(kode) {
    const { h, icon } = UI;
    document.title = 'Verifikasi Dokumen — Dashboard MRI';
    const app = document.getElementById('app');
    const kartu = (isi) => '<main class="verify-wrap"><div class="verify-card"><div class="verify-brand"><div class="brand-mark">M</div><div><b>Verifikasi Keaslian Dokumen</b><div class="xs muted">Dashboard MRI · Material Receiving Inspection</div></div></div>' + isi +
      '<div class="verify-foot"><a href="#/dashboard">' + icon('lock', 'sm') + ' Masuk ke aplikasi</a><span class="xs muted">Tanpa login · tidak menampilkan data pribadi</span></div></div></main>';
    const formKode = (msg) => '<form id="vfForm" style="margin-top:14px"><div class="field"><label for="vfKode">Kode verifikasi (20 karakter, tercetak di bawah QR)</label><input class="input mono" id="vfKode" maxlength="40" value="' + h(kode || '') + '" placeholder="mis. 7F3A9C0B12D45E6789AB" autocomplete="off"></div>' +
      (msg ? '<div class="notice err">' + icon('alertc') + '<div>' + h(msg) + '</div></div>' : '') + '<button class="btn btn-primary btn-block" type="submit" style="margin-top:12px">' + icon('search') + 'Periksa dokumen</button></form>';
    const bind = () => { const f = UI.$('#vfForm'); if (f) f.onsubmit = (e) => { e.preventDefault(); const v = UI.$('#vfKode').value.trim(); if (v) location.hash = '#/v/' + encodeURIComponent(v); }; };
    if (!kode) { app.innerHTML = kartu('<p class="t2" style="margin:12px 0 0">Pindai QR pada dokumen, atau ketik kode verifikasinya.</p>' + formKode()); bind(); return; }
    app.innerHTML = kartu('<div style="padding:28px 0;text-align:center"><span class="spinner"></span><div class="small muted" style="margin-top:10px">Memeriksa kode ' + h(kode) + '…</div></div>');
    const res = await API.call('verifikasiDokumen', { kode });
    if (!res.success) { app.innerHTML = kartu(formKode(res.message)); bind(); return; }
    const d = res.data;
    if (!d.ditemukan) {
      app.innerHTML = kartu('<div class="verify-status bad">' + icon('alertc', 'lg') + '<div><b>TIDAK TERDAFTAR</b><span>Kode <span class="mono">' + h(d.kode) + '</span> tidak ditemukan. Dokumen ini kemungkinan bukan terbitan resmi sistem.</span></div></div>' + formKode());
      bind(); return;
    }
    const sah = d.status === 'SAH';
    app.innerHTML = kartu(
      '<div class="verify-status ' + (sah ? 'ok' : 'bad') + '">' + icon(sah ? 'shield' : 'alertc', 'lg') + '<div><b>' + (sah ? 'DOKUMEN SAH' : 'DOKUMEN DITARIK') + '</b><span>' + (sah ? 'Terdaftar dan berlaku di ' + h(d.app) + '.' : h(d.catatan || 'Dokumen ini sudah tidak berlaku.')) + '</span></div></div>' +
      '<div class="verify-grid">' + [['Nomor', '<span class="mono">' + h(d.nomor) + '</span>'], ['Jenis dokumen', h(d.jenis)], ['Perihal', h(d.judul)], ['Diterbitkan', UI.dt(d.terbit) + (d.diterbitkanOleh ? ' oleh ' + h(d.diterbitkanOleh) : '')], ['Instansi', h(d.institusi || '—')], ['Kode verifikasi', '<span class="mono">' + h(d.kode) + '</span>']]
        .map(x => '<div><div class="k">' + x[0] + '</div><div class="v">' + x[1] + '</div></div>').join('') + '</div>' +
      (d.penandatangan.length ? '<h3 class="sec-title" style="font-size:14px;margin:16px 0 8px">Penanda tangan</h3><ul class="verify-ttd">' + d.penandatangan.map(p => '<li><span class="xs muted">' + h(p.label) + '</span><b>' + h(p.nama || '—') + '</b><span class="small t2">' + h(p.jabatan || '') + ' · ' + h(p.tanda) + '</span></li>').join('') + '</ul>' : '') +
      '<div class="verify-hash"><b class="small">Cek keaslian berkas PDF</b><div class="xs muted" style="margin:2px 0 8px">Pilih berkas PDF yang Anda terima — sidik jari SHA-256 dihitung di perangkat Anda (berkas tidak diunggah).</div>' +
      '<input type="file" id="vfPdf" accept="application/pdf,.pdf" class="input"><div id="vfHash"></div></div>');
    UI.$('#vfPdf').onchange = async (e) => {
      const f = e.target.files[0], box = UI.$('#vfHash'); if (!f) return;
      if (!window.crypto || !crypto.subtle) { box.innerHTML = '<div class="notice warn">' + icon('alert') + '<div>Peramban ini tidak mendukung perhitungan hash (butuh HTTPS).</div></div>'; return; }
      const buf = await f.arrayBuffer(), dig = await crypto.subtle.digest('SHA-256', buf);
      const hex = Array.from(new Uint8Array(dig)).map(b => b.toString(16).padStart(2, '0')).join('');
      const cocok = hex === String(d.hashPdf).toLowerCase();
      box.innerHTML = '<div class="notice ' + (cocok ? '' : 'err') + '">' + icon(cocok ? 'checkc' : 'alertc') + '<div><b>' + (cocok ? 'Cocok — berkas asli, tidak diubah sejak diterbitkan.' : 'Tidak cocok — berkas berbeda dari yang diterbitkan (diedit, dipindai ulang, atau dokumen lain).') + '</b><div class="mono xs" style="word-break:break-all;margin-top:4px">' + hex + '</div></div></div>';
    };
  }
};

// ============================================================================
// HALAMAN ADMIN — Dokumen & Template
// ============================================================================
function openPejabatForm(p, jabatan, onSaved) {
  const { h, icon } = UI;
  const isNew = !p, v = p || { aktif: true };
  let spes = null, hapusSpes = false;
  const m = UI.modal({ title: isNew ? 'Tambah Pejabat Penanda Tangan' : 'Edit Pejabat ' + h(v.nama), size: 'lg', body:
    '<div class="form-grid"><div class="field"><label for="pjNama">Nama lengkap <span class="req">*</span></label><input class="input" id="pjNama" value="' + h(v.nama || '') + '"></div>' +
    '<div class="field"><label for="pjGelar">Gelar (opsional)</label><input class="input" id="pjGelar" value="' + h(v.gelar || '') + '" placeholder="mis. S.T., M.M."></div>' +
    '<div class="field"><label for="pjJab">Jabatan <span class="req">*</span></label><input class="input" id="pjJab" list="pjDl" value="' + h(v.jabatan || '') + '"><datalist id="pjDl">' + jabatan.map(j => '<option value="' + h(j) + '">').join('') + '</datalist><span class="hint">Slot "otomatis sesuai jabatan" memilih pejabat aktif dengan jabatan ini.</span></div>' +
    '<div class="field"><label for="pjNip">NIP / NIK</label><input class="input" id="pjNip" value="' + h(v.nip || '') + '"></div>' +
    '<div class="field"><label for="pjEmail">Email (opsional)</label><input class="input" id="pjEmail" type="email" value="' + h(v.email || '') + '"><span class="hint">Bila sama dengan email user, slot "user yang mencetak" memakai jabatan ini.</span></div>' +
    '<div class="field"><label>Masa jabatan</label><div style="display:flex;gap:6px"><input class="input" id="pjMulai" type="date" value="' + h(v.mulai || '') + '" aria-label="Mulai"><input class="input" id="pjSelesai" type="date" value="' + h(v.selesai || '') + '" aria-label="Selesai"></div><span class="hint">Kosong = berlaku terus. Aman saat pergantian pejabat.</span></div>' +
    '<div class="field span2"><label>Spesimen tanda tangan (PNG/JPG, latar transparan disarankan, ≤ 1 MB)</label><div class="spes-box"><div id="pjPrev" class="spes-prev">' + (v.spesimen ? '<span class="small muted">Memuat spesimen…</span>' : '<span class="small muted">Belum ada spesimen</span>') + '</div>' +
    '<div style="display:flex;flex-direction:column;gap:6px"><input type="file" id="pjFile" accept="image/png,image/jpeg" class="input">' + (v.spesimen ? '<button type="button" class="btn btn-ghost btn-sm" id="pjDelSpes">' + icon('trash') + 'Hapus spesimen</button>' : '') + '</div></div>' +
    '<span class="hint">Disimpan di folder Drive privat; hanya server yang menyisipkannya ke dokumen saat dipilih "Spesimen TTD".</span></div>' +
    '<label class="check span2"><input type="checkbox" id="pjAktif" ' + (v.aktif !== false ? 'checked' : '') + '> Aktif</label></div>',
    footer: '<button class="btn btn-ghost" data-c>Batal</button><button class="btn btn-primary" id="pjSave" data-busy="Menyimpan…">' + icon('check') + 'Simpan</button>' });
  m.el.querySelector('[data-c]').onclick = m.close;
  if (v.spesimen && v.id) API.call('doc.pejabat', { preview: v.id }, { silent: true }).then(r => { const b = UI.$('#pjPrev', m.el); if (b && r.success && r.data.preview) b.innerHTML = '<img src="' + r.data.preview + '" alt="Spesimen TTD">'; });
  UI.$('#pjFile', m.el).onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 1024 * 1024) { UI.toast('Ukuran spesimen maksimal 1 MB.', 'error'); e.target.value = ''; return; }
    const rd = new FileReader();
    rd.onload = () => { spes = { b64: String(rd.result).split(',')[1], mime: f.type }; hapusSpes = false; UI.$('#pjPrev', m.el).innerHTML = '<img src="' + rd.result + '" alt="Spesimen baru">'; };
    rd.readAsDataURL(f);
  };
  const ds = UI.$('#pjDelSpes', m.el); if (ds) ds.onclick = () => { hapusSpes = true; spes = null; UI.$('#pjPrev', m.el).innerHTML = '<span class="small" style="color:var(--err)">Spesimen akan dihapus saat disimpan</span>'; };
  UI.$('#pjSave', m.el).onclick = () => UI.busy(UI.$('#pjSave', m.el), async () => {
    const o = { id: v.id || '', nama: UI.$('#pjNama').value.trim(), gelar: UI.$('#pjGelar').value.trim(), jabatan: UI.$('#pjJab').value.trim(), nip: UI.$('#pjNip').value.trim(), email: UI.$('#pjEmail').value.trim(),
      mulai: UI.$('#pjMulai').value, selesai: UI.$('#pjSelesai').value, aktif: UI.$('#pjAktif').checked, spesimen: spes, hapusSpesimen: hapusSpes };
    if (!o.nama || !o.jabatan) { UI.toast('Nama dan jabatan wajib diisi.', 'error'); return; }
    const res = await API.call('doc.pejabatSave', { pejabat: o });
    if (UI.showResult(res)) { m.close(); onSaved && onSaved(); }
  });
}

function contohNomor(fmt, kode) {
  const d = new Date(Date.now() + 7 * 3600000), th = d.getUTCFullYear(), bl = d.getUTCMonth() + 1;
  const R = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return String(fmt || '').replace(/\{URUT4\}/g, '0001').replace(/\{URUT\}/g, '001').replace(/\{KODE\}/g, kode).replace(/\{BULAN\}/g, R[bl - 1]).replace(/\{BLN\}/g, String(bl).padStart(2, '0')).replace(/\{TAHUN\}/g, th).replace(/\{TH\}/g, String(th).slice(-2));
}
function openTemplateSettings(t, meta, onSaved) {
  const { h, icon } = UI;
  const CARA = [['inspector', 'Otomatis: inspector pada data'], ['pencetak', 'Otomatis: user yang mencetak'], ['jabatan', 'Otomatis: pejabat sesuai jabatan'], ['pilih', 'Dipilih saat cetak'], ['tetap', 'Pejabat tetap']];
  const kustom = t.bidang.filter(b => !b.otomatis && b.tipe !== 'daftar' && b.tipe !== 'data');
  const m = UI.modal({ title: icon('sliders') + ' Atur template — ' + h(t.nama), size: 'lg', body:
    '<div class="form-grid"><div class="field"><label for="tsNama">Nama dokumen</label><input class="input" id="tsNama" value="' + h(t.nama) + '"></div>' +
    '<div class="field"><label for="tsNo">Format nomor</label><input class="input mono" id="tsNo" value="' + h(t.nomorFormat) + '"><span class="hint">Token: {URUT} {URUT4} {KODE} {BULAN} (romawi) {BLN} {TAHUN} {TH} · contoh: <b id="tsNoEx">' + h(contohNomor(t.nomorFormat, t.kode)) + '</b> · urut reset tiap tahun</span></div>' +
    '<label class="switch span2"><input type="checkbox" id="tsAktif" ' + (t.aktif ? 'checked' : '') + '><span class="tr"></span>Template aktif (bisa dicetak user)</label></div>' +
    (t.slot.length ? '<h3 class="sec-title" style="font-size:14px;margin:18px 0 8px">Penanda tangan (slot {{TTD_n}} di template)</h3><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Slot</th><th>Label</th><th>Cara mengisi</th><th>Jabatan</th><th>Pejabat (tetap/bawaan)</th><th>Tanda</th></tr></thead><tbody>' +
      t.slot.map(s => '<tr data-sl="' + s.slot + '"><td class="num">' + s.slot + '</td><td><input class="input" data-k="label" value="' + h(s.label) + '"></td><td><select class="select" data-k="cara">' + UI.opts(CARA.map(c => ({ value: c[0], label: c[1] })), s.cara) + '</select></td>' +
        '<td><input class="input" data-k="jabatan" list="tsJab" value="' + h(s.jabatan || '') + '"></td><td><select class="select" data-k="pejabatId">' + UI.opts(meta.pejabat.map(p => ({ value: p.id, label: p.nama + ' · ' + p.jabatan })), s.pejabatId, '—') + '</select></td>' +
        '<td><select class="select" data-k="tanda">' + UI.opts([{ value: 'kosong', label: 'Ruang TTD basah' }, { value: 'spesimen', label: 'Spesimen (bila ada)' }], s.tanda) + '</select></td></tr>').join('') +
      '</tbody></table></div><datalist id="tsJab">' + meta.jabatan.map(j => '<option value="' + h(j) + '">').join('') + '</datalist>' : '<div class="notice warn">' + icon('alert') + '<div>Template ini belum punya slot tanda tangan ({{NAMA_PEJABAT_1}}, {{TTD_1}}, …).</div></div>') +
    (kustom.length ? '<h3 class="sec-title" style="font-size:14px;margin:18px 0 8px">Kolom isian saat cetak</h3><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Placeholder</th><th>Label</th><th>Tipe</th><th class="c">Wajib</th><th>Opsi (pilihan, pisah koma)</th></tr></thead><tbody>' +
      kustom.map(b => '<tr data-bk="' + h(b.kunci) + '"><td class="mono small">{{' + h(b.kunci) + '}}</td><td><input class="input" data-k="label" value="' + h(b.label) + '"></td><td><select class="select" data-k="tipe">' + UI.opts(['teks', 'area', 'tanggal', 'angka', 'pilihan'], b.tipe) + '</select></td>' +
        '<td class="c"><input type="checkbox" data-k="wajib" ' + (b.wajib ? 'checked' : '') + '></td><td><input class="input" data-k="opsi" value="' + h((b.opsi || []).join(', ')) + '"></td></tr>').join('') + '</tbody></table></div>' : '') +
    '<h3 class="sec-title" style="font-size:14px;margin:18px 0 8px">Ganti berkas template</h3><div class="field"><input class="input" id="tsFile" placeholder="Tempel URL Google Docs lain (opsional) — dipindai otomatis"><span class="hint">Berkas harus Google Docs dan bisa dibuka akun pemilik Apps Script.</span></div>',
    footer: '<button class="btn btn-ghost" data-c>Batal</button><button class="btn btn-primary" id="tsSave" data-busy="Menyimpan…">' + icon('check') + 'Simpan</button>' });
  m.el.querySelector('[data-c]').onclick = m.close;
  UI.$('#tsNo', m.el).oninput = () => { UI.$('#tsNoEx', m.el).textContent = contohNomor(UI.$('#tsNo', m.el).value, t.kode); };
  UI.$('#tsSave', m.el).onclick = () => UI.busy(UI.$('#tsSave', m.el), async () => {
    const slot = UI.$$('tr[data-sl]', m.el).map(tr => { const o = { slot: +tr.dataset.sl }; UI.$$('[data-k]', tr).forEach(x => { o[x.dataset.k] = x.value; }); return o; });
    const bidang = UI.$$('tr[data-bk]', m.el).map(tr => { const o = { kunci: tr.dataset.bk }; UI.$$('[data-k]', tr).forEach(x => { o[x.dataset.k] = x.type === 'checkbox' ? x.checked : x.value; }); o.opsi = String(o.opsi || '').split(',').map(s => s.trim()).filter(Boolean); return o; });
    const body = { kode: t.kode, nama: UI.$('#tsNama', m.el).value, nomorFormat: UI.$('#tsNo', m.el).value, aktif: UI.$('#tsAktif', m.el).checked, slot, bidang };
    const f = UI.$('#tsFile', m.el).value.trim(); if (f) body.fileUrl = f;
    const res = await API.call('doc.templateSave', body, { timeout: 120000 });
    if (UI.showResult(res)) { m.close(); onSaved && onSaved(); }
  });
}
function openKamus(t, kamus) {
  const { h, icon } = UI;
  const grup = (judul, obj, pre) => '<h3 class="sec-title" style="font-size:13.5px;margin:16px 0 6px">' + judul + '</h3><div class="kamus">' + Object.keys(obj).map(k => '<button type="button" class="kamus-i" data-copy="' + h(pre ? pre(k) : '{{' + k + '}}') + '"><span class="mono">' + h(pre ? pre(k) : '{{' + k + '}}') + '</span><span class="xs muted">' + h(obj[k]) + '</span></button>').join('') + '</div>';
  const m = UI.modal({ title: icon('file') + ' Kamus placeholder — ' + h(t.nama), size: 'lg', body:
    '<div class="notice">' + icon('info') + '<div>Klik untuk menyalin, lalu tempel di template Google Docs. Teks pengganti mengikuti <b>huruf, ukuran, tebal & warna</b> placeholder. Simpan dokumen → sistem memindai ulang otomatis saat cetak berikutnya (atau klik <b>Pindai ulang</b>).</div></div>' +
    grup('Data otomatis dari sistem', t.kamus.data) +
    t.kamus.blok.map(b => '<h3 class="sec-title" style="font-size:13.5px;margin:16px 0 6px">Tabel berulang: ' + h(b.label) + '</h3><p class="xs t2" style="margin:0 0 6px">Taruh <span class="mono">{{#' + h(b.kunci) + '}}</span> di salah satu sel baris tabel → baris itu digandakan per item. Bungkus bagian dengan <span class="mono">{{?' + h(b.kunci) + '}}</span> … <span class="mono">{{/' + h(b.kunci) + '}}</span> agar hilang bila kosong.</p>' +
      '<div class="kamus">' + ['{{#' + b.kunci + '}}', '{{NO}}'].concat(Object.keys(b.kolom).map(k => '{{' + b.kunci + '.' + k + '}}')).map((k, i) => '<button type="button" class="kamus-i" data-copy="' + h(k) + '"><span class="mono">' + h(k) + '</span><span class="xs muted">' + h(i === 0 ? 'penanda baris berulang' : i === 1 ? 'nomor urut' : b.kolom[k.replace(/^\{\{[^.]+\.|\}\}$/g, '')]) + '</span></button>').join('') + '</div>').join('') +
    grup('Sistem', kamus.sistem) + grup('Institusi', kamus.institusi) + grup('Verifikasi', kamus.verifikasi) + grup('Penanda tangan (ganti 1 dengan nomor slot)', kamus.pejabat) +
    grup('Pengubah (contoh pada {{TANGGAL}})', kamus.pengubah, (k) => '{{KUNCI|' + k + '}}') +
    '<p class="xs t2" style="margin-top:14px">Placeholder lain yang Anda tulis (mis. <span class="mono">{{CATATAN_QC}}</span>) otomatis menjadi kolom isian saat cetak. Awalan <span class="mono">TGL_</span> → input tanggal; kata ALAMAT/CATATAN/TINDAKAN → kotak teks panjang.</p>' });
  UI.$$('[data-copy]', m.el).forEach(b => b.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy); UI.toast(b.dataset.copy + ' disalin.', 'info', 2000); });
}

Pages.dokumen = {
  crumb: 'Dokumen & Template', group: 'Settings',
  prefetch: () => ({ action: 'doc.arsip', data: { q: '', kode: '', status: '', page: 1, per: 20 } }),
  async render(el, r, ctx) {
    const { h, icon, num, $ } = UI;
    const isSA = App.can(App.SAO);
    const tab = ['arsip', 'template', 'pejabat'].indexOf(r.q.tab) > -1 ? r.q.tab : (Pages.dokumen._tab || 'arsip');
    Pages.dokumen._tab = tab;
    el.innerHTML =
      '<div class="ph"><div class="ph-title"><div class="eyebrow"><span class="hl">● Mesin Dokumen</span><span>• template Google Docs · QR verifikasi · arsip</span></div><h1>Dokumen & Template</h1>' +
      '<p>Semua cetak dokumen sistem (MRIR, NCR, NCR/SLA/Executive Summary, Rekap Training) memakai template Google Docs yang bisa diedit bebas, bernomor otomatis, ber-QR, dan tercatat di arsip.</p></div></div>' +
      '<div class="tabs mb" id="dkTabs" role="tablist">' + [['arsip', 'Arsip Dokumen', 'archive'], ['template', 'Template', 'file'], ['pejabat', 'Pejabat Penanda Tangan', 'users']].map(t => '<button class="tab ' + (tab === t[0] ? 'on' : '') + '" data-t="' + t[0] + '" role="tab">' + icon(t[2], 'sm') + t[1] + '</button>').join('') + '</div>' +
      '<div id="dkBody"></div>';
    UI.$$('#dkTabs [data-t]').forEach(b => b.onclick = () => { Pages.dokumen._tab = b.dataset.t; history.replaceState(null, '', '#/dokumen?tab=' + b.dataset.t); App.go(); });
    const body = $('#dkBody');
    if (tab === 'arsip') return this.arsip(body, ctx, isSA);
    if (tab === 'template') return this.template(body, ctx, isSA);
    return this.pejabat(body, ctx, isSA);
  },

  async arsip(body, ctx, isSA) {
    const { h, icon, num, $ } = UI;
    const st = Object.assign({ q: '', kode: '', status: '', page: 1, per: 20 }, Pages.dokumen._ast || {}); Pages.dokumen._ast = st;
    body.innerHTML = '<div class="grid g4 mb" id="arKpi">' + Array.from({ length: 4 }, () => '<div class="kpi plain compact"><div class="skel" style="width:50%"></div><div class="skel" style="height:28px;margin-top:10px;width:40%"></div></div>').join('') + '</div>' +
      '<div class="card mb pad-s"><div class="filterbar"><div class="grow input-icon">' + icon('search') + '<input class="input soft" id="arQ" placeholder="Cari nomor, judul, kode verifikasi, ref…" value="' + h(st.q) + '"></div>' +
      '<select class="select soft" id="arKode" aria-label="Jenis"></select><select class="select soft" id="arSt" aria-label="Status">' + UI.opts([{ value: 'TERBIT', label: 'Terbit (sah)' }, { value: 'DITARIK', label: 'Ditarik' }], st.status, 'Semua status') + '</select></div></div>' +
      '<div class="card flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nomor</th><th>Jenis</th><th>Perihal</th><th>Terbit</th><th>Oleh</th><th>Status</th><th>Kode verifikasi</th><th class="r">Aksi</th></tr></thead><tbody id="arBody">' + UI.skelRows(6, 8) + '</tbody></table></div><div id="arPager"></div></div>';
    let data = null;
    const draw = (d) => {
      if (!ctx.isCurrent()) return;
      data = d; const k = d.kpi;
      $('#arKpi').innerHTML = [['Total dokumen', k.total, 'archive', ''], ['Terbit (sah)', k.terbit, 'shield', 'ok'], ['Ditarik / diganti', k.ditarik, 'alertc', 'err'], ['Terbit bulan ini', k.bulanIni, 'calendar', '']]
        .map(x => '<div class="kpi plain compact"><div class="kpi-top"><span class="kpi-label">' + x[0] + '</span><span class="kpi-ico ' + x[3] + '">' + icon(x[2]) + '</span></div><div class="kpi-val">' + num(x[1]) + '</div></div>').join('');
      $('#arKode').innerHTML = UI.opts(d.jenis.map(j => ({ value: j.kode, label: j.nama })), st.kode, 'Semua jenis');
      $('#arBody').innerHTML = d.rows.length ? d.rows.map(x => '<tr class="' + (x.status === 'DITARIK' ? 'dim' : '') + '" data-id="' + h(x.id) + '"><td class="mono nw"><b>' + h(x.nomor) + '</b></td><td class="small">' + h(x.jenis) + '</td>' +
        '<td><div class="cell-2 ellip" style="max-width:280px" title="' + h(x.judul) + '">' + h(x.judul) + (x.catatan ? '<div class="s ellip" title="' + h(x.catatan) + '">' + h(x.catatan) + '</div>' : '') + '</div></td>' +
        '<td class="nw small">' + UI.dt(x.terbit) + '</td><td class="small">' + h(x.oleh) + '</td><td><span class="badge ' + (x.status === 'TERBIT' ? 'b-ok' : 'b-err') + '">' + (x.status === 'TERBIT' ? 'SAH' : 'DITARIK') + '</span></td>' +
        '<td class="mono small"><a href="' + h(x.url) + '" target="_blank" rel="noopener" title="Buka halaman verifikasi">' + h(x.kodeVerifikasi) + '</a></td>' +
        '<td class="r nw"><button class="icon-btn" data-dl title="Unduh PDF" aria-label="Unduh">' + icon('download') + '</button><button class="icon-btn" data-cp title="Salin link verifikasi" aria-label="Salin link">' + icon('link') + '</button>' +
        (isSA && x.status === 'TERBIT' ? '<button class="icon-btn" data-tarik title="Tarik dokumen" aria-label="Tarik" style="color:var(--err)">' + icon('x') + '</button>' : '') + '</td></tr>').join('') :
        '<tr><td colspan="8">' + UI.empty('Belum ada dokumen tercetak. Cetak dari Data Inspeksi, Laporan Finding, Laporan Customer/Periode, atau Training.', 'printer') + '</td></tr>';
      const pg = $('#arPager'); pg.innerHTML = ''; pg.appendChild(UI.pager(d, (p, per) => { st.page = p; st.per = per; load(); }, { perOptions: [20, 50, 100], noun: 'dokumen' }));
    };
    $('#arBody').addEventListener('click', async (e) => {
      const tr = e.target.closest('tr[data-id]'); if (!tr || !data) return;
      const x = data.rows.find(y => y.id === tr.dataset.id);
      if (e.target.closest('[data-cp]')) { navigator.clipboard && navigator.clipboard.writeText(x.url); UI.toast('Link verifikasi disalin.', 'info'); }
      if (e.target.closest('[data-dl]')) {
        const b = e.target.closest('[data-dl]'); b.disabled = true;
        const res = await API.call('doc.download', { id: x.id }); b.disabled = false;
        if (!res.success) { UI.showResult(res); return; }
        const a = document.createElement('a'); a.href = UI.pdfUrl(res.data.pdf); a.download = String(res.data.namaFile).replace(/[^\w.()\- ]+/g, '-'); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      }
      if (e.target.closest('[data-tarik]')) {
        const alasan = await UI.confirm({ title: 'Tarik dokumen No. ' + x.nomor + '?', danger: true, okText: 'Tarik dokumen', input: true, inputLabel: 'Alasan penarikan', message: 'Dokumen tetap tersimpan di arsip, tetapi halaman verifikasi QR akan menampilkan status <b>DITARIK</b> beserta alasannya.' });
        if (!alasan) return;
        const res = await API.call('doc.tarik', { id: x.id, alasan });
        if (UI.showResult(res)) { API.invalidate(['doc.arsip']); load(); }
      }
    });
    const load = async () => { try { await API.swr('doc.arsip', { q: st.q, kode: st.kode, status: st.status, page: st.page, per: st.per }, draw); } catch (e) { UI.showResult(e); } };
    $('#arQ').addEventListener('input', UI.debounce(() => { st.q = $('#arQ').value.trim(); st.page = 1; load(); }));
    $('#arKode').onchange = () => { st.kode = $('#arKode').value; st.page = 1; load(); };
    $('#arSt').onchange = () => { st.status = $('#arSt').value; st.page = 1; load(); };
    await load();
  },

  async template(body, ctx, isSA) {
    const { h, icon, num, $ } = UI;
    body.innerHTML = '<div id="tpNote"></div><div class="grid g2" id="tpGrid">' + Array.from({ length: 4 }, () => '<div class="card"><div class="skel" style="width:60%"></div><div class="skel" style="margin-top:12px"></div><div class="skel" style="margin-top:8px;width:80%"></div></div>').join('') + '</div>';
    let meta = null;
    const reload = () => { API.invalidate(['doc.templates']); load(); };
    const draw = (d) => {
      if (!ctx.isCurrent()) return;
      meta = d;
      $('#tpNote').innerHTML = (!d.appUrl ? '<div class="notice warn" style="margin-top:0">' + icon('alert') + '<div><b>APP_URL belum terisi</b> — QR akan menunjuk alamat Apps Script. Login sebagai Admin/Superadmin dari alamat GitHub Pages untuk mengisinya otomatis.</div></div>' : '') +
        (!d.alamat ? '<div class="notice" style="margin-top:0">' + icon('info') + '<div>Alamat kop dokumen (<span class="mono">INSTITUSI_ALAMAT</span>) bisa diisi di System Config. Logo perusahaan cukup ditempel langsung di header template Google Docs.</div></div>' : '') +
        (isSA ? '<div class="notice" style="margin-top:0">' + icon('file') + '<div style="flex:1"><b>Cara mengubah desain dokumen:</b> klik <b>Edit di Google Docs</b> → ubah teks, tata letak, logo, tabel → simpan. Placeholder <span class="mono">{{…}}</span> boleh dipindah/dihapus/ditambah; sistem memindai ulang otomatis saat cetak berikutnya.' +
          (d.folderUrl ? ' <a href="' + h(d.folderUrl) + '" target="_blank" rel="noopener">Buka folder template ↗</a>' : '') + '</div></div>' : '');
      $('#tpGrid').innerHTML = d.templates.map(t => '<section class="card tpl-card" data-k="' + t.kode + '"><div class="card-h"><div><h2 class="sec-title">' + h(t.nama) + '</h2><div class="sec-sub">' + h(t.modul) + ' · kode <span class="mono">' + t.kode + '</span></div></div>' +
        (t.ada ? '<span class="badge ' + (t.aktif ? 'b-ok' : 'b-pend') + '">' + (t.aktif ? 'Aktif' : 'Nonaktif') + ' · v' + t.versi + '</span>' : '<span class="badge b-warn">Belum dibuat</span>') + '</div>' +
        '<div class="kv-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="kv-box"><div class="k">Nomor berikut</div><div class="v mono small">' + h(t.nomorContoh) + '</div></div>' +
        '<div class="kv-box"><div class="k">Dokumen terbit</div><div class="v">' + num(t.jumlahDokumen) + '</div></div><div class="kv-box"><div class="k">Placeholder</div><div class="v">' + num(t.penanda) + '</div></div></div>' +
        '<div class="small t2" style="margin-top:10px">' + (t.slot.length ? icon('pen', 'sm') + ' ' + t.slot.map(s => '<b>' + h(s.label) + '</b> (' + h(s.cara === 'jabatan' ? s.jabatan : s.cara) + ')').join(' · ') : '<span class="muted">Tanpa slot tanda tangan</span>') + '</div>' +
        (t.bidang.filter(b => !b.otomatis && b.tipe !== 'daftar').length ? '<div class="small t2" style="margin-top:4px">' + icon('edit', 'sm') + ' Isian saat cetak: ' + t.bidang.filter(b => !b.otomatis && b.tipe !== 'daftar').map(b => h(b.label) + (b.wajib ? '*' : '')).join(', ') + '</div>' : '') +
        (t.hilang && t.hilang.length ? '<div class="xs" style="color:var(--warn);margin-top:6px">Kolom tidak lagi ada di template: ' + t.hilang.map(h).join(', ') + '</div>' : '') +
        '<div class="card-f tpl-act">' + (isSA && t.editUrl ? '<a class="btn btn-primary btn-sm" href="' + h(t.editUrl) + '" target="_blank" rel="noopener">' + icon('edit', 'sm') + 'Edit di Google Docs</a><button class="btn btn-ghost btn-sm" data-a="akses" title="Bagikan akses edit template ke email Anda">' + icon('key', 'sm') + 'Akses edit saya</button>' : '') +
        (isSA && t.ada ? '<button class="btn btn-outline btn-sm" data-a="scan" data-busy="Memindai…">' + icon('refresh', 'sm') + 'Pindai ulang</button><button class="btn btn-outline btn-sm" data-a="atur">' + icon('sliders', 'sm') + 'Atur</button>' : '') +
        '<button class="btn btn-ghost btn-sm" data-a="kamus">' + icon('file', 'sm') + 'Kamus placeholder</button>' +
        (isSA ? '<button class="btn btn-ghost btn-sm" data-a="reset" data-busy="Membuat…" style="color:var(--err)">' + icon(t.ada ? 'history' : 'plus', 'sm') + (t.ada ? 'Reset ke bawaan' : 'Buat template') + '</button>' : '') + '</div></section>').join('');
    };
    $('#tpGrid').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-a]'); if (!b || !meta) return;
      const t = meta.templates.find(x => x.kode === b.closest('[data-k]').dataset.k);
      if (b.dataset.a === 'kamus') return openKamus(t, meta.kamus);
      if (b.dataset.a === 'atur') return openTemplateSettings(t, meta, reload);
      if (b.dataset.a === 'akses') return UI.busy(b, async () => { const res = await API.call('doc.templateSave', { kode: t.kode, op: 'akses' }); if (UI.showResult(res)) window.open(res.data.editUrl, '_blank', 'noopener'); });
      if (b.dataset.a === 'scan') return UI.busy(b, async () => { const res = await API.call('doc.rescan', { kode: t.kode }, { timeout: 120000 }); if (UI.showResult(res)) reload(); });
      if (b.dataset.a === 'reset') {
        if (t.ada && !(await UI.confirm({ title: 'Reset template ' + t.nama + '?', danger: true, okText: 'Reset ke bawaan', message: 'Template bawaan baru dibuat. Berkas lama <b>tidak dihapus</b> — dipindah ke folder Versi. Dokumen yang sudah terbit tidak berubah.' }))) return;
        return UI.busy(b, async () => { const res = await API.call('doc.resetTemplate', { kode: t.kode }, { timeout: 180000 }); if (UI.showResult(res)) reload(); });
      }
    });
    const load = async () => { try { await API.swr('doc.templates', {}, draw); } catch (e) { UI.showResult(e); } };
    await load();
  },

  async pejabat(body, ctx, isSA) {
    const { h, icon } = UI;
    body.innerHTML = '<div class="card flush"><div class="pad card-h" style="margin:0"><div><h2 class="sec-title">' + icon('users') + 'Pejabat Penanda Tangan</h2><div class="sec-sub">Nama & jabatan otomatis masuk ke dokumen sesuai pengaturan slot tiap template. Spesimen TTD opsional.</div></div>' +
      (isSA ? '<button class="btn btn-primary btn-sm" id="pjAdd">' + icon('plus') + 'Tambah pejabat</button>' : '') + '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Jabatan</th><th>NIP/NIK</th><th>Email</th><th>Masa jabatan</th><th class="c">Spesimen</th><th>Status</th>' + (isSA ? '<th class="r">Aksi</th>' : '') + '</tr></thead><tbody id="pjBody">' + UI.skelRows(4, 8) + '</tbody></table></div></div>';
    let data = null;
    const reload = () => { API.invalidate(['doc.pejabat', 'doc.templates']); load(); };
    const draw = (d) => {
      if (!ctx.isCurrent()) return;
      data = d;
      UI.$('#pjBody').innerHTML = d.rows.length ? d.rows.map(p => '<tr class="' + (p.aktif ? '' : 'dim') + '" data-id="' + h(p.id) + '"><td><b>' + h(p.nama) + '</b>' + (p.gelar ? '<span class="muted">, ' + h(p.gelar) + '</span>' : '') + '</td><td>' + h(p.jabatan) + '</td><td class="mono small">' + h(p.nip || '—') + '</td>' +
        '<td class="small">' + h(p.email || '—') + '</td><td class="small nw">' + (p.mulai || p.selesai ? UI.date(p.mulai) + ' – ' + (p.selesai ? UI.date(p.selesai) : 'sekarang') : '<span class="muted">tanpa batas</span>') + '</td>' +
        '<td class="c">' + (p.spesimen ? '<span style="color:var(--ok)">✍ ada</span>' : '<span class="muted">—</span>') + '</td><td><span class="badge ' + (p.aktif ? 'b-ok' : 'b-pend') + '">' + (p.aktif ? 'Aktif' : 'Nonaktif') + '</span></td>' +
        (isSA ? '<td class="r nw"><button class="icon-btn" data-ed title="Edit" aria-label="Edit">' + icon('edit') + '</button>' + (p.aktif ? '<button class="icon-btn" data-off title="Nonaktifkan" aria-label="Nonaktifkan" style="color:var(--err)">' + icon('x') + '</button>' : '') + '</td>' : '') + '</tr>').join('') :
        '<tr><td colspan="8">' + UI.empty('Belum ada pejabat. Tambahkan QC Supervisor / QC Manager agar nama & jabatan otomatis tercetak.', 'users') + '</td></tr>';
    };
    UI.$('#pjBody').addEventListener('click', async (e) => {
      const tr = e.target.closest('tr[data-id]'); if (!tr || !data) return;
      const p = data.rows.find(x => x.id === tr.dataset.id);
      if (e.target.closest('[data-ed]')) openPejabatForm(p, data.jabatan, reload);
      if (e.target.closest('[data-off]')) {
        if (!(await UI.confirm({ title: 'Nonaktifkan ' + p.nama + '?', message: 'Pejabat tidak lagi dipilih otomatis. Dokumen yang sudah terbit tetap utuh.', okText: 'Nonaktifkan', danger: true }))) return;
        const res = await API.call('doc.pejabatSave', { op: 'hapus', pejabat: { id: p.id } });
        if (UI.showResult(res)) reload();
      }
    });
    if (isSA) UI.$('#pjAdd').onclick = () => openPejabatForm(null, (data && data.jabatan) || ['QC Inspector', 'QC Supervisor', 'QC Manager'], reload);
    const load = async () => { try { await API.swr('doc.pejabat', {}, draw); } catch (e) { UI.showResult(e); } };
    await load();
  }
};
