"""Notification preferences routes (new)."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from shared.auth.deps import get_current_user
from shared.db.mongodb import get_async_db
from shared.core.constants import MongoCollections
from shared.errors import HttpStatus
from shared.schemas.notification import NotificationPreferencesUpdate

router = APIRouter(prefix="/preferences", tags=["Notification Preferences"])


@router.get("/", status_code=HttpStatus.OK)
async def get_preferences(user: dict = Depends(get_current_user)):
    """Get notification preferences for the current user."""
    db = get_async_db()
    doc = await db.collection(MongoCollections.NOTIFICATION_PREFERENCES).document(user["id"]).get()
    if doc.exists:
        data = doc.to_dict()
        data["user_id"] = user["id"]
        return data
    return {
        "user_id": user["id"],
        "price_alerts": [],
        "scheme_alerts": True,
        "crop_advisories": True,
        "language": user.get("language", "hi"),
        "updated_at": "",
    }


@router.put("/", status_code=HttpStatus.OK)
async def update_preferences(body: NotificationPreferencesUpdate, user: dict = Depends(get_current_user)):
    """Update notification preferences."""
    db = get_async_db()
    updates = body.model_dump(exclude_none=True)
    if "price_alerts" in updates:
        # Validate max 10 alerts
        if len(updates["price_alerts"]) > 10:
            from shared.errors import bad_request, ErrorCode
            raise bad_request("Maximum 10 price alerts allowed", ErrorCode.NOTIFICATION_LIMIT_EXCEEDED)
        # Convert PriceAlert models to dicts
        updates["price_alerts"] = [
            a.model_dump() if hasattr(a, "model_dump") else a
            for a in updates["price_alerts"]
        ]
    updates["user_id"] = user["id"]
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.collection(MongoCollections.NOTIFICATION_PREFERENCES).document(user["id"]).set(updates, merge=True)
    return {"detail": "Preferences updated", **updates}
