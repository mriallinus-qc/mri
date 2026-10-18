# 📋 PANDUAN INSTALASI — Dashboard MRI v2.6

Material Receiving Inspection System. Backend berjalan di **Google Apps Script** sebagai REST API JSON, dan frontend disajikan dari **GitHub Pages**.

```
Browser ──fetch POST (text/plain JSON)──►  Google Apps Script (Web App /exec)
(GitHub Pages: index.html, css/, js/)      Kode.gs · Modul.gs · Migrasi.gs · Notifikasi.gs · CRM.gs
                                           Training.gs · MesinDokumen.gs · DokumenMRI.gs · DE_QrLib.gs · Fitur26.gs
                                                 │
                     Google Sheets (database) + Drive (backup, template Google Docs, arsip PDF) + Gmail + Fonnte WA
```

> **Sudah memakai v2.5?** Langsung ke **BAGIAN M — Upgrade v2.5 → v2.6**. Masih v2.4? Kerjakan BAGIAN H lalu BAGIAN M. Data lama tidak disentuh.
>
> **Fungsi baru v2.6:** Data Inspeksi mengikuti Excel (Inspected/Revoke/Awaiting), import agregat yang hanya menimpa baris berubah status (Bagian D2), hapus data salah upload & sinkron real-time (D4), Master Data (Bagian N), Dashboard TV publik (Bagian O), hapus user, dan menu Panduan Pengguna di dalam aplikasi.

## Isi paket

| Berkas | Untuk | Cara pakai |
|---|---|---|
| `Kode.gs`, `Modul.gs`, `Migrasi.gs`, `Notifikasi.gs`, `CRM.gs`, `Training.gs`, `MesinDokumen.gs`, `DokumenMRI.gs`, `DE_QrLib.gs`, `Fitur26.gs` | Backend (10 file) | Salin-tempel ke editor Apps Script. Masing-masing jadi 1 file dengan nama yang sama |
| `appsscript.json` | Backend | Tempel ke manifest proyek (Bagian A langkah 3) |
| `dashboard-mri.zip` | Frontend | Ekstrak. Folder hasil ekstrak **itulah** folder yang di-`git init` |
| `PANDUAN-INSTALASI.md` | Anda | Dokumen ini |
| `CATATAN-REVISI-v2.6.md` | Anda | Ringkasan perubahan v2.6 |

> ⚠️ Berkas `.gs` **tidak** ikut di-push ke GitHub. ZIP frontend sudah bersih dari berkas backend.

---

## BAGIAN A — Backend (Google Apps Script)

Kerjakan dengan akun Google yang akan menjadi **pemilik sistem**, sebaiknya akun Google Workspace perusahaan.

1. Buka https://script.google.com, lalu klik **Proyek baru**. Beri nama, misalnya `Dashboard MRI API`.
2. Buat 10 file script dengan tombol **＋ → Script**:
   - Ganti nama `Code.gs` menjadi `Kode`, lalu tempel isi `Kode.gs`.
   - Tambah file `Modul`, `Migrasi`, `Notifikasi`, `CRM`, `Training`, `MesinDokumen`, `DokumenMRI`, `DE_QrLib`, dan `Fitur26`. Tempel isi file dengan nama yang sama ke masing-masing. (`DE_QrLib` adalah pustaka QR Code MIT — tempel apa adanya.)
3. Buka **⚙ Project Settings** dan centang **"Show appsscript.json manifest file in editor"**. Kembali ke Editor, buka `appsscript.json`, lalu ganti seluruh isinya dengan `appsscript.json` dari paket ini. Pastikan Time zone = `Asia/Jakarta`.
4. Pilih fungsi **`setupAppEnvironment`**, lalu klik **▶ Run**. Fungsi ini hanya perlu dijalankan sekali, tetapi aman diulang karena hanya melengkapi yang belum ada.
   - Klik **Review permissions**, pilih akun, lalu **Advanced → Go to … (unsafe) → Allow**. Aplikasi meminta izin Sheets, Drive, **Google Docs** (template dokumen), Gmail kirim, UrlFetch, dan trigger.
   - Buka **Execution log** dan catat baris berikut:
     `👤 Superadmin dibuat: email-anda@… | Password sementara: XXXXXXXX#NN`
   - Di Google Drive akan muncul folder **📁 Dashboard MRI**. Isinya spreadsheet **🗃️ Database — Dashboard MRI** serta subfolder Exports, Backups, dan **📂 Template Dokumen** (6 template Google Docs bawaan). Log menampilkan `📄 Template dokumen: 6 dibuat`.
