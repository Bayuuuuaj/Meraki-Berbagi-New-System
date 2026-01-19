
$process = Start-Process npx -ArgumentList "-y", "cloudflared@latest", "tunnel", "--url", "http://localhost:3000" -PassThru -NoNewWindow -RedirectStandardOutput "cf_tunnel.log" -RedirectStandardError "cf_tunnel_err.log"
Start-Sleep -Seconds 30
$log = Get-Content "cf_tunnel.log"
$line = $log | Select-String "trycloudflare.com"
if ($line) {
    Write-Output "URL_FOUND: $($line)"
} else {
    Write-Output "URL_NOT_FOUND"
    Get-Content "cf_tunnel.log" | select -last 20
}
Stop-Process $process
