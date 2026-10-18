# Dashboard MRI v2.6 — Material Receiving Inspection System

Frontend statis (HTML/CSS/JS vanilla) untuk GitHub Pages. Backend-nya berupa Google Apps Script REST API, dengan Google Sheets sebagai database.

**Modul yang tersedia:**

- Executive KPI Dashboard — target Completion/Pass Rate & batas SLA TAT bisa diubah dari kartu KPI; Top Inspector khusus Superadmin
- Data Inspeksi mengikuti file Excel (status **Inspected / Revoke / Awaiting Inspection**, kolom 102/321/Tanggal, filter **Type PO**) — cetak Laporan Inspeksi PDF ber-QR
- Laporan Finding (**MRIR** — Material Receiving Inspection Report) — tab per status (termasuk *Sent to Customer*), Top 5/10 purchaser, statistik per PIC Unit, cetak **MRIR** & **MRIR Summary**
- Laporan Per Customer/Vendor (filter Type PO) — cetak **SLA Summary**
- Laporan Periode (Inspected vs Awaiting, bulanan/kuartal/tahunan) — cetak **Executive Summary**
- **Training Mandatory Control** — matriks inspector × training wajib, next due, reminder WhatsApp otomatis
- **Dokumen & Template** — template Google Docs yang bisa diedit, pejabat penanda tangan, arsip, verifikasi publik `#/v/<kode>`
- Data Import & Migrasi — import agregat "timpa yang berubah status saja", batalkan batch import, hapus data salah upload (dengan backup), sinkron real-time
- **Master Data** — PIC Unit, status finding, subject, Type PO, material type, kode inspector → nama
- WhatsApp & Email Notifikasi (Fonnte, antrean, blast multi-batch) · CRM Kontak
- User Management (RBAC, hapus user permanen) · Audit Log · System Config
- **Dashboard TV (Open Access)** `#/tv/<token>` — layar monitoring tanpa login & tanpa sidebar, auto-refresh 60 detik
- **Panduan Pengguna** — bantuan per menu sesuai hak akses

**Kecepatan (Instant UX PRO):** login & buka ulang = 1 panggilan, data segar tampil tanpa ke server, prefetch menu dalam 1 panggilan batch, retry otomatis + idempotensi `reqId`. Ketik `Perf.table()` di console untuk melihat waktu per aksi.

**Teknologi:** Inter · Chart.js 4 (jsDelivr) · SheetJS (export/import Excel di browser) · Google Identity Services (SSO opsional). Mendukung mode gelap dan tampilan responsif (desktop, tablet, ponsel, TV).

## Struktur

```
index.html
css/style.css
js/config.js          ← ISI GAS_URL di sini
js/api.js             fetch + retry + SWR berbatas kesegaran + prefetch batch
js/ui.js              komponen UI, chart, parser Excel, editor target KPI
js/app.js             auth, shell, router, bootstrap, periode global, idle logout
js/pages-*.js         halaman (dashboard, data, laporan, admin, notif, training, dokumen,
                      master, panduan, tv)
```

Panduan lengkap ada di **PANDUAN-INSTALASI.md**. Ringkasan perubahan: **CATATAN-REVISI-v2.6.md** (di paket backend).
