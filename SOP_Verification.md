# SOP: Verifikasi Nota Elektronik (Human-in-the-Loop)

Panduan bagi Bendahara Meraki-Berbagi untuk melakukan verifikasi data hasil ekstraksi AI.

## 1. Pendahuluan
Sistem Meraki Berbagi menggunakan AI untuk mengekstrak data dari nota yang diunggah. Untuk memastikan kepatuhan 100%, setiap ekstraksi harus divalidasi oleh Bendahara sebelum masuk ke laporan resmi.

## 2. Langkah-Langkah Verifikasi
1. **Masuk ke Dashboard Admin**: Buka menu 'Treasury' atau 'Audit'.
2. **Cari Bukti Tertunda**: Transaksi dengan label `PENDING` (warna kuning) memerlukan verifikasi.
3. **Buka Modal Verifikasi**: Klik pada transaksi tersebut untuk membuka **Smart Verification Modal**.
4. **Tinjau Data**:
   - Bandingkan foto nota asli (di sisi kiri) dengan hasil ekstraksi AI (di sisi kanan).
   - Periksa **Nominal**, **Merchant/Toko**, dan **Tanggal**.
   - Perhatikan **AI Confidence Score**. Jika di bawah 70%, lakukan pengecekan lebih teliti.
5. **Koreksi Data (Jika Perlu)**: Jika AI salah membaca angka, silakan ketik ulang di kolom input yang tersedia.
6. **Setujui & Simpan**: Klik tombol **'Setujui & Simpan'**. Sistem akan mencatat nama Anda sebagai verifikator resmi.

## 3. Ekspor Laporan Bulanan
1. Setelah semua transaksi diverifikasi, klik tombol **'Download Compliance Report'**.
2. Anda akan menerima file `.md` yang berisi tabel Markdown profesional.
3. Anda dapat menyalin tabel ini langsung ke dokumen laporan bulanan organisasi.

---
**Meraki-Berbagi Intelligence Systems**  
*Building Transparency through Technology*