5. Klik **Deploy → New deployment**, lalu klik ikon ⚙ dan pilih **Web app**.
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`. Pengaturan ini wajib agar frontend di GitHub Pages bisa memanggil API. Keamanan tetap dijaga lewat login, token sesi, dan RBAC di server.
   - Klik **Deploy**, lalu **salin URL** yang berakhiran `/exec`.
6. Uji dengan membuka URL tersebut di browser. Hasilnya harus JSON `{"success":true,"data":{"app":"Dashboard MRI",…,"ready":true}}`.

Setup otomatis membuat sheet `MasterData`, `FindingList`, `Users`, `AuditLog`, `ImportLog`, `AppConfig`, `AntrianNotif`, `BlastWA`, `CRM_Kontak`, `CRM_Interaksi`, serta (v2.5) `Training`, `DE_Template`, `DE_Template_Versi`, `DE_Pejabat`, `DE_Dokumen`, `DE_Nomor`, dan `DE_Antrean`. Kolom kode (PO, Material, Batch, No Notif, No WA, No Sertifikat) sudah diformat teks agar angka 0 di depan tidak hilang. Setup juga memasang 5 trigger: `tugasHarian` (07.00 WIB — ringkasan & **reminder training**), `tugasPerJam`, `backupMingguan` (Minggu 02.00), `flushLog` (tiap 5 menit — menulis log non-kritis secara massal), dan **`onSheetChange`** (v2.6 — edit/hapus manual di spreadsheet langsung tampil di aplikasi). Trigger antrean notifikasi (`prosesAntrianNotif`, tiap 1 menit) baru dipasang saat notifikasi diaktifkan.

---

## BAGIAN B — Frontend ke GitHub Pages

### B1. Isi alamat backend (WAJIB sebelum push)

Ekstrak `dashboard-mri.zip`. Buka `js/config.js` dengan Notepad atau VS Code, lalu ganti baris berikut dengan URL `/exec` dari Bagian A langkah 5:

```js
GAS_URL: 'https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT/exec',
```

### B2. Cek folder yang benar

Folder kerja Anda adalah **folder hasil ekstrak `dashboard-mri`**, yang langsung berisi `index.html`. Semua perintah `git` dijalankan di folder ini. Jangan masuk lebih dalam dan jangan naik satu level.

```
dashboard-mri\          ← git init DI SINI
├── index.html
├── README.md
├── PANDUAN-INSTALASI.md
├── css\style.css
└── js\ config.js · api.js · ui.js · app.js · pages-*.js
```

Buka folder itu di File Explorer, klik address bar, ketik `powershell`, lalu Enter. Jalankan `dir` dan pastikan `index.html` terlihat di daftar.

### B3. Push pertama

Syaratnya: Git sudah terpasang (https://git-scm.com), Anda punya akun GitHub, dan sudah membuat repository **Public** baru tanpa README, misalnya `dashboard-mri`.

```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-github@anda.com"
git init
git add .
git commit -m "Upload pertama Dashboard MRI"
git branch -M main
git remote add origin https://github.com/USERNAME/dashboard-mri.git
git push -u origin main
```

- Saat diminta **Password**, tempel **Personal Access Token**, bukan password akun. Buat token di https://github.com/settings/tokens → *Generate new token (classic)* → centang **repo**.
- Layar terlihat kosong saat Anda menempel token. Itu normal. Tekan Enter.
- Push berhasil bila muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### B4. Aktifkan Pages

Di repository, buka **Settings → Pages**, lalu atur:

- Source: **Deploy from a branch**
- Branch: **main / (root)**
- Centang **Enforce HTTPS**, lalu **Save**

Tunggu 1–2 menit. Situs tersedia di `https://USERNAME.github.io/dashboard-mri/`.

### B5. Update di kemudian hari

```bash
git add .
git commit -m "Keterangan perubahan"
git push
```

Setelah push, tekan **Ctrl+Shift+R** di browser bila tampilan masih versi lama.

---

## BAGIAN C — Login pertama & Google SSO

1. Buka situs, lalu login dengan **email Superadmin + password sementara** dari Execution log. Aplikasi akan meminta Anda **mengganti password**.
2. Buka **Settings → User Management → Add New User** untuk menambah Admin (QC Supervisor) dan User (Inspector). Password sementara hanya tampil **sekali**. Untuk banyak user sekaligus, pakai **Bulk CSV/Excel Import**.
3. **Sign in with Google (opsional, disarankan):**
   1. Buka https://console.cloud.google.com, lalu **APIs & Services → Credentials → Create credentials → OAuth client ID**. Bila diminta, isi OAuth consent screen dengan tipe *Internal* untuk Workspace.
   2. Pilih Application type **Web application**. Di **Authorized JavaScript origins**, isi `https://USERNAME.github.io` tanpa path dan tanpa garis miring di akhir.
   3. Salin **Client ID** (`…apps.googleusercontent.com`) ke **System Config → GOOGLE_CLIENT_ID**, lalu **Simpan**.
   4. Isi **ALLOWED_DOMAIN** (mis. `company.com`) agar hanya akun Workspace perusahaan yang bisa masuk.
   5. Hanya email yang **sudah terdaftar** di User Management yang bisa login. Server memverifikasi token Google, yaitu `aud`, penerbit, email terverifikasi, dan domain.
4. Sesi otomatis berakhir setelah **30 menit** tanpa aktivitas. Durasinya bisa diubah di `SESSION_MENIT`.

### Hak akses (RBAC, ditegakkan di server)

| Fitur | Superadmin | Admin | User |
|---|:-:|:-:|:-:|
| Dashboard, Data Inspeksi (lihat), semua Laporan, Export Excel, Panduan Pengguna | ✅ | ✅ | ✅ |
| Dashboard: tabel Produktivitas / Top Inspector | ✅ | ❌ | ❌ |
| Tambah/edit data inspeksi & finding | ✅ (semua field) | ✅ (inspector, status, tgl inspeksi, TAT, hasil, remarks) | ❌ |
| Hapus data (soft delete + alasan wajib) | ✅ | ❌ | ❌ |
| Ubah **target Completion Rate** & **batas SLA TAT** (ikon ✎ di kartu KPI) | ✅ | ✅ | ❌ |
| Training Mandatory: lihat matriks, cetak rekap | ✅ | ✅ | ✅ |
| Training Mandatory: tambah/edit/perpanjang, kirim reminder, pengaturan | ✅ | ✅ (hapus: ❌) | ❌ |
| Cetak dokumen PDF ber-QR (Laporan Inspeksi, MRIR, MRIR/SLA/Executive Summary, Rekap Training) | ✅ | ✅ | ✅ |
| Arsip dokumen, daftar template & pejabat (lihat) | ✅ | ✅ | ❌ |
| Edit template Google Docs, atur slot TTD & nomor, pejabat & spesimen, tarik dokumen | ✅ | ❌ | ❌ |
| Import Excel, Pull API, Sinkron sekarang | ✅ | ✅ | ❌ |
| Master Data (PIC Unit, status finding, subject, Type PO, material type, kode inspector) | ✅ | ✅ | ❌ |
| Batalkan batch import, hapus data massal (dengan backup) | ✅ | ❌ | ❌ |
| Migrasi spreadsheet lama | ✅ | ❌ | ❌ |
| Blast WA, antrean, CRM Kontak | ✅ | ✅ | ❌ |
| User Management (termasuk hapus user permanen), Audit Log, System Config, konfigurasi notifikasi | ✅ | ❌ | ❌ |
| Kelola link Dashboard TV | ✅ | ❌ | ❌ |
| Melihat Dashboard TV | Siapa pun yang memegang link (tanpa login) | | |

---

## BAGIAN D — Mengisi data

### D1. Data demo untuk UAT (opsional)

