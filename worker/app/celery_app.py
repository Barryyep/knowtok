from celery import Celery

from app.config.settings import get_settings


settings = get_settings()

celery_app = Celery(
    "knowtok_worker",
    broker=settings.redis_url or "memory://",
    backend=settings.redis_url or "cache+memory://",
)

celery_app.conf.update(
    timezone=settings.worker_timezone,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_always_eager=settings.task_always_eager,
    task_eager_propagates=True,
    beat_schedule={
        "crawl-arxiv-twice-daily": {
            "task": "app.tasks.pipeline.crawl_arxiv",
            "schedule": 60 * 60 * 12,
        },
        "backfill-semantic-scholar-every-6-hours": {
            "task": "app.tasks.pipeline.backfill_semantic_scholar",
            "schedule": 60 * 60 * 6,
        }
    },
)

celery_app.autodiscover_tasks(["app.tasks"])
