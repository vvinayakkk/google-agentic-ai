"""Core crop CRUD and recommendation logic."""

import uuid
from datetime import datetime, timezone

from shared.core.constants import Firestore
from shared.errors import not_found, forbidden, ErrorCode


class CropService:
    """Static methods for crop operations."""

    # ── List crops ───────────────────────────────────────────────

    @staticmethod
    async def list_crops(db, farmer_id: str) -> list[dict]:
        """Return all crops belonging to *farmer_id*."""
        query = db.collection(Firestore.CROPS).where("farmer_id", "==", farmer_id)
        results: list[dict] = []
        async for doc in query.stream():
            item = doc.to_dict()
            item["id"] = doc.id
            results.append(item)
        return results

    # ── Add crop ─────────────────────────────────────────────────

    @staticmethod
    async def add_crop(db, farmer_id: str, data: dict) -> dict:
        """Create a new crop record."""
        crop_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        doc = {**data, "farmer_id": farmer_id, "created_at": now, "updated_at": now}
        await db.collection(Firestore.CROPS).document(crop_id).set(doc)

        doc["id"] = crop_id
        return doc

    # ── Get crop ─────────────────────────────────────────────────

    @staticmethod
    async def get_crop(db, crop_id: str, farmer_id: str) -> dict:
        """Fetch a single crop with ownership check."""
        doc = await db.collection(Firestore.CROPS).document(crop_id).get()
        if not doc.exists:
            raise not_found("Crop not found")

        crop = doc.to_dict()
        if crop.get("farmer_id") != farmer_id:
            raise forbidden("Not your crop", ErrorCode.RESOURCE_FORBIDDEN)

        crop["id"] = doc.id
        return crop

    # ── Update crop ──────────────────────────────────────────────

    @staticmethod
    async def update_crop(db, crop_id: str, farmer_id: str, data: dict) -> dict:
        """Update a crop record after ownership check."""
        existing = await db.collection(Firestore.CROPS).document(crop_id).get()
        if not existing.exists:
            raise not_found("Crop not found")

        crop = existing.to_dict()
        if crop.get("farmer_id") != farmer_id:
            raise forbidden("Not your crop", ErrorCode.RESOURCE_FORBIDDEN)

        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.collection(Firestore.CROPS).document(crop_id).update(data)

        updated = await db.collection(Firestore.CROPS).document(crop_id).get()
        result = updated.to_dict()
        result["id"] = updated.id
        return result

    # ── Delete crop ──────────────────────────────────────────────

    @staticmethod
    async def delete_crop(db, crop_id: str, farmer_id: str) -> None:
        """Delete a crop record after ownership check."""
        existing = await db.collection(Firestore.CROPS).document(crop_id).get()
        if not existing.exists:
            raise not_found("Crop not found")

        crop = existing.to_dict()
        if crop.get("farmer_id") != farmer_id:
            raise forbidden("Not your crop", ErrorCode.RESOURCE_FORBIDDEN)

        await db.collection(Firestore.CROPS).document(crop_id).delete()

    # ── Recommendations ──────────────────────────────────────────

    @staticmethod
    async def get_recommendations(
        db, soil_type: str, season: str, state: str | None = None,
    ) -> dict:
        """Return suitable crops based on season and optional region.

        Queries CROP_CYCLES matching the season, optionally filtered by
        state/region, and returns the top matches.
        """
        query = (
            db.collection(Firestore.CROP_CYCLES)
            .where("season", "==", season.lower())
        )
        cycles: list[dict] = []
        async for doc in query.stream():
            item = doc.to_dict()
            item["id"] = doc.id
            # Optional region filter
            if state and item.get("region") and state.lower() not in item["region"].lower():
                continue
            # Optional soil-type relevance boost
            item["soil_match"] = (
                soil_type.lower() in (item.get("soil_type", "") or "").lower()
            )
            cycles.append(item)

        # Sort: soil matches first
        cycles.sort(key=lambda c: (not c.get("soil_match", False)))

        return {
            "soil_type": soil_type,
            "season": season,
            "state": state,
            "recommendations": cycles[:10],
        }
