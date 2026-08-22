# Changelog — Check-In System AMSI Riau

## Perubahan (Agustus 2026)

**Masalah:** Scan QR selalu menghasilkan "ID Tiket Tidak Ditemukan" walau tiket valid.

**Penyebab:** Sheet `Table1` (Daftar Hadir) tidak pernah memiliki kolom ID — kolom H
hanya bernama "Column 1" dan kosong, sementara `code.gs` lama mencari ID di kolom
tersebut berdasarkan posisi tetap (index 7).

**Perbaikan:**
1. `code.gs` — ditulis ulang agar mencari kolom berdasarkan **nama header**
   (bukan posisi tetap), sehingga lebih tahan terhadap perubahan urutan kolom.
   Menambahkan endpoint `?action=debug` untuk memverifikasi pemetaan kolom
   dan data secara langsung dari browser.
2. `sync_id.gs` — file baru. Menyalin nilai ID dari sheet "Form Responses" ke
   `Table1` berdasarkan kecocokan Email, karena ID tidak pernah tersalin ke
   sana sebelumnya. Bisa dijalankan manual (`syncIdColumn`) atau dipasang
   sebagai trigger `On form submit` (`onFormSubmitSyncId`) agar peserta baru
   otomatis ter-sync.
3. `Index.html` — tidak ada perubahan logika; disalin ulang di sini agar
   repo tetap sinkron dengan versi yang aktif di Apps Script.

**Langkah wajib di luar kode (dilakukan langsung di spreadsheet):**
- Header sel `Table1!H1` diganti dari "Column 1" menjadi "ID".
- `sync_id.gs` dijalankan sekali untuk mengisi data ID yang sudah ada.

## Catatan arsitektur
Aplikasi ini di-*host* oleh Google Apps Script (`.../exec`), bukan oleh
GitHub Pages. Repo ini berfungsi sebagai salinan sumber (backup/version
control) dari kode yang di-deploy di Apps Script — perubahan di repo ini
**tidak otomatis** memperbarui aplikasi yang live; kode tetap harus
di-paste manual ke editor Apps Script lalu di-deploy ulang.
