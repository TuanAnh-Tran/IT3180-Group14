#!/bin/bash
# ============================================================
# start-docker.sh — Build & run toàn bộ hệ thống bằng Docker
# ============================================================
set -e

echo "🏢  Cyberspace + BlueMoon — Docker Launcher"
echo "============================================"

if [ ! -f .env ]; then
  echo "⚠️  Không tìm thấy .env — tạo từ .env.example..."
  cp .env.example .env
fi

echo "🔨  Building images..."
docker compose build

echo "🚀  Starting containers..."
docker compose up -d

echo ""
echo "✅  Hệ thống đã khởi động!"
echo "    Frontend:  http://localhost:8080"
echo "    Backend:   http://localhost:3000/api/health"
echo ""
echo "📋  Xem logs:    docker compose logs -f"
echo "🛑  Dừng:        ./stop-docker.sh"
