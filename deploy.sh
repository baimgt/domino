#!/bin/bash
set -e

echo "=============================================================="
echo "🐳 DEPLOY DOCKER KINGS BILLIARDS & DOMINO (3 DOMAIN)"
echo "=============================================================="

echo "1. Membangun & Menjalankan 3 Container Docker..."
docker compose up -d --build

echo "2. Menyalin konfigurasi Nginx 3 Domain..."
if [ -d "/etc/nginx/sites-available" ]; then
  sudo cp landing-page/nginx-domain.conf /etc/nginx/sites-available/kingsbilliards.conf
  sudo ln -sf /etc/nginx/sites-available/kingsbilliards.conf /etc/nginx/sites-enabled/kingsbilliards.conf
  sudo nginx -t && sudo systemctl reload nginx
  echo "✅ Konfigurasi Nginx berhasil diperbarui & di-reload!"
fi

echo "=============================================================="
echo "✅ SEMUA CONTAINER DOCKER BERJALAN!"
echo "🎮 Web Game Utama   : https://kingsbilliards.tech          (Port 5173)"
echo "📱 Web Download APK : https://download.kingsbilliards.tech (Port 3000)"
echo "⚡ Backend & Socket : https://api.kingsbilliards.tech      (Port 8080)"
echo "=============================================================="
docker ps