Buka **System Config → Pemeliharaan → Isi data demo**. Tombol ini hanya muncul bila Master Data masih kosong. Isinya ±1.100 penerimaan dan ±130 finding sejak Januari tahun berjalan, serta ±20 data training mandatory (campuran valid/jatuh tempo/overdue), dengan **nama vendor fiktif** dan kolom Source = `Demo`. Sebelum go-live, klik **Hapus data demo**.

### D2. Import Excel harian (Admin)

Buka **Data Import**, lalu:

1. Unduh template lewat **Download Excel Templates**. File dump SAP asli juga bisa dipakai langsung karena header dikenali otomatis, termasuk alias seperti `Pstng Date`, `Purchasing Document`, `Mat. Doc.`, `UoM`, `Nama Vendor`, dan `BUDAT`. Baris judul di atas header juga tidak masalah.
2. Tarik file .xlsx/.csv (maks 50.000 baris), lalu klik **Pindai (Dry-run)** untuk melihat hasilnya tanpa menulis data.
3. Klik **Upload & Process**. File besar otomatis dikirim per 5.000 baris.

Aturan yang berlaku saat import:

- Import **idempoten**. Kunci Master Data adalah `Mat. Doc. + Material + Batch + PO`, dan kunci Finding adalah `No Notif`. Mengunggah file yang sama dua kali tidak menggandakan data.
- **Data Inspeksi (v2.6) — file agregat.** Kolom file Excel inspeksi dikenali langsung: `Material`, `Material Description`, `Batch`, `PO`, `Type Po`, `Vendor`, `Vendor name`, `Mat. Doc.`, `Pstng Date`, `102`, `321`, `Tanggal`, `tanggal insp`, `TAT` ("6 hari" → 6), `TEXT AFTER` (status), `Inspector` (kode). Nilai `#N/A` dianggap kosong. Pilih mode di kotak **"Data yang sudah ada"**:
  - **Timpa yang berubah status saja** (bawaan, disarankan untuk file agregat). Baris baru ditambahkan. Baris lama **hanya diperbarui bila statusnya berubah** (mis. Awaiting Inspection → Inspected), beserta kolom 321, tanggal insp, TAT, inspector, dan tanggal. Hasil pindai menampilkan jumlah yang berubah status dan transisinya. Baris yang statusnya sama tidak ditulis ulang, dan file tanpa info status tidak pernah menurunkan status yang sudah selesai.
  - **Isi field kosong saja**: hanya mengisi kolom yang masih kosong.
  - **Timpa semua kolom**: semua kolom diganti dengan isi file. Pakai sekali setelah upgrade untuk membetulkan tanggal lama (Bagian M).
- Status dari `TEXT AFTER` hanya 3: **Inspected, Revoke, Awaiting Inspection**. Bila kolom status kosong: `102` terisi → Revoke; `321`/`Tanggal`/`tanggal insp` terisi → Inspected; selain itu → Awaiting Inspection.
- Untuk Finding, mode **"Isi field kosong saja"** (bawaan) tidak menimpa data yang sudah ada, sedangkan **"Timpa"** memperbarui field dari file.
- Pada Finding, perubahan status dari file hanya diterapkan bila **Update Status di file sama atau lebih baru**.
- Baris rusak ditolak dengan pesan dan **nomor baris Excel**, misalnya "Baris 6: Material kosong". Kolom wajib yang kosong tetap diimpor dengan peringatan.
- Format tanggal yang diterima: sel tanggal Excel (dibaca persis, tanpa mundur 1 hari), `yyyy-mm-dd`, `dd.mm.yyyy` (SAP), dan teks `8/5/2026`. Teks bergaris miring dibaca **bulan/hari/tahun** sesuai ekspor Excel inspeksi. Ubah ke hari/bulan/tahun di System Config → `FORMAT_TANGGAL` = `DMY` bila file Anda memakai urutan itu. Tanggal yang mustahil (bulan > 12) otomatis dibalik.
- Setiap upload mendapat **Batch ID** (tampil di Riwayat Import) agar bisa dibatalkan (D4).

### D3. Pull API JSON (opsional, pengganti konektor SAP)

Isi **System Config → API_SYNC_URL**, token Bearer, lalu nyalakan **API_SYNC_AKTIF**. Setelah itu data ditarik tiap jam dengan mode *timpa*. Endpoint harus mengembalikan:

```json
{ "master":  [ { "Material": "…", "PO": "…", "Posting Date": "2026-09-20", "Quantity": 5, "Unit": "EA", "Vendor Name": "…" } ],
  "finding": [ { "No Notif": "…", "Tanggal MRIR": "2026-09-20", "Status": "Open", "PIC Unit": "Procurement" } ] }
```

Biasanya endpoint ini berupa middleware kecil yang membaca SAP. SAP tidak bisa dipanggil langsung dari Apps Script tanpa gateway yang terbuka ke internet.

### D4. Salah upload? Batalkan / hapus data & sinkron (v2.6)

- **Batalkan 1 upload** (Superadmin): **Data Import → Riwayat Import → Batalkan** pada batch yang salah. Muncul jumlah baris yang akan dihapus; ketik `HAPUS` untuk mengonfirmasi. Hanya baris dari upload tersebut yang dihapus, data lain tidak tersentuh.
- **Hapus data massal** (Superadmin): kartu **Hapus Data Salah Upload** di Data Import. Pilih data (Master Data / Finding List) dan cakupan (**rentang tanggal**, **Batch ID**, **sumber data**, atau **SEMUA data**), klik **Hitung baris (dry-run)**, lalu **Hapus permanen…** dan ketik `HAPUS` untuk mengonfirmasi. **Backup spreadsheet dibuat otomatis lebih dulu** (folder Backups). Bila backup gagal, penghapusan dibatalkan. Tercatat di Audit Log.
- **Edit/hapus manual langsung di spreadsheet** kini otomatis tampil di aplikasi lewat trigger `onSheetChange`. Bila masih terlihat data lama, klik **Manual Sync Now** di Data Import (sekaligus memasang ulang trigger bila hilang), lalu tekan Ctrl+Shift+R di browser.

---

## BAGIAN E — Import data dari app/spreadsheet lama (Migrasi)

Menu ini khusus **Superadmin**, di **Data Import → Migrasi dari Spreadsheet / App Lama**.

