#!/bin/bash
# ============================================================
# stop-docker.sh — Dừng và xóa container (giữ lại data volume)
# ============================================================
set -e

echo "🛑  Đang dừng Cyberspace + BlueMoon containers..."
docker compose down

echo "✅  Đã dừng. Dữ liệu vẫn được giữ trong Docker volume 'backend_data'."
echo "    Để xóa luôn dữ liệu: docker compose down -v"
