FROM kisan-base:latest
WORKDIR /app
COPY services/equipment/requirements.txt /app/requirements-svc.txt
RUN pip install --no-cache-dir -r requirements-svc.txt
COPY shared/ /app/shared/
COPY services/equipment/ /app/
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8005/health || exit 1
EXPOSE 8005
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005"]
