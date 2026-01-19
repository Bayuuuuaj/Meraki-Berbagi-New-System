# Simulasi Lapangan Meraki-Berbagi
# Jalankan script ini untuk membuka akses HP ke aplikasi Anda.

Write-Host "--- Memulai Simulasi Lapangan Meraki-Berbagi ---" -ForegroundColor Cyan

# 1. Pastikan port 5000 bersih
Stop-Process -Name node -ErrorAction SilentlyContinue

# 2. Jalankan npm install (jika ada dependency baru)
Write-Host "Sedang menginstal dependencies..."
npm install

# 3. Jalankan Server di Background
Write-Host "Memulai Server pada port 5000..."
Start-Process powershell -ArgumentList "npm run dev" -WindowStyle Normal

# 4. Tunggu sebentar agar server siap
Start-Sleep -Seconds 10

# 5. Jalankan Tunnel
Write-Host "Membuka Jalur Tunnel (HTTPS)..."
npm run tunnel:lt