1. Tempel URL spreadsheet lama. Spreadsheet itu harus bisa dibuka oleh **akun pemilik Apps Script**. Isinya hanya **dibaca** dan tidak pernah diubah.
2. Centang data yang akan dipindahkan: Master Data, Finding List, Master Users, **Training Mandatory**, dan/atau **Konfigurasi**. Nama sheet dideteksi otomatis (`Master Data`, `MasterData`, `Sheet1`, `Finding List`, `NCR`, `Training`, `Pelatihan`, `AppConfig`, `Config`, …) atau bisa diisi manual.
   - **Training:** kunci = Nama Inspector + Nama Training. Next Due dari app lama hanya memperbarui bila **lebih baru** (training sudah diperpanjang). Next Due kosong dihitung dari tanggal training + masa berlaku master.
   - **Konfigurasi:** hanya kunci aman (target KPI, aging, master list, training wajib, jadwal reminder, nama/alamat institusi, dll.) dan hanya bila nilai di app baru **masih bawaan** — target yang sudah Anda ubah di app baru tidak ditimpa (kecuali mode *Timpa*). Token/rahasia tidak pernah ikut.
3. Klik **Pindai (Dry-run)** dan periksa tabel *Baris sumber / Akan ditambah / Akan diperbarui / Dilewati / Gagal* beserta peringatannya.
4. Klik **Jalankan Migrasi**.

**Checklist cutover:**

1. Cek Data Inspeksi & Laporan, lalu uji dengan 1 akun User.
2. **Tepat sebelum pindah**, klik **Jalankan Migrasi sekali lagi** (delta sync). Hanya baris baru dan perubahan yang ditambahkan.
3. Umumkan alamat baru, misalnya lewat blast WA. Spreadsheet lama tetap aman sebagai arsip.

Batasan migrasi:

- Record yang sudah **dihapus** di app baru tidak dihidupkan kembali.
- User dari app lama diimpor **tanpa password**. Mereka login via Google atau direset oleh Superadmin.
- Sesi lama tidak ikut pindah, sehingga semua orang perlu login ulang.
- Untuk sheet di atas ±20.000 baris, jalankan migrasi per dataset. Checkbox dataset disediakan untuk itu, karena Apps Script punya batas waktu 6 menit per eksekusi.

---

## BAGIAN F — Notifikasi WhatsApp & Email + CRM Kontak

### F1. Setup Fonnte (WhatsApp)

1. Daftar di https://fonnte.com, buka **Device → Add device**, lalu scan QR dengan nomor WA kantor.
2. Salin **token** device.
3. Di aplikasi, buka **WhatsApp & Notifikasi → ⚙️ Konfigurasi** dan tempel token. Token disimpan di Script Properties dan tidak pernah tampil utuh.
4. Klik **Cek Perangkat** sampai status `connect`, lalu **Kirim Tes WA**.
5. Nyalakan saklar **WhatsApp**, lalu **Simpan Konfigurasi**.

### F2. Email

Nyalakan saklar **Email**, lalu **Kirim Tes Email**. Kuota Gmail sekitar 100 email/hari untuk akun biasa dan ±1.500/hari untuk Workspace. Sisa kuota tampil di layar.

### F3. Matriks event (bisa diatur per event per kanal, dan template bisa diedit)

| Event | Penerima |
|---|---|
| Finding baru → PIC Unit | Kontak CRM segmen **PIC Unit** ber-**tag** nama unit, plus user yang **Department**-nya sama dengan PIC Unit |
| Finding baru → Vendor | Kontak CRM segmen **Vendor** ber-tag nama vendor (persis seperti di Master Data) |
| Finding Closed | PIC Unit terkait |
| Aging kritis (harian) | PIC Unit: rekap finding open ≥ `AGING_KRITIS_HARI` |
| TAT terlampaui (harian), Ringkasan KPI harian, Hasil NG/Quarantine | Admin & Superadmin |
| Import selesai | Superadmin |
| Akun dibuat, Reset password | User yang bersangkutan |
| **Reminder Training Mandatory** (v2.5) | Inspector yang bersangkutan — No WA dari User Management (nama sama) atau CRM Kontak |
| **Rekap training jatuh tempo & overdue** (v2.5, harian) | Admin & Superadmin (email) |

Centang WA/Email per event **bisa diubah kapan saja**, juga saat saklar utama kanalnya nonaktif (v2.6). Pilihan tersimpan dan langsung berlaku begitu kanal diaktifkan.

Semua notifikasi masuk **antrean** lebih dulu, lalu dikirim oleh trigger 1 menit. Karena itu tombol di aplikasi tetap cepat, dan gagal kirim tidak menggagalkan transaksi.

### F4. CRM Kontak

- **Sinkron Sekarang** menarik semua staf dari User Management.
- **Tambah Kontak** atau **Import CSV/Excel** (template tersedia) dipakai untuk PIC Unit dan vendor. Isi **Tag** dengan nama unit atau vendor yang persis sama.
- Fitur lain: deteksi nomor WA massal, tag massal, opt-out (tidak masuk blast), gabung duplikat, timeline interaksi, dan ekspor (Superadmin).

### F5. Blast WhatsApp

Langkahnya: 1) pilih sasaran (segmen/tag CRM atau tempel manual) → **Deteksi Nomor WA** → 2) tulis pesan dengan variabel `{nama}` → 3) pilih batch **10 / 20 / 50** dan jeda (mis. `5-12`) → **Mulai Blast**.

v2.6 lebih cepat: pengiriman **langsung dimulai** dan berlanjut otomatis selama halaman terbuka. Setiap putaran mengirim beberapa batch sekaligus (bawaan **5 batch**, atur 1–20 di Konfigurasi → *Batch per putaran*). Bila halaman ditutup, server tetap melanjutkan tiap menit. Jeda antarpesan tetap dijalankan Fonnte.

Tips anti-banned:

- Pakai nomor yang sudah lama aktif.
- Mulai dari batch 10 dengan jeda acak ≥ 5 detik.
- Jangan kirim link yang sama ke ratusan orang dalam 1 jam.

---

## BAGIAN G — Update backend (umum)

Setelah mengubah file `.gs`, buka **Deploy → Manage deployments → ✏️ Edit**, pilih **Version: New version**, lalu **Deploy**. URL `/exec` tetap sama, jadi `config.js` tidak perlu diubah. Jika skema berubah di versi berikutnya, jalankan `setupAppEnvironment` lagi. Fungsi ini aditif dan tidak menghapus data. Bila trigger hilang, jalankan `pasangSemuaTrigger`.

