FROM kisan-base:latest
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
COPY services/analytics/requirements.txt /app/requirements-svc.txt
RUN pip install --no-cache-dir -r requirements-svc.txt
COPY shared/ /app/shared/
COPY services/analytics/ /app/
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -f http://localhost:8012/health || exit 1
EXPOSE 8012
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8012"]
