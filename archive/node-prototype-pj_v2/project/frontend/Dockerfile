# ============================================================
#  FRONTEND Dockerfile — Cyberspace + BlueMoon SPA (Nginx)
# ============================================================
FROM nginx:1.27-alpine

# Xóa config mặc định và thay bằng config tùy chỉnh (SPA + proxy API)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy toàn bộ frontend static files
COPY . /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
