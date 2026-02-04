# Ngrok Tunnel Startup Script
# This script starts ngrok tunnel on port 3000 and displays the public URL

Write-Host "Starting ngrok tunnel on port 3000..." -ForegroundColor Cyan

# Start ngrok in a new window
Start-Process ngrok -ArgumentList "http 3000" -WindowStyle Normal

# Wait for ngrok to initialize
Write-Host "Waiting for ngrok to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Try to get the public URL
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
    $tunnel = $response.tunnels | Where-Object { $_.proto -eq 'https' }
    
    if ($tunnel) {
        $publicUrl = $tunnel.public_url
        Write-Host "`n✅ Ngrok tunnel is active!" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "Public URL: " -NoNewline -ForegroundColor White
        Write-Host "$publicUrl" -ForegroundColor Cyan
        Write-Host "Local URL:  " -NoNewline -ForegroundColor White
        Write-Host "http://localhost:3000" -ForegroundColor Cyan
        Write-Host "Dashboard:  " -NoNewline -ForegroundColor White
        Write-Host "http://localhost:4040" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "`n📝 Note: The server automatically adds 'ngrok-skip-browser-warning' header" -ForegroundColor Yellow
        Write-Host "   to bypass the ngrok browser warning page.`n" -ForegroundColor Yellow
        
        # Save URL to file
        $publicUrl | Out-File -FilePath "ngrok-url.txt" -Encoding utf8
        Write-Host "✓ Public URL saved to ngrok-url.txt" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Could not retrieve tunnel information" -ForegroundColor Yellow
        Write-Host "   Check the ngrok window or visit http://localhost:4040" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Ngrok API not responding yet" -ForegroundColor Yellow
    Write-Host "   The tunnel may still be starting. Check http://localhost:4040" -ForegroundColor Yellow
}

Write-Host "`n💡 To stop ngrok, close the ngrok window or press Ctrl+C" -ForegroundColor Cyan