---

## BAGIAN H — Upgrade v2.4 → v2.5 (data lama tetap utuh)

1. **Backup dulu:** System Config → Pemeliharaan → *Backup sekarang* (atau File → Buat salinan pada spreadsheet database).
2. Di editor Apps Script, **ganti seluruh isi** `Kode`, `Modul`, `Migrasi`, `Notifikasi` dengan versi v2.5. `CRM` tidak berubah (boleh ditempel ulang).
3. **Tambah 4 file baru:** `Training`, `MesinDokumen`, `DokumenMRI`, `DE_QrLib`.
4. Ganti isi `appsscript.json` (ada izin baru `documents`).
5. Jalankan **`setupAppEnvironment`** sekali → setujui izin Google Docs. Fungsi ini **aditif**: hanya menambah sheet/kolom baru, 6 template dokumen, dan trigger `flushLog`. Tidak ada data yang dihapus atau diubah.
6. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.** URL `/exec` tetap sama.
7. Frontend: ganti isi repo GitHub dengan isi ZIP v2.5 **kecuali** `js/config.js` milik Anda (atau isi ulang `GAS_URL`), lalu `git add . && git commit -m "v2.5" && git push`. Tekan Ctrl+Shift+R.
8. Login sebagai Admin/Superadmin **dari alamat GitHub Pages** agar `APP_URL` terisi (dipakai QR verifikasi), lalu tambahkan **Pejabat Penanda Tangan** (Bagian K).

---

## BAGIAN I — Target Completion Rate & batas SLA TAT (editable)

- Klik ikon **✎** di samping nilai target pada kartu KPI: **Dashboard** (Completion Rate & Average TAT), **Data Inspeksi** (Average Inspection TAT), **Laporan Per Customer** (Overall Compliance) dan **Laporan Periode** (Completion Rate & Average Inspection TAT).
- Hanya **Superadmin & Admin** yang melihat ikon ini; validasi juga di server (Completion 1–100 %, SLA TAT 0,5–60 hari).
- Nilai langsung berlaku untuk semua user dan semua laporan, termasuk alert "material pending > target TAT" dan isi dokumen cetak. Setiap perubahan tercatat di **Audit Log** (action `CONFIG`, nilai lama → baru, menu asal).

---

## BAGIAN J — Training Mandatory Control + reminder WhatsApp otomatis

Menu **Training Mandatory** (semua role bisa melihat; tambah/edit oleh Admin & Superadmin).

| Field kontrol | Keterangan |
|---|---|
| **Nama Inspector** | Sama persis dengan nama di User Management agar No WA terambil otomatis (atau ada di CRM Kontak) |
| **Nama Training** | Pilih dari master training wajib atau ketik training tambahan |
| **Next Due Training** | Jatuh tempo berikutnya. Untuk training wajib, cukup isi *Tanggal Training* → Next Due = tanggal + masa berlaku (bisa diubah) |
| Tanggal training, No sertifikat, Penyelenggara, Catatan | Opsional |

- **Matriks inspector × training wajib**: hijau = valid, kuning = jatuh tempo ≤ H-30, merah = overdue, abu = belum tercatat. Klik sel untuk mengisi/memperbarui. Tombol **⟳ Perpanjang** mengisi tanggal training hari ini dan menghitung Next Due baru (siklus reminder dimulai ulang).
- **Reminder otomatis** (trigger harian 07.00 WIB, lewat antrean notifikasi): ke inspector pada **H-30, H-7, H-1**, **hari H**, lalu **tiap 7 hari setelah overdue**; plus **rekap email** ke Admin & Superadmin. Setiap tahap hanya dikirim sekali (tercatat di kolom *Reminder Terakhir*); bila trigger sempat terlewat, tahap terdekat dikirim saat berikutnya.
- **Pengaturan** (Admin): master training wajib + masa berlaku (bulan), hari reminder (mis. `30,14,7,1`), interval ulang overdue. Template pesan & kanal diatur di **WhatsApp & Notifikasi → Matriks** (event *Reminder Training Mandatory*). Syarat terkirim: saklar WhatsApp/Email aktif (Bagian F).
- **Kirim reminder sekarang**: centang baris → tombol *Kirim reminder WA sekarang*.
- **Import massal**: Data Import → kartu *Import Training Mandatory* (template tersedia, idempoten). **Cetak Rekap (PDF)** memakai mesin dokumen (Bagian K).

---

## BAGIAN K — Cetak dokumen: template Google Docs + QR verifikasi

Semua tombol cetak di sistem kini menghasilkan **PDF dari template Google Docs** (bukan lagi Ctrl+P browser):

| Tombol | Dokumen | Template |
|---|---|---|
| Data Inspeksi › detail → **Cetak Laporan Inspeksi (PDF)** | Laporan Hasil Inspeksi Material (nomor `LHI-QC`) | `INSPEKSI` |
| Laporan Finding › detail → **Cetak MRIR (PDF)** | Material Receiving Inspection Report (isian: tindakan perbaikan, target selesai; nomor `MRIR-QC`) | `NCR` (kode internal) |
| Laporan Finding → **MRIR Summary (PDF)** | Ringkasan MRIR sesuai filter & periode di layar | `NCR_SUMMARY` (kode internal) |
| Laporan Per Customer → **SLA Summary (PDF)** | Kinerja vendor/customer | `SLA_SUMMARY` |
| Laporan Periode → **Executive Summary (PDF)** | Rekap bulanan/kuartal/tahunan + insight | `EXEC_PERIODE` |
| Training Mandatory → **Cetak Rekap (PDF)** | Rekap kepatuhan & next due | `TRAINING_MATRIX` |

**Alur cetak langsung:** klik tombol → nama & jabatan penanda tangan terisi otomatis → (opsional) pilih pejabat lain, *Ruang TTD basah* atau *Spesimen TTD*, isi kolom tambahan → **Cetak PDF**. Server: ambil nomor otomatis → salin template → isi data → sisipkan QR → ekspor PDF → hitung **SHA-256** → simpan di **📂 Arsip Dokumen** → tampil pratinjau + tombol *Buka & Cetak* / *Unduh PDF*.

