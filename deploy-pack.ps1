# deploy-pack.ps1
# Sunucuya yüklenecek deployment ZIP paketini oluşturur
# Kullanım: .\deploy-pack.ps1

$SRC = "c:\Users\Administrator\Desktop\paylas\ops"
$OUT = "c:\Users\Administrator\Desktop\paylas\ops-deploy.zip"

Write-Host "Deployment paketi oluşturuluyor..." -ForegroundColor Cyan

# Zip için geçici liste — node_modules ve .next GELMİYOR
$include = @(
  "app",
  "components",
  "lib",
  "migrations",
  "public",
  "cert.conf",
  "eslint.config.mjs",
  "https-proxy.mjs",
  "next.config.ts",
  "next-env.d.ts",
  "package.json",
  "package-lock.json",
  "postcss.config.mjs",
  "proxy.ts",
  "tsconfig.json"
)

if (Test-Path $OUT) { Remove-Item $OUT -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($OUT, [System.IO.Compression.ZipArchiveMode]::Create)

foreach ($item in $include) {
  $fullPath = Join-Path $SRC $item
  if (!(Test-Path $fullPath)) { continue }

  if (Test-Path $fullPath -PathType Container) {
    # Klasör → tüm dosyaları recursive ekle
    Get-ChildItem -Path $fullPath -Recurse -File | ForEach-Object {
      $rel = $_.FullName.Substring($SRC.Length + 1).Replace('\', '/')
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel) | Out-Null
    }
  } else {
    $rel = $item.Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $rel) | Out-Null
  }
}

$zip.Dispose()

$size = [math]::Round((Get-Item $OUT).Length / 1MB, 1)
Write-Host "Paket oluşturuldu: $OUT ($size MB)" -ForegroundColor Green
Write-Host ""
Write-Host "Sonraki adımlar:"
Write-Host "  1. ops-deploy.zip dosyasını cPanel File Manager ile /home/<user>/ops klasörüne yükle ve çıkar"
Write-Host "  2. cPanel → Node.js App → Create Application"
Write-Host "     - App root: ops"
Write-Host "     - App URL: <domain veya alt domain>"
Write-Host "     - App startup file: .next/standalone/server.js"
Write-Host "     - App mode: production"
Write-Host "  3. cPanel Terminal → cd ~/ops && npm install && npm run build"
Write-Host "  4. Env vars ekle (deploy-env.txt içinde)"
Write-Host "  5. Node.js App → Restart"
