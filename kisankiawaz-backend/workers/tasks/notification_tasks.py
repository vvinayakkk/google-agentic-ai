import asyncio
from celery_app import app
from shared.core.config import get_settings
from loguru import logger


@app.task(name="send_notification")
def send_notification(user_id: str, title: str, message: str, notification_type: str = "general"):
    logger.info(f"Sending notification to {user_id}: {title}")
    # In production, integrate with FCM/push notifications
    # For now, store in MongoCollections
    from shared.db.mongodb import init_mongodb, get_async_db
    import uuid
    from datetime import datetime, timezone

    init_mongodb()

    async def _store():
        db = get_async_db()
        from shared.core.constants import MongoCollections
        await db.collection(MongoCollections.NOTIFICATIONS).document(uuid.uuid4().hex).set({
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": notification_type,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    asyncio.get_event_loop().run_until_complete(_store())
    return {"status": "sent", "user_id": user_id}


@app.task(name="send_broadcast")
def send_broadcast(title: str, message: str, notification_type: str = "broadcast"):
    logger.info(f"Broadcasting: {title}")
    # In production, fetch all user IDs and create notifications
    return {"status": "broadcast_sent", "title": title}