- **Data sama = dokumen sama.** Bila data, isian, penanda tangan, dan versi template tidak berubah, PDF lama dipakai ulang (nomor tidak bertambah). Bila data inspeksi/MRIR berubah lalu dicetak ulang, dokumen lama otomatis berstatus **DITARIK — digantikan oleh No. …**.
- **Nomor dokumen** per jenis, reset tiap tahun, format bisa diubah (`{URUT}/LHI-QC/{BULAN}/{TAHUN}`, `{URUT}/MRIR-QC/{BULAN}/{TAHUN}`; token `{URUT} {URUT4} {KODE} {BULAN} {BLN} {TAHUN} {TH}`). Bila render gagal, nomor dikembalikan sehingga tidak ada nomor bolong.
- **Verifikasi:** QR berisi `https://<github-pages>/#/v/<KODE>`. Halaman ini **publik tanpa login**: status **SAH / DITARIK / TIDAK TERDAFTAR**, nomor, perihal, tanggal, penanda tangan, dan **cek hash PDF** (berkas diperiksa di perangkat pembaca, tidak diunggah). Kode juga tercetak di bawah QR dan di kaki halaman.

### K1. Mengubah desain template (Superadmin)

1. Menu **Dokumen & Template → Template → Edit di Google Docs** (bila tidak bisa membuka, klik *Akses edit saya* — template dibagikan ke email Anda).
2. Ubah bebas: logo di header, teks, urutan bagian, tabel, huruf, warna. Teks pengganti **mewarisi gaya placeholder** (tebal/ukuran/warna).
3. Simpan. Saat layar cetak berikutnya dibuka, sistem **memindai ulang otomatis** (atau klik *Pindai ulang*). Versi template naik dan salinannya disimpan di folder *Versi Template*.
4. **Kamus placeholder** di tiap kartu template berisi semua kunci yang bisa dipakai (klik untuk menyalin):
   - Data otomatis, mis. `{{MATERIAL}}`, `{{PO}}`, `{{VENDOR}}`, `{{HASIL_AKHIR}}`, `{{TAT}}` …
   - Tabel berulang: taruh `{{#FINDING}}` di satu sel baris tabel, kolomnya `{{FINDING.NO_NOTIF}}`, `{{NO}}` = nomor urut.
   - Bagian bersyarat: `{{?FINDING}}` … `{{/FINDING}}` hilang bila kosong (bisa per paragraf atau di dalam satu kalimat).
   - Penanda tangan: `{{LABEL_TTD_1}}`, `{{TTD_1}}` (spesimen atau ruang TTD basah — taruh sendirian di paragrafnya), `{{NAMA_PEJABAT_1}}`, `{{JABATAN_1}}`, `{{NIP_1}}` (ganti 1 dengan nomor slot).
   - Sistem & verifikasi: `{{NOMOR}}`, `{{TANGGAL}}`, `{{PENCETAK}}`, `{{QR}}`, `{{KODE_VERIFIKASI}}`, `{{URL_VERIFIKASI}}`, `{{INSTITUSI_NAMA}}`, `{{INSTITUSI_ALAMAT}}`.
   - Pengubah: `|kapital`, `|judul`, `|tanggal`, `|tanggal:dd/MM/yyyy`, `|angka:2`, `|rupiah`, `|terbilang`, `|bawaan:teks cadangan`.
   - **Placeholder baru buatan Anda** (mis. `{{CATATAN_QC}}`, `{{TGL_SERAH_TERIMA}}`) otomatis menjadi kolom isian di layar cetak. Atur label, tipe, wajib, dan opsi lewat tombol **Atur**.
5. **Atur** juga mengatur slot penanda tangan: label, cara mengisi (*inspector pada data*, *user yang mencetak*, *pejabat sesuai jabatan*, *dipilih saat cetak*, *pejabat tetap*), jabatan, dan tanda bawaan; format nomor; aktif/nonaktif; atau mengganti berkas template dengan Google Docs lain.
6. **Reset ke bawaan** membuat template bawaan baru; berkas lama tidak dihapus (dipindah ke folder Versi). Dokumen yang sudah terbit tidak pernah berubah.

### K2. Pejabat penanda tangan (Superadmin)

Menu **Dokumen & Template → Pejabat**: nama, gelar, jabatan (mis. *QC Supervisor*, *QC Manager*), NIP/NIK, email, masa jabatan, dan **spesimen TTD** (PNG/JPG ≤ 1 MB, latar transparan disarankan; disimpan di folder Drive privat). Slot "pejabat sesuai jabatan" memilih pejabat aktif pada tanggal cetak — aman saat pergantian pejabat.

### K3. Arsip & penarikan

**Dokumen & Template → Arsip** (Admin): cari, unduh ulang (berkas identik, hash sama), salin link verifikasi. Superadmin dapat **menarik** dokumen dengan alasan wajib → halaman verifikasi menampilkan DITARIK beserta alasannya.

> **Catatan hukum (bukan nasihat hukum):** QR + kode + hash di modul ini termasuk tanda tangan elektronik **tidak tersertifikasi** (PP 71/2019) — memadai untuk dokumen internal QC karena keasliannya bisa dicek. Untuk dokumen yang menuntut kekuatan hukum penuh, gunakan TTE tersertifikasi melalui PSrE resmi.

> **Verifikasi pusat (opsional):** bila organisasi punya layanan verifikasi terpusat, isi Script Properties `VP_URL`, `VP_KODE_APP`, `VP_KUNCI`, `VP_HALAMAN`. Laporan dokumen terbit/ditarik dikirim otomatis (gagal → dicoba ulang tiap jam lewat `DE_Antrean`).

---

## BAGIAN L — Kecepatan (Instant UX PRO)

