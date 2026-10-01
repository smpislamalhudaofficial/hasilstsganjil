/**
 * KONFIGURASI PORTAL NILAI
 * 1. Buat satu tab Google Sheets dengan kolom PERSIS: MAPEL | KELAS | NO | NAMA | NILAI.
 * 2. Siapkan izin baca publik HANYA jika data memang diizinkan untuk dipublikasikan.
 * 3. Salin ID spreadsheet dari https://docs.google.com/spreadsheets/d/ID_SPREADSHEET/edit
 * 4. Tempel ID dan GID tab di bawah ini; commit lagi file config.js ke GitHub.
 * CATATAN PENTING: GitHub Pages + Sheet publik TIDAK membatasi siapa yang bisa mengakses data.
 */
window.PORTAL_CONFIG = Object.freeze({
  GOOGLE_SHEET_ID: "1CTM4kQU_pkfc66qg7CYZEedbb5Z4eYf42vDmaltU2ck",          // Contoh: "1AbCdEfGhIjK...". Kosong = tampilkan data DEMO.
  SHEET_GID: "0",               // Nilai sesudah #gid= pada tab yang berisi data.
  KKM: 75,
  REFRESH_INTERVAL_MS: 30000,  // Periksa perubahan tiap 60 detik saat halaman dibuka.
});
