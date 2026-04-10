FROM kisan-base:latest
WORKDIR /app
COPY services/market/requirements.txt /app/requirements-svc.txt
RUN pip install --no-cache-dir -r requirements-svc.txt
COPY shared/ /app/shared/
COPY services/market/ /app/
COPY services/scheme_documents/ /app/scheme_documents/
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8004/health || exit 1
EXPOSE 8004
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]
