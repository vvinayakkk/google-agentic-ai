"""Livestock business logic."""

import uuid
from datetime import datetime, timezone

from google.cloud.firestore_v1.base_query import FieldFilter

from shared.core.constants import Firestore
from shared.errors import not_found, bad_request, unauthorized, ErrorCode


class LivestockService:
    """Static methods for livestock CRUD operations."""

    # ── List livestock ───────────────────────────────────────────

    @staticmethod
    async def list_livestock(db, farmer_id: str) -> dict:
        """Return all livestock records for the farmer."""
        query = db.collection(Firestore.LIVESTOCK).where(
            filter=FieldFilter("farmer_id", "==", farmer_id)
        )
        docs = [d async for d in query.stream()]
        items = []
        for doc in docs:
            item = doc.to_dict()
            item["id"] = doc.id
            items.append(item)
        return {"items": items, "count": len(items)}

    # ── Add livestock ────────────────────────────────────────────

    @staticmethod
    async def add_livestock(db, farmer_id: str, data: dict) -> dict:
        """Create a new livestock record for the farmer."""
        required = ["type", "breed", "count"]
        for field in required:
            if field not in data:
                raise bad_request(f"Missing required field: {field}")

        livestock_id = uuid.uuid4().hex
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            **data,
            "farmer_id": farmer_id,
            "health_status": data.get("health_status", "healthy"),
            "created_at": now,
            "updated_at": now,
        }
        await db.collection(Firestore.LIVESTOCK).document(livestock_id).set(doc)

        doc["id"] = livestock_id
        return doc

    # ── Get livestock ────────────────────────────────────────────

    @staticmethod
    async def get_livestock(db, livestock_id: str, farmer_id: str) -> dict:
        """Return a single livestock record with ownership check."""
        doc = await db.collection(Firestore.LIVESTOCK).document(livestock_id).get()
        if not doc.exists:
            raise not_found("Livestock record not found")

        result = doc.to_dict()
        if result.get("farmer_id") != farmer_id:
            raise unauthorized("You do not own this livestock record")

        result["id"] = doc.id
        return result

    # ── Update livestock ─────────────────────────────────────────

    @staticmethod
    async def update_livestock(db, livestock_id: str, farmer_id: str, data: dict) -> dict:
        """Update a livestock record with ownership check."""
        ref = db.collection(Firestore.LIVESTOCK).document(livestock_id)
        existing = await ref.get()
        if not existing.exists:
            raise not_found("Livestock record not found")

        existing_data = existing.to_dict()
        if existing_data.get("farmer_id") != farmer_id:
            raise unauthorized("You do not own this livestock record")

        # Prevent overwriting farmer_id
        data.pop("farmer_id", None)
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await ref.update(data)

        updated = await ref.get()
        result = updated.to_dict()
        result["id"] = updated.id
        return result

    # ── Delete livestock ─────────────────────────────────────────

    @staticmethod
    async def delete_livestock(db, livestock_id: str, farmer_id: str) -> None:
        """Delete a livestock record with ownership check."""
        ref = db.collection(Firestore.LIVESTOCK).document(livestock_id)
        existing = await ref.get()
        if not existing.exists:
            raise not_found("Livestock record not found")

        existing_data = existing.to_dict()
        if existing_data.get("farmer_id") != farmer_id:
            raise unauthorized("You do not own this livestock record")

        await ref.delete()
