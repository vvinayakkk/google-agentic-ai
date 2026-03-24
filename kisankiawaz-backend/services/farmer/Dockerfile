FROM kisan-base:latest
WORKDIR /app
COPY services/farmer/requirements.txt /app/requirements-svc.txt
RUN pip install --no-cache-dir -r requirements-svc.txt 2>/dev/null || true
COPY shared/ /app/shared/
COPY services/farmer/ /app/
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8002/health || exit 1
EXPOSE 8002
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
