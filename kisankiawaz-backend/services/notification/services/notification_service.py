"""Notification business logic."""

import uuid
from datetime import datetime, timezone

from google.cloud.firestore_v1.base_query import FieldFilter

from shared.core.constants import Firestore
from shared.errors import not_found, bad_request, ErrorCode


class NotificationService:
    """Static methods for notification operations."""

    # ── List notifications ───────────────────────────────────────

    @staticmethod
    async def list_notifications(
        db, user_id: str, is_read: bool | None, page: int, per_page: int
    ) -> dict:
        """Return paginated notifications for a user."""
        query = db.collection(Firestore.NOTIFICATIONS)
        query = query.where(filter=FieldFilter("user_id", "==", user_id))

        if is_read is not None:
            query = query.where(filter=FieldFilter("is_read", "==", is_read))

        # Fetch all matching then sort in Python to avoid composite index
        docs = [d async for d in query.stream()]
        items = []
        for doc in docs:
            item = doc.to_dict()
            item["id"] = doc.id
            items.append(item)

        # Sort by created_at descending
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        # Paginate
        offset = (page - 1) * per_page
        items = items[offset : offset + per_page]

        return {
            "items": items,
            "page": page,
            "per_page": per_page,
            "count": len(items),
        }

    # ── Count unread ─────────────────────────────────────────────

    @staticmethod
    async def count_unread(db, user_id: str) -> dict:
        """Return count of unread notifications for a user."""
        query = (
            db.collection(Firestore.NOTIFICATIONS)
            .where(filter=FieldFilter("user_id", "==", user_id))
            .where(filter=FieldFilter("is_read", "==", False))
        )
        docs = [d async for d in query.stream()]
        return {"unread_count": len(docs)}

    # ── Get single notification ──────────────────────────────────

    @staticmethod
    async def get_notification(db, notification_id: str, user_id: str) -> dict:
        """Return a single notification (ownership enforced)."""
        doc = await db.collection(Firestore.NOTIFICATIONS).document(notification_id).get()
        if not doc.exists:
            raise not_found("Notification not found")
        data = doc.to_dict()
        if data.get("user_id") != user_id:
            raise not_found("Notification not found")
        data["id"] = doc.id
        return data

    # ── Mark as read ─────────────────────────────────────────────

    @staticmethod
    async def mark_read(db, notification_id: str, user_id: str) -> dict:
        """Mark a notification as read (ownership enforced)."""
        ref = db.collection(Firestore.NOTIFICATIONS).document(notification_id)
        doc = await ref.get()
        if not doc.exists:
            raise not_found("Notification not found")
        data = doc.to_dict()
        if data.get("user_id") != user_id:
            raise not_found("Notification not found")

        await ref.update({"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()})
        data["is_read"] = True
        data["id"] = doc.id
        return data

    # ── Mark all as read ─────────────────────────────────────────

    @staticmethod
    async def mark_all_read(db, user_id: str) -> dict:
        """Mark all notifications as read for a user."""
        query = (
            db.collection(Firestore.NOTIFICATIONS)
            .where(filter=FieldFilter("user_id", "==", user_id))
            .where(filter=FieldFilter("is_read", "==", False))
        )
        docs = [d async for d in query.stream()]
        now = datetime.now(timezone.utc).isoformat()
        count = 0
        for doc in docs:
            await db.collection(Firestore.NOTIFICATIONS).document(doc.id).update(
                {"is_read": True, "read_at": now}
            )
            count += 1
        return {"marked_read": count}

    # ── Delete notification ──────────────────────────────────────

    @staticmethod
    async def delete_notification(db, notification_id: str, user_id: str) -> None:
        """Delete a notification (ownership enforced)."""
        ref = db.collection(Firestore.NOTIFICATIONS).document(notification_id)
        doc = await ref.get()
        if not doc.exists:
            raise not_found("Notification not found")
        data = doc.to_dict()
        if data.get("user_id") != user_id:
            raise not_found("Notification not found")
        await ref.delete()

    # ── Create notification (admin) ──────────────────────────────

    @staticmethod
    async def create_notification(db, data: dict) -> dict:
        """Admin creates a notification for a specific user."""
        required = ["user_id", "title", "message"]
        for field in required:
            if field not in data:
                raise bad_request(f"Missing required field: {field}")

        notification_id = uuid.uuid4().hex
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            "user_id": data["user_id"],
            "title": data["title"],
            "message": data["message"],
            "type": data.get("type", "general"),
            "data": data.get("data", {}),
            "is_read": False,
            "created_at": now,
        }
        await db.collection(Firestore.NOTIFICATIONS).document(notification_id).set(doc)
        doc["id"] = notification_id
        return doc

    # ── Broadcast (admin) ────────────────────────────────────────

    @staticmethod
    async def broadcast(
        db, title: str, message: str, notification_type: str = "broadcast", role: str | None = None
    ) -> dict:
        """Broadcast a notification to all users or by role."""
        query = db.collection(Firestore.USERS)
        if role:
            query = query.where(filter=FieldFilter("role", "==", role))

        users = [d async for d in query.stream()]
        now = datetime.now(timezone.utc).isoformat()
        count = 0

        for user_doc in users:
            notification_id = uuid.uuid4().hex
            doc = {
                "user_id": user_doc.id,
                "title": title,
                "message": message,
                "type": notification_type,
                "is_read": False,
                "created_at": now,
            }
            await db.collection(Firestore.NOTIFICATIONS).document(notification_id).set(doc)
            count += 1

        return {"broadcast_count": count, "title": title}
