/**
 * pages-master.js — Master Data (v2.6) · Superadmin & Admin
 * Daftar PIC Unit, Status Finding, Subject, Type PO, Material Type — tambah, ubah nama (ikut ke data),
 * urutkan, hapus, ambil dari nilai yang ada di file Excel; pemetaan kode inspector → nama.
 */
Pages.master = {
  crumb: 'Master Data', group: 'Settings',
  prefetch: () => ({ action: 'master.get', data: {} }),
  async render(el, r, ctx) {
    const { h, icon, num, $ } = UI;
    el.innerHTML =
      '<div class="ph"><div class="ph-title"><div class="eyebrow"><span>Settings module / Master Data</span></div><h1>Master Data</h1>' +
      '<p>Daftar pilihan yang dipakai di form, filter, tab status, dan statistik — bisa ditambah & diubah Superadmin dan Admin. Nilai yang sudah ada di file Excel ditampilkan sebagai saran.</p></div></div>' +
      '<div id="mdBody"><div class="card"><div class="skel" style="height:24px;width:40%"></div><div class="skel" style="margin-top:14px"></div></div></div>';
    const state = {};
    const draw = (d) => {
      if (!ctx.isCurrent()) return;
      const body = $('#mdBody');
      const order = ['PIC_UNITS', 'FINDING_STATUS', 'TYPE_PO', 'FINDING_SUBJECTS', 'MATERIAL_TYPES'];
      const lists = order.map(k => d.lists.find(l => l.key === k)).filter(Boolean);
      body.innerHTML =
        '<div class="md-nav">' + lists.map(l => '<a href="#md-' + l.key + '" data-jump="' + l.key + '">' + h(l.label) + ' <span class="n">' + l.items.length + '</span></a>').join('') +
        '<a href="#md-insp" data-jump="insp">Kode Inspector <span class="n">' + d.inspektor.alias.length + '</span></a><a href="#md-st" data-jump="st">Status Inspeksi</a></div>' +
        '<div class="grid g2">' + lists.map(l => '<section class="card md-card" id="md-' + l.key + '" data-key="' + l.key + '"></section>').join('') + '</div>' +
        '<section class="card mt" id="md-insp"></section>' +
        '<section class="card mt" id="md-st"><div class="card-h"><div><h2 class="sec-title">' + icon('lock') + 'Status Inspeksi (tetap)</h2><div class="sec-sub">Mengikuti kolom TEXT AFTER pada file Excel — tidak dapat diubah karena dipakai perhitungan Pass Rate & laporan.</div></div></div>' +
        '<div class="grid g3">' + d.statusInspeksi.map(s => '<div class="kv-box"><div class="k">' + UI.mriBadge(s.nama) + '</div><div class="v">' + num(s.dipakai) + ' <span class="small muted">record</span></div><div class="xs muted" style="margin-top:4px">' +
          ({ Inspected: 'Sudah diinspeksi (kolom 321 / tanggal insp terisi)', Revoke: 'Penerimaan dibatalkan (kolom 102 terisi)', 'Awaiting Inspection': 'Menunggu inspeksi' }[s.nama] || '') + '</div></div>').join('') + '</div>' +
        '<p class="small muted" style="margin:12px 0 0">Pass Rate = (Inspected + Revoke) ÷ seluruh data.</p></section>';
      lists.forEach(l => { state[l.key] = { items: l.items.map(x => ({ nama: x.nama, asal: x.nama, dipakai: x.dipakai })), saran: l.saran, def: l, dirty: false }; drawList(l.key); });
      drawInsp(d.inspektor);
      UI.$$('.md-nav [data-jump]', body).forEach(a => a.onclick = (e) => { e.preventDefault(); const t = $('#md-' + a.dataset.jump); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    };
    const drawList = (key) => {
      const s = state[key], d = s.def, box = $('#md-' + key); if (!box) return;
      const ganti = s.items.filter(x => x.asal && x.asal !== x.nama.trim());
      box.innerHTML = '<div class="card-h"><div><h2 class="sec-title">' + h(d.label) + ' <span class="badge b-pend nc">' + s.items.length + ' item</span>' + (s.dirty ? ' <span class="badge b-warn nc">belum disimpan</span>' : '') + '</h2><div class="sec-sub">' + h(d.desc || '') + '</div></div></div>' +
        '<div class="md-list">' + s.items.map((x, i) => {
          const wajib = d.wajib.some(w => w.toLowerCase() === (x.asal || x.nama).toLowerCase());
          return '<div class="md-row" data-i="' + i + '"><span class="md-no">' + (i + 1) + '</span><input class="input" data-nm value="' + h(x.nama) + '" aria-label="Nama item ' + (i + 1) + '" maxlength="80">' +
            '<span class="badge nc ' + (x.dipakai ? 'b-info' : 'b-pend') + '" title="Dipakai di data">' + num(x.dipakai || 0) + '</span>' +
            '<button class="icon-btn" data-up title="Naik" aria-label="Naik" ' + (i ? '' : 'disabled') + '>' + icon('up', 'sm') + '</button><button class="icon-btn" data-dn title="Turun" aria-label="Turun" ' + (i < s.items.length - 1 ? '' : 'disabled') + '>' + icon('down', 'sm') + '</button>' +
            (wajib ? '<span class="icon-btn" title="Wajib ada">' + icon('lock', 'sm') + '</span>' : '<button class="icon-btn" data-rm title="Hapus dari daftar" aria-label="Hapus" style="color:var(--err)">' + icon('x', 'sm') + '</button>') + '</div>';
        }).join('') + '</div>' +
        '<div class="md-add"><input class="input" data-new placeholder="Tambah ' + h(d.label.split(' (')[0].toLowerCase()) + ' baru…" maxlength="80"><button class="btn btn-outline btn-sm" data-add>' + icon('plus') + 'Tambah</button></div>' +
        (s.saran.length ? '<div class="md-saran"><span class="xs muted">Ada di data, belum di daftar:</span> ' + s.saran.slice(0, 30).map(x => '<button class="chip" data-sr="' + h(x.nama) + '">+ ' + h(x.nama) + ' <b>' + num(x.dipakai) + '</b></button>').join('') +
          (s.saran.length > 1 ? '<button class="link-btn small" data-srall>Tambahkan semua (' + s.saran.length + ')</button>' : '') + '</div>' : '') +
        '<div class="card-f">' + (ganti.length ? '<label class="check small"><input type="checkbox" data-prop checked> Ganti juga di data yang sudah ada (' + ganti.map(g => h(g.asal) + ' → ' + h(g.nama.trim())).join(', ') + ')</label>' : '<span class="xs muted">Item yang dihapus dari daftar tetap tampil pada data lama.</span>') +
        '<button class="btn btn-primary btn-sm" data-save data-busy="Menyimpan…" ' + (s.dirty ? '' : 'disabled') + '>' + icon('check') + 'Simpan</button></div>';
      const mark = () => { s.dirty = true; const b = UI.$('[data-save]', box); if (b) b.disabled = false; };
      UI.$$('[data-nm]', box).forEach(inp => inp.oninput = () => { s.items[+inp.closest('[data-i]').dataset.i].nama = inp.value; mark(); });
      UI.$$('[data-nm]', box).forEach(inp => inp.onchange = () => drawList(key));
      UI.$$('[data-up],[data-dn],[data-rm]', box).forEach(b => b.onclick = async () => {
        const i = +b.closest('[data-i]').dataset.i;
        if (b.hasAttribute('data-rm')) {
          const x = s.items[i];
          if (x.dipakai && !(await UI.confirm({ title: 'Hapus “' + x.nama + '” dari daftar?', okText: 'Hapus dari daftar', message: 'Nilai ini dipakai di <b>' + num(x.dipakai) + '</b> data. Data lama tidak berubah, hanya tidak muncul lagi sebagai pilihan.' }))) return;
          s.items.splice(i, 1);
        }
        else { const j = b.hasAttribute('data-up') ? i - 1 : i + 1; const t = s.items[i]; s.items[i] = s.items[j]; s.items[j] = t; }
        s.dirty = true; drawList(key);
      });
      const add = (v) => { v = String(v || '').trim(); if (!v) return false; if (s.items.some(x => x.nama.trim().toLowerCase() === v.toLowerCase())) { UI.toast('“' + v + '” sudah ada di daftar.', 'warn'); return false; }
        const sr = s.saran.find(x => x.nama === v); s.items.push({ nama: v, asal: '', dipakai: sr ? sr.dipakai : 0 }); s.saran = s.saran.filter(x => x.nama !== v); s.dirty = true; return true; };
      const nw = UI.$('[data-new]', box);
      UI.$('[data-add]', box).onclick = () => { if (add(nw.value)) drawList(key); };
      nw.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (add(nw.value)) drawList(key); } };
      UI.$$('[data-sr]', box).forEach(c => c.onclick = () => { if (add(c.dataset.sr)) drawList(key); });
      const all = UI.$('[data-srall]', box); if (all) all.onclick = () => { s.saran.slice().forEach(x => add(x.nama)); drawList(key); };
      UI.$('[data-save]', box).onclick = (e) => UI.busy(e.currentTarget, async () => {
        const items = s.items.map(x => x.nama.trim()).filter(Boolean);
        const renames = s.items.filter(x => x.asal && x.asal !== x.nama.trim() && x.nama.trim()).map(x => ({ from: x.asal, to: x.nama.trim() }));
        const prop = UI.$('[data-prop]', box);
        const res = await API.call('master.save', { key, items, renames, propagate: prop ? prop.checked : true });
        if (UI.showResult(res)) { API.invalidate(['master.get', 'getLookups', 'getReportFinding', 'getData', 'getReportCustomer', 'getDashboard']); App.loadLookups(); API.prime('master.get', {}, res.data); draw(res.data); }
      });
    };
    const drawInsp = (ins) => {
      const box = $('#md-insp');
      const map = {}; ins.alias.forEach(a => { map[a.kode] = { kode: a.kode, nama: a.nama, dipakai: a.dipakai, dariUser: '' }; });
      ins.kodeData.forEach(k => { map[k.kode] = Object.assign(map[k.kode] || { kode: k.kode, nama: '' }, { dipakai: k.dipakai, dariUser: k.dariUser }); });
      let rows = Object.keys(map).map(k => map[k]).sort((a, b) => (b.dipakai || 0) - (a.dipakai || 0));
      let dirty = false, q = '';
      const render = () => {
        const view = rows.filter(x => !q || (x.kode + ' ' + x.nama + ' ' + x.dariUser).toLowerCase().indexOf(q) > -1);
        box.innerHTML = '<div class="card-h"><div><h2 class="sec-title">' + icon('users') + 'Kode Inspector → Nama <span class="badge b-pend nc">' + rows.filter(x => x.nama).length + ' terpetakan</span>' + (dirty ? ' <span class="badge b-warn nc">belum disimpan</span>' : '') + '</h2>' +
          '<div class="sec-sub">Kolom Inspector di file Excel berisi kode (mis. 145). Isi nama agar tampil di Data Inspeksi, Dashboard & laporan. Kode yang sama dengan Employee ID di User Management terisi otomatis.</div></div>' +
          '<div class="input-icon" style="width:240px">' + icon('search') + '<input class="input soft" data-iq placeholder="Cari kode / nama…" value="' + h(q) + '"></div></div>' +
          '<div class="tbl-wrap" style="max-height:420px;overflow:auto"><table class="tbl dense sticky-h"><thead><tr><th style="width:120px">Kode</th><th>Nama inspector</th><th class="r" style="width:110px">Dipakai</th><th style="width:44px"></th></tr></thead><tbody>' +
          (view.length ? view.map(x => '<tr data-k="' + h(x.kode) + '"><td class="mono"><b>' + h(x.kode) + '</b></td><td><input class="input" data-in value="' + h(x.nama) + '" placeholder="' + h(x.dariUser ? x.dariUser + ' (dari User Management)' : 'nama inspector…') + '" maxlength="80"></td>' +
            '<td class="r num">' + num(x.dipakai || 0) + ' <span class="xs muted">record</span></td><td>' + (x.dipakai ? '' : '<button class="icon-btn" data-ix title="Hapus pemetaan" aria-label="Hapus" style="color:var(--err)">' + icon('x', 'sm') + '</button>') + '</td></tr>').join('')
            : '<tr><td colspan="4">' + UI.empty('Belum ada kode inspector di data. Tambahkan manual di bawah.') + '</td></tr>') + '</tbody></table></div>' +
          '<div class="md-add"><input class="input" data-nk placeholder="Kode" style="max-width:140px" maxlength="40"><input class="input" data-nn placeholder="Nama inspector" maxlength="80"><button class="btn btn-outline btn-sm" data-iadd>' + icon('plus') + 'Tambah</button>' +
          '<button class="btn btn-ghost btn-sm" data-ipaste>' + icon('copy') + 'Tempel banyak (kode=nama)</button></div>' +
          '<div class="card-f"><span class="xs muted">Nama kosong = tampil sebagai kode.</span><button class="btn btn-primary btn-sm" data-isave data-busy="Menyimpan…" ' + (dirty ? '' : 'disabled') + '>' + icon('check') + 'Simpan pemetaan</button></div>';
        const mark = () => { dirty = true; const b = UI.$('[data-isave]', box); if (b) b.disabled = false; };
        UI.$('[data-iq]', box).oninput = UI.debounce((e) => { q = String(e.target.value || '').toLowerCase().trim(); render(); const i = UI.$('[data-iq]', box); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250);
        UI.$$('[data-in]', box).forEach(inp => inp.oninput = () => { rows.find(x => x.kode === inp.closest('[data-k]').dataset.k).nama = inp.value; mark(); });
        UI.$$('[data-ix]', box).forEach(b => b.onclick = () => { const k = b.closest('[data-k]').dataset.k; rows = rows.filter(x => x.kode !== k); dirty = true; render(); });
        UI.$('[data-iadd]', box).onclick = () => {
          const k = UI.$('[data-nk]', box).value.trim(), n = UI.$('[data-nn]', box).value.trim();
          if (!k || !n) { UI.toast('Isi kode dan nama.', 'error'); return; }
          const ex = rows.find(x => x.kode.toLowerCase() === k.toLowerCase()); if (ex) ex.nama = n; else rows.unshift({ kode: k, nama: n, dipakai: 0, dariUser: '' });
          dirty = true; render();
        };
        UI.$('[data-ipaste]', box).onclick = async () => {
          const t = await UI.confirm({ title: 'Tempel pemetaan kode inspector', input: true, inputLabel: 'Satu baris per inspector: kode=nama (atau kode<TAB>nama dari Excel)', placeholder: '145=SATIBI\n234=YULHIM HILMI FAIZ', okText: 'Terapkan', message: 'Kode yang sudah ada akan diperbarui namanya.' });
          if (!t) return;
          let n = 0;
          String(t).split(/\n/).forEach(line => { const m = line.split(/=|\t|;/); const k = String(m[0] || '').trim(), v = String(m.slice(1).join(' ') || '').trim(); if (!k || !v) return; const ex = rows.find(x => x.kode.toLowerCase() === k.toLowerCase()); if (ex) ex.nama = v; else rows.push({ kode: k, nama: v, dipakai: 0, dariUser: '' }); n++; });
          dirty = true; render(); UI.toast(n + ' pemetaan diterapkan — klik Simpan.', 'info');
        };
        UI.$('[data-isave]', box).onclick = (e) => UI.busy(e.currentTarget, async () => {
          const alias = {}; rows.forEach(x => { if (String(x.nama || '').trim()) alias[x.kode] = String(x.nama).trim(); });
          const res = await API.call('master.save', { key: 'INSPECTOR_ALIAS', alias });
          if (UI.showResult(res)) { API.invalidate(['master.get', 'getLookups', 'getData', 'getDashboard', 'getDetail']); App.loadLookups(); API.prime('master.get', {}, res.data); draw(res.data); }
        });
      };
      render();
    };
    await API.swr('master.get', {}, draw, { fresh: 15000 });
  }
};
