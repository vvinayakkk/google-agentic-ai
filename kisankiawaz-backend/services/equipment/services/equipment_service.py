"""Equipment business logic."""

import uuid
from datetime import datetime, timezone

from shared.db.mongodb import FieldFilter

from shared.core.constants import MongoCollections
from shared.errors import not_found, bad_request, unauthorized, ErrorCode


class EquipmentService:
    _ALLOWED_FIELDS = {
        "name",
        "type",
        "status",
        "rate_per_hour",
        "rate_per_day",
        "location",
        "contact_phone",
        "description",
    }

    """Static methods for equipment CRUD operations."""

    # ── List equipment ───────────────────────────────────────────

    @staticmethod
    async def list_equipment(db, farmer_id: str) -> dict:
        """Return all equipment belonging to the farmer."""
        query = db.collection(MongoCollections.EQUIPMENT).where(
            filter=FieldFilter("farmer_id", "==", farmer_id)
        )
        docs = [d async for d in query.stream()]
        items = []
        for doc in docs:
            item = doc.to_dict()
            item["id"] = doc.id
            items.append(item)
        return {"items": items, "count": len(items)}

    @staticmethod
    async def list_all_available(
        db,
        preferred_state: str = "",
        preferred_district: str = "",
    ) -> dict:
        """Return all available equipment across all farmers for browsing."""
        query = db.collection(MongoCollections.EQUIPMENT).where(
            filter=FieldFilter("status", "==", "available")
        )
        docs = [d async for d in query.stream()]
        items = []
        for doc in docs:
            item = doc.to_dict()
            item["id"] = doc.id
            items.append(item)

        state_norm = str(preferred_state or "").strip().lower()
        district_norm = str(preferred_district or "").strip().lower()

        def _score(item: dict) -> int:
            if not state_norm and not district_norm:
                return 0
            item_state = str(item.get("state") or "").strip().lower()
            item_district = str(item.get("district") or item.get("location") or "").strip().lower()

            score = 0
            if state_norm and item_state == state_norm:
                score += 2
            if district_norm and district_norm in item_district:
                score += 3
            return score

        items.sort(key=lambda x: str(x.get("name") or "").lower())
        items.sort(key=lambda x: str(x.get("updated_at") or x.get("created_at") or ""), reverse=True)
        items.sort(key=_score, reverse=True)
        return {"items": items, "count": len(items)}

    # ── Add equipment ────────────────────────────────────────────

    @staticmethod
    async def add_equipment(db, farmer_id: str, data: dict) -> dict:
        """Create a new equipment entry for the farmer."""
        data = {k: v for k, v in data.items() if k in EquipmentService._ALLOWED_FIELDS}
        required = ["name", "type"]
        for field in required:
            if field not in data:
                raise bad_request(f"Missing required field: {field}")

        equipment_id = uuid.uuid4().hex
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            **data,
            "farmer_id": farmer_id,
            "status": data.get("status", "available"),
            "created_at": now,
            "updated_at": now,
        }
        await db.collection(MongoCollections.EQUIPMENT).document(equipment_id).set(doc)

        doc["id"] = equipment_id
        return doc

    # ── Get equipment ────────────────────────────────────────────

    @staticmethod
    async def get_equipment(db, equipment_id: str, farmer_id: str) -> dict:
        """Return a single equipment item with ownership check."""
        doc = await db.collection(MongoCollections.EQUIPMENT).document(equipment_id).get()
        if not doc.exists:
            raise not_found("Equipment not found")

        result = doc.to_dict()
        if result.get("farmer_id") != farmer_id:
            raise unauthorized("You do not own this equipment")

        result["id"] = doc.id
        return result

    # ── Update equipment ─────────────────────────────────────────

    @staticmethod
    async def update_equipment(db, equipment_id: str, farmer_id: str, data: dict) -> dict:
        """Update an equipment item with ownership check."""
        ref = db.collection(MongoCollections.EQUIPMENT).document(equipment_id)
        existing = await ref.get()
        if not existing.exists:
            raise not_found("Equipment not found")

        existing_data = existing.to_dict()
        if existing_data.get("farmer_id") != farmer_id:
            raise unauthorized("You do not own this equipment")

        updates = {k: v for k, v in data.items() if k in EquipmentService._ALLOWED_FIELDS}
        if not updates:
            raise bad_request("No valid fields to update")
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await ref.update(updates)

        updated = await ref.get()
        result = updated.to_dict()
        result["id"] = updated.id
        return result

    # ── Delete equipment ─────────────────────────────────────────

    @staticmethod
    async def delete_equipment(db, equipment_id: str, farmer_id: str) -> None:
        """Delete an equipment item with ownership check."""
        ref = db.collection(MongoCollections.EQUIPMENT).document(equipment_id)
        existing = await ref.get()
        if not existing.exists:
            raise not_found("Equipment not found")

        existing_data = existing.to_dict()
        if existing_data.get("farmer_id") != farmer_id:
            raise unauthorized("You do not own this equipment")

        await ref.delete()

