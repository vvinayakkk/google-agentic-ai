FROM kisan-base:latest
WORKDIR /app
COPY services/geo/requirements.txt /app/requirements-svc.txt
RUN pip install --no-cache-dir -r requirements-svc.txt 2>/dev/null || true
COPY shared/ /app/shared/
COPY services/geo/ /app/
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8010/health || exit 1
EXPOSE 8010
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]
