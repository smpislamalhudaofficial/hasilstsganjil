# Portal Hasil Ujian — Bahasa Indonesia & KKA

Website **statis** (HTML + CSS + JavaScript) untuk GitHub Pages, tanpa Node.js, database, atau server berbayar. Tampilan ungu gradasi, mendukung desktop dan ponsel.

## Penting: privasi nilai siswa

**Jangan mempublikasikan nama lengkap dan nilai murid ke Google Sheets publik / GitHub Pages tanpa persetujuan dan dasar kebijakan sekolah.** Siapa saja dapat melihat atau mengunduh isi Google Sheets publik; filter kelas atau pencarian nama di website **bukan** pengaman data. Untuk hasil individu yang privat, gunakan backend dengan autentikasi dan otorisasi; layanan statis ini *tidak* memberikan proteksi tersebut. Anda dapat menggunakan nama samaran/kode siswa untuk publikasi yang disetujui.

## 1. Buat spreadsheet

1. Buat Google Sheets baru, satu tab bernama `NILAI` (nama bebas).
2. **Baris 1 harus tepat:** `MAPEL | KELAS | NO | NAMA | NILAI`.
3. Masukkan baris data dari file `template_nilai.csv`, atau impor file tersebut melalui **File → Impor → Upload** di Google Sheets. Spreadsheet juga bisa diisi menggunakan template `.xlsx` yang disertakan.
4. `MAPEL` diisi `Bahasa Indonesia` atau `KKA`. `KELAS` diisi `7 A` atau `7 B`; `NO` diisi urutan 1, 2, 3; `NAMA` diisi nama atau kode siswa; `NILAI` adalah angka 0 sampai 100. Kolom **KETERANGAN tidak perlu dibuat** karena aplikasi menghitung sendiri: **nilai >= 75 = Sukses; nilai < 75 = Remidi**.
5. Hindari sel digabung di tabel data. Jika ingin menyimpan catatan privat, simpan di **spreadsheet lain** yang tidak dibagikan: meskipun sebuah tab tidak ditampilkan, izin berbagi dapat memungkinkan akses ke tab lain dalam spreadsheet yang sama.

## 2. Izinkan website membaca Google Sheets

1. **Hanya jika data memang layak dipublikasikan**, klik **Bagikan → Akses umum → Siapa saja yang memiliki link → Pelihat**. Kebijakan akun sekolah bisa membatasi opsi ini.
2. Buka link Google Sheets dan salin **ID** di antara `/d/` dan `/edit`, contoh:
   `https://docs.google.com/spreadsheets/d/ID_SPREADSHEET/edit#gid=0`
3. Catat angka `gid` dari tab data, biasanya `0` untuk tab pertama.
4. Edit `config.js`:

   ```js
   window.PORTAL_CONFIG = Object.freeze({
     GOOGLE_SHEET_ID: "TEMPEL_ID_SHEET_DI_SINI",
     SHEET_GID: "0",
     KKM: 75,
     REFRESH_INTERVAL_MS: 60000,
   });
   ```

5. Google Visualization Query (`/gviz/tq`) dipakai untuk membaca data melalui JSONP; tidak perlu API key atau backend untuk sheet yang **diizinkan dibaca publik**. Jika Google Sheets tidak bisa diakses, website menampilkan pesan kesalahan, **bukan data contoh yang menyamar sebagai data asli**. Keterlambatan cache Google dapat terjadi.
6. Anda bisa mencoba endpoint ini dengan mengganti `ID` dan `GID`:
   `https://docs.google.com/spreadsheets/d/ID/gviz/tq?gid=GID&headers=1&tqx=out:json`

> Catatan: opsi **File → Bagikan → Publikasikan ke web** bisa dipakai sesuai kebijakan sekolah, tetapi tindakan tersebut juga membuka data secara publik. Tidak diperlukan bila akses via link publik sudah berfungsi.

## 3. Unggah ke GitHub Pages

1. Buat repositori baru di GitHub, misalnya `portal-hasil-ujian`.
2. Unggah `index.html`, `styles.css`, `config.js`, `app.js` **di root repositori**. File contoh CSV atau template XLSX boleh disimpan lokal dan **tidak perlu** diunggah, khususnya setelah berisi data asli siswa.
3. Buka repositori → **Settings → Pages** → **Build and deployment** → **Deploy from a branch** → branch `main` → folder `/(root)` → **Save**.
4. URL situs biasanya `https://USERNAME.github.io/portal-hasil-ujian/` (atau sesuai nama repo). Tunggu status deployment GitHub Pages.
5. Untuk mengganti nilai, cukup edit data di Google Sheets; tidak perlu mengunggah ulang website. Saat situs terbuka, website memeriksa perubahan setiap 60 detik dan ada tombol **Perbarui**. Google dapat butuh beberapa menit sebelum perubahan terlihat pada endpoint.
6. Jika ingin mengganti **KKM**, edit `config.js` lalu unggah perubahan tersebut ke GitHub (berbeda dengan perubahan nilai di Google Sheets).

## Fitur yang tersedia

- Pemilihan mapel Bahasa Indonesia / KKA → kelas 7 A / 7 B → hasil.
- Empat kolom: NO, NAMA, NILAI, KETERANGAN.
- Nilai **75 masuk Sukses** (hijau); 74,99 ke bawah Remidi (merah).
- Pencarian nama, filter Semua/Sukses/Remidi, statistik kelas.
- Tata letak responsif (tabel desktop, kartu hasil untuk layar ponsel).
- Data demo fiktif jika belum dikonfigurasi; indikator jelas jika data berasal dari Google Sheets.
- Satu tab Google Sheets untuk seluruh kombinasi kelas dan mapel.
- Escape data dari spreadsheet menggunakan `textContent` untuk mencegah injeksi HTML ke tampilan tabel.

## Struktur berkas

```
portal-hasil-ujian/
├── index.html           # struktur halaman
├── styles.css           # tampilan ungu gradasi dan responsif
├── config.js            # GANTI ID GOOGLE SHEETS DI SINI
├── app.js               # pengambilan data, navigasi, pencarian, aturan KKM
├── template_nilai.csv   # data fiktif untuk impor ke Google Sheets
├── template_nilai.xlsx  # jika tersedia, template Excel
└── README.md            # panduan ini
```

## Menguji secara lokal

- Tanpa ID Google Sheets, buka `index.html` langsung (data contoh akan muncul setelah memilih mapel dan kelas).
- Untuk mengecek koneksi sebenarnya gunakan GitHub Pages atau server lokal `python -m http.server 8080` dan buka `http://localhost:8080/`.
- Jika terjadi kesalahan, periksa konsol browser, izin spreadsheet, ID, GID, dan judul kolom.
