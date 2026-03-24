FROM kisan-base:latest
WORKDIR /app
COPY workers/requirements.txt /app/requirements-svc.txt
RUN pip install --no-cache-dir -r requirements-svc.txt
COPY shared/ /app/shared/
COPY workers/ /app/
CMD ["celery", "-A", "celery_app", "worker", "--loglevel=info", "--concurrency=2"]
