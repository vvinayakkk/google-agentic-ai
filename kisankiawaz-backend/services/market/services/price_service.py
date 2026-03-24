"""Market price business logic."""

import uuid
from datetime import datetime, timezone

from shared.db.mongodb import FieldFilter

from shared.core.constants import MongoCollections
from shared.errors import not_found, bad_request, ErrorCode


class PriceService:
    """Static methods for market price operations."""

    # ── List prices ──────────────────────────────────────────────

    @staticmethod
    async def list_prices(db, filters: dict, page: int, per_page: int) -> dict:
        """Return paginated market prices, optionally filtered."""
        query = db.collection(MongoCollections.MARKET_PRICES)

        if filters.get("crop"):
            query = query.where(filter=FieldFilter("crop_name", "==", filters["crop"]))
        if filters.get("state"):
            query = query.where(filter=FieldFilter("state", "==", filters["state"]))
        if filters.get("mandi"):
            query = query.where(filter=FieldFilter("mandi_name", "==", filters["mandi"]))

        offset = (page - 1) * per_page

        docs = [d async for d in query.stream()]
        items = []
        for doc in docs:
            item = doc.to_dict()
            item["id"] = doc.id
            items.append(item)

        # Sort and paginate in Python (avoids composite index requirement)
        items.sort(key=lambda x: x.get("date", ""), reverse=True)
        items = items[offset:offset + per_page]

        return {
            "items": items,
            "page": page,
            "per_page": per_page,
            "count": len(items),
        }

    # ── Get single price ─────────────────────────────────────────

    @staticmethod
    async def get_price(db, price_id: str) -> dict:
        """Return a single market price entry."""
        doc = await db.collection(MongoCollections.MARKET_PRICES).document(price_id).get()
        if not doc.exists:
            raise not_found("Market price entry not found")
        result = doc.to_dict()
        result["id"] = doc.id
        return result

    # ── Create price ─────────────────────────────────────────────

    @staticmethod
    async def create_price(db, data: dict) -> dict:
        """Create a new market price entry."""
        required = ["crop_name", "mandi_name", "state", "modal_price"]
        for field in required:
            if field not in data:
                raise bad_request(f"Missing required field: {field}")

        price_id = uuid.uuid4().hex
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            **data,
            "created_at": now,
            "updated_at": now,
        }
        await db.collection(MongoCollections.MARKET_PRICES).document(price_id).set(doc)

        doc["id"] = price_id
        return doc

    # ── Update price ─────────────────────────────────────────────

    @staticmethod
    async def update_price(db, price_id: str, data: dict) -> dict:
        """Update an existing market price entry."""
        ref = db.collection(MongoCollections.MARKET_PRICES).document(price_id)
        existing = await ref.get()
        if not existing.exists:
            raise not_found("Market price entry not found")

        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await ref.update(data)

        updated = await ref.get()
        result = updated.to_dict()
        result["id"] = updated.id
        return result

    # ── Delete price ─────────────────────────────────────────────

    @staticmethod
    async def delete_price(db, price_id: str) -> None:
        """Delete a market price entry."""
        ref = db.collection(MongoCollections.MARKET_PRICES).document(price_id)
        existing = await ref.get()
        if not existing.exists:
            raise not_found("Market price entry not found")
        await ref.delete()

