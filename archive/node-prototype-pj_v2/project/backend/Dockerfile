# ============================================================
#  BACKEND Dockerfile — Cyberspace + BlueMoon API
# ============================================================
FROM node:18-alpine

WORKDIR /app

# Cài dependencies trước để tận dụng Docker layer cache
COPY package*.json ./
RUN npm install --omit=dev

# Copy toàn bộ source code
COPY . .

# Thư mục data (JSON database) — sẽ được mount volume khi chạy
RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "src/server.js"]
