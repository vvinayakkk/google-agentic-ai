"""Mandi business logic."""

import uuid
from datetime import datetime, timezone

from shared.db.mongodb import FieldFilter

from shared.core.constants import MongoCollections
from shared.errors import not_found, bad_request, ErrorCode


class MandiService:
    """Static methods for mandi operations."""

    # ── List mandis ──────────────────────────────────────────────

    @staticmethod
    async def list_mandis(db, filters: dict, page: int, per_page: int) -> dict:
        """Return paginated mandis, optionally filtered."""
        query = db.collection(MongoCollections.MANDIS)

        if filters.get("state"):
            query = query.where(filter=FieldFilter("state", "==", filters["state"]))
        if filters.get("district"):
            query = query.where(filter=FieldFilter("district", "==", filters["district"]))

        offset = (page - 1) * per_page

        docs = [d async for d in query.stream()]
        items = []
        for doc in docs:
            item = doc.to_dict()
            item["id"] = doc.id
            items.append(item)

        # Sort and paginate in Python (avoids composite index requirement)
        items.sort(key=lambda x: x.get("name", ""))
        items = items[offset:offset + per_page]

        return {
            "items": items,
            "page": page,
            "per_page": per_page,
            "count": len(items),
        }

    # ── Get single mandi ─────────────────────────────────────────

    @staticmethod
    async def get_mandi(db, mandi_id: str) -> dict:
        """Return a single mandi."""
        doc = await db.collection(MongoCollections.MANDIS).document(mandi_id).get()
        if not doc.exists:
            raise not_found("Mandi not found")
        result = doc.to_dict()
        result["id"] = doc.id
        return result

    # ── Create mandi ─────────────────────────────────────────────

    @staticmethod
    async def create_mandi(db, data: dict) -> dict:
        """Create a new mandi."""
        required = ["name", "state", "district"]
        for field in required:
            if field not in data:
                raise bad_request(f"Missing required field: {field}")

        mandi_id = uuid.uuid4().hex
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            **data,
            "created_at": now,
            "updated_at": now,
        }
        await db.collection(MongoCollections.MANDIS).document(mandi_id).set(doc)

        doc["id"] = mandi_id
        return doc

    # ── Update mandi ─────────────────────────────────────────────

    @staticmethod
    async def update_mandi(db, mandi_id: str, data: dict) -> dict:
        """Update an existing mandi."""
        ref = db.collection(MongoCollections.MANDIS).document(mandi_id)
        existing = await ref.get()
        if not existing.exists:
            raise not_found("Mandi not found")

        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await ref.update(data)

        updated = await ref.get()
        result = updated.to_dict()
        result["id"] = updated.id
        return result

    # ── Delete mandi ─────────────────────────────────────────────

    @staticmethod
    async def delete_mandi(db, mandi_id: str) -> None:
        """Delete a mandi."""
        ref = db.collection(MongoCollections.MANDIS).document(mandi_id)
        existing = await ref.get()
        if not existing.exists:
            raise not_found("Mandi not found")
        await ref.delete()

