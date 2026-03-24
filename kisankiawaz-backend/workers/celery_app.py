import sys
sys.path.insert(0, "/app")

from celery import Celery
from shared.core.config import get_settings

settings = get_settings()

app = Celery(
    "kisankiawaz",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

app.autodiscover_tasks(["tasks"])