- **Login & buka ulang = 1 panggilan**: respons login/bootstrap sudah membawa profil, daftar pilihan (lookups), dan data dashboard.
- **Cache kesegaran**: data yang masih segar (30–90 detik per menu) tampil seketika **tanpa** memanggil server; setelah itu tampil dari cache lalu diperbarui di latar (tabel/grafik hanya digambar ulang bila datanya berubah, tanpa animasi saat dari cache).
- **Prefetch saat idle**: setelah login, menu utama (Data Inspeksi, Finding, Customer, Periode, Training, Arsip) diambil dalam **1 panggilan batch**, sehingga perpindahan menu pertama pun instan. Detail record tampil seketika dari baris tabel lalu dilengkapi.
- **Tahan jaringan HP**: timeout + coba ulang otomatis untuk data baca; aksi simpan membawa **reqId** sehingga aman diulang tanpa data dobel. Saat kembali dari latar belakang > 2 menit, aplikasi mengirim ping pemanas (cold start Apps Script).
- **Server**: log non-kritis (VIEW/LOGIN) ditulis massal tiap 5 menit, *LastLogin* diperbarui maks. 1×/jam, notifikasi dikirim setelah kunci data dilepas, dan setiap respons membawa `ms` (waktu server). Ketik `Perf.table()` atau `Perf.ringkas()` di console browser untuk melihat waktu per aksi.
- Cetak dokumen memang butuh beberapa detik (salin Google Docs + ekspor PDF, ±5–15 detik tergantung jumlah baris). Layar cetak menampilkan progres per langkah; dokumen dengan data sama langsung dipakai ulang dalam ±1 detik.

---

## BAGIAN M — Upgrade v2.5 → v2.6 (data lama tetap utuh)

1. **Backup dulu:** System Config → Pemeliharaan → *Backup sekarang*.
2. Di editor Apps Script, **ganti seluruh isi** `Kode`, `Modul`, `Migrasi`, `Notifikasi`, `MesinDokumen`, dan `DokumenMRI` dengan versi v2.6. `CRM`, `Training`, `DE_QrLib`, dan `appsscript.json` tidak berubah (boleh ditempel ulang).
3. **Tambah 1 file baru:** `Fitur26`.
4. Jalankan **`setupAppEnvironment`** sekali dari editor. Fungsi ini aditif dan menjalankan penyesuaian v2.6 (idempoten, aman diulang):
   - menambah kolom `102`, `321`, dan `Tanggal` di MasterData, serta kolom `ImportBatch` (penanda upload, untuk fitur Batalkan) di MasterData, FindingList, dan Training;
   - menetapkan status inspeksi = Inspected/Revoke/Awaiting Inspection dan menambah status finding **Sent to Customer**;
   - batas urgent 14 → **30 hari**, bila masih nilai bawaan lama (14);
   - menambah Type PO (GMF, CSP, Military) dan memasukkan PIC Unit yang ada di data ke Master Data;
   - mengganti nama dokumen, format nomor, dan **teks NCR → MRIR di template Google Docs**, hanya bila masih bawaan;
   - memasang trigger `onSheetChange`.

   Alternatifnya, setelah deploy klik **System Config → Jalankan upgrade v2.6** (kartu kuning).
5. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.**
6. Frontend: ganti isi repo dengan isi ZIP v2.6 **kecuali** `js/config.js` milik Anda, lalu `git add . && git commit -m "v2.6" && git push`. Tekan Ctrl+Shift+R.
7. **Import ulang file Excel inspeksi sekali dengan mode "Timpa semua kolom"**. Langkah ini membetulkan tanggal yang dulu mundur 1 hari (bug v2.5 di browser zona WIB) dan mengisi kolom baru (102/321/Tanggal/Type PO/status). Untuk import harian berikutnya, pakai mode bawaan *Timpa yang berubah status saja*.
8. **Master Data → Kode Inspector → Nama**: isi nama untuk kode inspector di Excel (mis. `145 = Satibi`). Cara lain: isi **Employee ID** user di User Management dengan kode yang sama.
9. (Opsional) **System Config → Dashboard TV → Aktifkan & buat link**, lalu buka link tersebut di TV/monitor (Bagian O).

---

## BAGIAN N — Master Data (Admin & Superadmin)

Menu **Settings → Master Data** mengatur semua daftar pilihan tanpa menyentuh JSON di System Config:

| Daftar | Dipakai di |
|---|---|
| **PIC Unit** (unit kerja purchaser, mis. TME, TRS, TMC) | Form finding, filter & statistik per PIC Unit, penerima notifikasi finding |
| **Status Finding** | Tab status di Laporan Finding, filter status, tombol ubah status cepat. Wajib memuat `Open` dan `Closed` |
| **Subject / Kategori Finding** | Form finding, distribusi subject (Laporan Per Customer) |
| **Type PO** | Filter Type PO di Data Inspeksi & Laporan Per Customer, form data inspeksi |
| **Material Type** | Form Data Inspeksi |
| **Kode Inspector → Nama** | Kode di kolom Inspector Excel tampil sebagai nama di semua laporan |

- Tambah, ubah nama, urutkan (▲▼), dan hapus item, lalu klik **Simpan** per kartu.
- Angka di samping item = jumlah pemakaian di data. Nilai yang ada di data tetapi belum masuk daftar muncul sebagai **saran** (klik untuk menambah, atau *Tambahkan semua*).
- Saat mengganti nama item, centang **"Ganti juga di data yang sudah ada"** agar data lama ikut berganti. Item yang dihapus dari daftar tetap tampil pada data lama.
- Status Inspeksi (Inspected / Revoke / Awaiting Inspection) tetap dan tidak dapat diubah karena dipakai rumus Pass Rate.

---

## BAGIAN O — Dashboard TV (Open Access)

Layar monitoring untuk TV di area receiving: **tanpa login, tanpa sidebar, hanya lihat**, diperbarui otomatis tiap 60 detik.

1. Superadmin: **System Config → Dashboard TV → Aktifkan & buat link** (atau tombol **Mode TV** di Dashboard).
2. Klik **Salin**, lalu buka link di browser TV/PC monitor. Klik ikon ⛶ untuk layar penuh (atau F11).
3. Opsi di ujung link:
   - `?p=month` (bawaan), `?p=quarter`, `?p=year`, `?p=last30`, atau `?p=all` untuk periode;
   - `&tema=terang` untuk tema terang (bawaan gelap).
4. Isi layar:
   - 6 KPI: diterima, Inspected, Awaiting, Revoke, Pass Rate, Avg TAT;
   - grafik Inspected vs Awaiting per bulan;
   - finding (MRIR) per status;
   - finding open per PIC Unit;
   - Type PO;
   - backlog awaiting per vendor.

   Tidak ada nama inspector, purchaser, atau user. Tampilan dioptimalkan untuk 1920×1080 dan 1366×768.
