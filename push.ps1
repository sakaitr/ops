# Git push helper — npm run push ile çalıştırılır
$msg = Read-Host "Commit mesajı (boş bırakırsan 'update' kullanılır)"
if (-not $msg) { $msg = "update" }

Write-Host "`nDeğişiklikler ekleniyor..." -ForegroundColor Cyan
git add -A

$status = git status --porcelain
if (-not $status) {
    Write-Host "Değişiklik yok, push atlandı." -ForegroundColor Yellow
    exit 0
}

Write-Host "Commit: $msg" -ForegroundColor Cyan
git commit -m $msg

Write-Host "GitHub'a gönderiliyor..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Push başarılı → GitHub Actions deploy başladı!" -ForegroundColor Green
    Write-Host "  https://github.com/sakaitr/ops/actions" -ForegroundColor DarkGray
} else {
    Write-Host "`n✗ Push başarısız." -ForegroundColor Red
}
