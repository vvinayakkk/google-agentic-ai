FROM nginx:alpine
RUN apk add --no-cache curl
COPY nginx.conf /etc/nginx/nginx.conf
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD curl -sf http://localhost:8000/health || exit 1
EXPOSE 8000