5. **Buat link baru** membuat link lama langsung tidak berlaku (pakai bila link bocor). **Nonaktifkan** menghentikan semua layar.

> Link TV berfungsi seperti kata sandi: siapa pun yang memegangnya bisa melihat ringkasan KPI. Bagikan hanya ke perangkat monitor internal.

---

## Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Layar "Frontend belum terhubung ke backend" | `GAS_URL` di `js/config.js` belum diisi → isi, lalu push ulang |
| "Tidak dapat terhubung ke server" | URL `/exec` salah, atau deployment bukan *Anyone*. Buka URL `/exec` di browser dan pastikan hasilnya JSON |
| "Backend belum di-setup" | `setupAppEnvironment` belum dijalankan |
| Perubahan backend tidak terlihat | Belum *New version* di Manage deployments |
| Tombol Google tidak muncul / error origin | `GOOGLE_CLIENT_ID` kosong, atau origin `https://USERNAME.github.io` belum didaftarkan |
| "Email … belum terdaftar" saat login Google | Tambahkan email tersebut di User Management |
| Situs 404 di GitHub Pages | `index.html` tidak di root repo. Push ulang dari folder `dashboard-mri` (lihat B2) |
| Tampilan tanpa gaya (CSS 404) | Struktur `css/` dan `js/` rusak karena upload via web GitHub. Gunakan `git push` |
| Notifikasi menumpuk di antrean | Token atau perangkat Fonnte putus, atau trigger belum terpasang. Buka Konfigurasi → Cek Perangkat, lalu System Config → Pasang ulang trigger |
| Import "Kolom wajib tidak ditemukan" | Header file tidak dikenali. Pakai template atau ganti nama kolom sesuai template |
| Grafik tidak tampil | Library Chart.js dari CDN jsDelivr diblokir jaringan kantor. Data tetap tampil di tabel |
| "Template … tidak bisa dibuka" saat cetak | Berkas template dihapus/dipindah tanpa akses. Superadmin: Dokumen & Template → *Reset ke bawaan* |
| QR menunjuk alamat script.google.com | `APP_URL` kosong. Login sebagai Admin/Superadmin dari alamat GitHub Pages (https) atau isi di WhatsApp & Notifikasi → Konfigurasi |
| Nama penanda tangan kosong "(………)" | Belum ada pejabat aktif dengan jabatan slot itu, atau nama inspector kosong. Tambah di Dokumen & Template → Pejabat |
| Kolom baru di template tidak muncul di layar cetak | Pastikan penulisan `{{NAMA_KUNCI}}` (huruf/angka/garis bawah). Klik *Pindai ulang* |
| Reminder training tidak terkirim | Saklar WA/Email nonaktif, event *Reminder Training* dimatikan di matriks, atau nama inspector tidak sama dengan User Management / CRM (kolom Kontak bertanda ✕ WA) |
| Error izin `DocumentApp` setelah upgrade | `appsscript.json` belum diganti atau `setupAppEnvironment` belum dijalankan ulang untuk menyetujui izin Google Docs |
| Tanggal hasil import lebih awal 1 hari (data dari v2.5) | Import ulang file Excel sekali dengan mode **Timpa semua kolom** (Bagian M langkah 7) |
| Bulan tertukar dengan tanggal (mis. 8/5 terbaca 8 Mei) | Ubah `FORMAT_TANGGAL` di System Config: `MDY` = bulan/hari/tahun, `DMY` = hari/bulan/tahun. Sel tanggal Excel asli tidak terpengaruh |
| Kolom Inspector menampilkan angka (kode) | Isi Master Data → Kode Inspector → Nama, atau Employee ID di User Management |
| Data yang dihapus manual di spreadsheet masih tampil | Klik **Data Import → Manual Sync Now** (memasang ulang trigger `onSheetChange` bila hilang), lalu Ctrl+Shift+R |
| Import ulang "0 diperbarui" padahal ada perubahan | Mode *Timpa yang berubah status saja* hanya menulis baris yang statusnya berubah. Untuk koreksi kolom lain, pakai *Timpa semua kolom* |
| Layar TV "Link Dashboard TV tidak valid" | Link dinonaktifkan atau sudah dibuat link baru. Salin link terbaru dari System Config |
| Menu Master Data/Panduan tidak muncul setelah update | File frontend lama masih ter-cache. Tekan Ctrl+Shift+R atau hapus cache situs |

## Batasan yang perlu diketahui

- **IP address** tidak tersedia di Apps Script, sehingga kolom *IP/Client* di Audit Log mencatat browser/perangkat.
- **Audit log** hanya bisa ditambah (append-only) dari aplikasi. Agar benar-benar tidak bisa diubah, **jangan bagikan akses Edit spreadsheet database** selain ke pemilik script. Retensi minimal 2 tahun ditangani secara manual atau dengan pengarsipan tahunan.
- **Sesi** disimpan di CacheService dengan sliding 30 menit dan batas absolut 12 jam. Bila cache Google di-reset, user cukup login ulang.
- **Dokumen PDF** dibuat dari template Google Docs di akun pemilik script (kuota Apps Script: ±90 menit eksekusi trigger/hari, pembuatan dokumen dibatasi kuota harian Google). Tabel berulang di ringkasan dibatasi 150–200 baris per dokumen; daftar lengkap tetap tersedia lewat Export Excel.
- **Balasan WA masuk** dan kata kunci STOP belum tercatat otomatis karena membutuhkan webhook Fonnte.
- **Dashboard TV** memakai link rahasia, bukan login. Jangan menayangkan link di tempat umum. Bila bocor, klik *Buat link baru*.
- **Hapus user** bersifat permanen (riwayat audit tetap). **Hapus data massal** juga permanen, tetapi backup spreadsheet dibuat otomatis lebih dulu.
- **Kapasitas:** data diringkas di server dan di-cache (gzip), dan hasil uji dengan 10.000 record: perhitungan dashboard ±150 ms. Pembacaan sheet pertama kali setelah data berubah bergantung pada Google (biasanya 1–3 detik), lalu dilayani dari cache. Kuota Apps Script gratis: UrlFetch ±20.000/hari, trigger 90 menit/hari.
