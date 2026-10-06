/**
 * ============================================================
 *  KONFIGURASI FRONTEND — Dashboard MRI
 *  WAJIB diisi sebelum push ke GitHub Pages:
 *  GAS_URL = URL Web App (/exec) dari Apps Script
 *  (Deploy → New deployment → Web app → Execute as: Me, Access: Anyone)
 * ============================================================
 */
window.APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbytBiNf5cnlVAD3bEe4iZAeppzVQAseH5gdcc1tCvGNct4b34cKdhbgiB-8GK8rpE55rA/exec',
  APP_NAME: 'Dashboard MRI',
  VERSION: '2.5',
  // Library dimuat saat dibutuhkan (lazy) dari CDN jsDelivr
  CDN: {
    CHART: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js',
    XLSX: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    GSI: 'https://accounts.google.com/gsi/client'
  }
};
