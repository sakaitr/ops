#!/bin/bash
# setup.sh — cPanel sunucusunda ilk kurulum için
# cPanel Terminal'de çalıştırın: bash setup.sh

set -e
echo "=== Aycan – Operasyon Sistemi Kurulum ==="

# data klasörü oluştur (SQLite veritabanı için)
mkdir -p data
echo "✓ data/ klasörü hazır"

# Bağımlılıkları kur (native modüller Linux için derlenir)
npm install --production=false
echo "✓ npm install tamamlandı"

# Production build
npm run build
echo "✓ next build tamamlandı"

# Standalone klasörüne statik dosyaları kopyala
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
echo "✓ Statik dosyalar kopyalandı"

echo ""
echo "================================================"
echo "  Kurulum tamamlandı!"
echo "  cPanel → Node.js App:"
echo "    Startup file: .next/standalone/server.js"
echo "    Env vars: deploy-env.txt içindeki değerleri ekleyin"
echo "================================================"
