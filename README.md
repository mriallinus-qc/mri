# Dashboard MRI v2.5 — Material Receiving Inspection System

Frontend statis (HTML/CSS/JS vanilla) untuk GitHub Pages. Backend-nya berupa Google Apps Script REST API, dengan Google Sheets sebagai database.

**Modul yang tersedia:**

- Executive KPI Dashboard — target Completion Rate & batas SLA TAT bisa diubah langsung dari kartu KPI (Superadmin & Admin)
- Data Inspeksi (master table + detail + form) — cetak **MRIR** PDF ber-QR
- Laporan Finding (NCR) — cetak **NCR** & **NCR Summary**
- Laporan Per Customer/Vendor — cetak **SLA Summary**
- Laporan Periode (bulanan/kuartal/tahunan) — cetak **Executive Summary**
- **Training Mandatory Control** — matriks inspector × training wajib, next due, reminder WhatsApp otomatis (H-30/H-7/H-1, hari H, overdue mingguan)
- **Dokumen & Template** — template Google Docs yang bisa diedit, pejabat penanda tangan, arsip, penarikan, halaman verifikasi publik `#/v/<kode>`
- Data Import & Migrasi (master, finding, users, training, konfigurasi — dry-run, idempoten, delta sync)
- WhatsApp & Email Notifikasi (Fonnte, antrean, blast per batch) · CRM Kontak
- User Management (RBAC Superadmin/Admin/User) · Audit Log · System Config

**Kecepatan (Instant UX PRO):** login & buka ulang = 1 panggilan, data segar tampil tanpa ke server, prefetch menu dalam 1 panggilan batch, retry otomatis + idempotensi `reqId`. Ketik `Perf.table()` di console untuk melihat waktu per aksi.

**Teknologi:** Inter · Chart.js 4 (jsDelivr) · SheetJS (export/import Excel di browser) · Google Identity Services (SSO opsional). Mendukung mode gelap dan tampilan responsif (desktop, tablet, ponsel).

## Struktur

```
index.html
css/style.css
js/config.js          ← ISI GAS_URL di sini
js/api.js             fetch + retry + SWR berbatas kesegaran + prefetch batch
js/ui.js              komponen UI, chart, Excel, editor target KPI
js/app.js             auth, shell, router, bootstrap, periode global, idle logout
js/pages-*.js         halaman (dashboard, data, laporan, admin, notif, training, dokumen)
```

Panduan lengkap ada di **PANDUAN-INSTALASI.md**.
