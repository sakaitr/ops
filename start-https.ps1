# start-https.ps1
# Uygulamayı HTTPS üzerinden başlatır. PWA kurulumu için gereklidir.
# Kullanım: .\start-https.ps1

# ── Mevcut Node süreçlerini durdur ──────────────────────────────────────────
Write-Host "Mevcut Node.js süreçleri durduruluyor..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# ── Dizin ───────────────────────────────────────────────────────────────────
Set-Location "c:\Users\Administrator\Desktop\paylas\ops"

# ── Sertifika oluştur (yoksa) ────────────────────────────────────────────────
$openssl = "C:\Program Files\Git\usr\bin\openssl.exe"
if (!(Test-Path cert.pem) -or !(Test-Path cert-key.pem)) {
  Write-Host "Sertifika oluşturuluyor (OpenSSL)..." -ForegroundColor Cyan
  & $openssl req -x509 -newkey rsa:2048 -keyout cert-key.pem -out cert.pem `
    -days 3650 -nodes -config cert.conf 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0 -and !(Test-Path cert.pem)) {
    Write-Host "HATA: Sertifika oluşturulamadı!" -ForegroundColor Red
    exit 1
  }
  Write-Host "Sertifika oluşturuldu: cert.pem" -ForegroundColor Green
  Write-Host "  → Cihazlara yüklemek için bu dosyayı güvenilen CA olarak ekleyin." -ForegroundColor Yellow
} else {
  Write-Host "Mevcut sertifika kullanılıyor: cert.pem" -ForegroundColor Green
}

# ── Environment değişkenleri (HTTPS) ────────────────────────────────────────
$env:DATABASE_PATH       = "./data/opsdesk.sqlite"
$env:SESSION_TTL_HOURS   = "168"
$env:COOKIE_NAME         = "opsdesk_session"
$env:COOKIE_SECURE       = "true"       # HTTPS olduğu için true
$env:SEED_TOKEN          = "change-me-super-secret"
$env:APP_URL             = "https://212.64.201.208:3000"
$env:NEXT_PUBLIC_APP_URL = "https://212.64.201.208:3000"

# ── Next.js → port 3001 (arka plan process) ─────────────────────────────────
Write-Host "Next.js port 3001'de başlatılıyor..." -ForegroundColor Cyan

$nextProc = Start-Process powershell -ArgumentList @(
  "-NoProfile",
  "-Command",
  @"
    `$env:DATABASE_PATH       = './data/opsdesk.sqlite'
    `$env:SESSION_TTL_HOURS   = '168'
    `$env:COOKIE_NAME         = 'opsdesk_session'
    `$env:COOKIE_SECURE       = 'true'
    `$env:SEED_TOKEN          = 'change-me-super-secret'
    `$env:APP_URL             = 'https://212.64.201.208:3000'
    `$env:NEXT_PUBLIC_APP_URL = 'https://212.64.201.208:3000'
    `$env:HOSTNAME            = '127.0.0.1'
    `$env:PORT                = '3001'
    Set-Location 'c:\Users\Administrator\Desktop\paylas\ops'
    node .next/standalone/server.js
"@
) -PassThru -WindowStyle Minimized

Write-Host "Next.js PID: $($nextProc.Id)" -ForegroundColor Green

# Next.js'in başlamasını bekle
Write-Host "Next.js başlaması bekleniyor..." -NoNewline
for ($i = 0; $i -lt 10; $i++) {
  Start-Sleep -Seconds 1
  Write-Host "." -NoNewline
  try {
    $test = Invoke-WebRequest -Uri "http://127.0.0.1:3001" -TimeoutSec 2 -ErrorAction Stop -UseBasicParsing
    Write-Host " Hazır!" -ForegroundColor Green
    break
  } catch { }
}
Write-Host ""

# ── HTTPS Proxy → port 3000 (ön plan, Ctrl+C ile durur) ─────────────────────
Write-Host "`nHTTPS Proxy port 3000'de başlatılıyor..." -ForegroundColor Cyan
Write-Host "---------------------------------------------------"
Write-Host "  PWA URL : https://212.64.201.208:3000"
Write-Host "  Durdurmak için Ctrl+C"
Write-Host "---------------------------------------------------`n"

node https-proxy.mjs
