"""Core farmer business logic."""

import uuid
from datetime import datetime, timezone

from shared.core.constants import MongoCollections
from shared.errors import not_found, conflict, ErrorCode


class FarmerService:
    """Static methods for farmer profile operations."""

    # ── Get profile ──────────────────────────────────────────────

    @staticmethod
    async def get_profile(db, user_id: str) -> dict:
        """Return the farmer profile linked to *user_id*."""
        query = (
            db.collection(MongoCollections.FARMER_PROFILES)
            .where("user_id", "==", user_id)
            .limit(1)
        )
        docs = [d async for d in query.stream()]
        if not docs:
            raise not_found("Farmer profile not found")
        profile = docs[0].to_dict()
        profile["id"] = docs[0].id
        return profile

    # ── Create profile ───────────────────────────────────────────

    @staticmethod
    async def create_profile(db, user_id: str, data: dict) -> dict:
        """Create a new farmer profile (one per user)."""
        existing = (
            db.collection(MongoCollections.FARMER_PROFILES)
            .where("user_id", "==", user_id)
            .limit(1)
        )
        docs = [d async for d in existing.stream()]
        if docs:
            raise conflict("Profile already exists", ErrorCode.RESOURCE_EXISTS)

        profile_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        doc = {**data, "user_id": user_id, "created_at": now, "updated_at": now}
        await db.collection(MongoCollections.FARMER_PROFILES).document(profile_id).set(doc)

        doc["id"] = profile_id
        return doc

    # ── Update profile ───────────────────────────────────────────

    @staticmethod
    async def update_profile(db, user_id: str, data: dict) -> dict:
        """Update an existing farmer profile."""
        query = (
            db.collection(MongoCollections.FARMER_PROFILES)
            .where("user_id", "==", user_id)
            .limit(1)
        )
        docs = [d async for d in query.stream()]
        if not docs:
            raise not_found("Farmer profile not found")

        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.collection(MongoCollections.FARMER_PROFILES).document(docs[0].id).update(data)

        updated = await db.collection(MongoCollections.FARMER_PROFILES).document(docs[0].id).get()
        result = updated.to_dict()
        result["id"] = updated.id
        return result

    # ── Delete profile ───────────────────────────────────────────

    @staticmethod
    async def delete_profile(db, user_id: str) -> None:
        """Delete the farmer profile for *user_id*."""
        query = (
            db.collection(MongoCollections.FARMER_PROFILES)
            .where("user_id", "==", user_id)
            .limit(1)
        )
        docs = [d async for d in query.stream()]
        if not docs:
            raise not_found("Farmer profile not found")
        await db.collection(MongoCollections.FARMER_PROFILES).document(docs[0].id).delete()

    # ── Dashboard ────────────────────────────────────────────────

    @staticmethod
    async def get_dashboard(db, user_id: str) -> dict:
        """Aggregate profile, crops, livestock, and unread notifications."""
        # Profile
        profile = None
        pq = (
            db.collection(MongoCollections.FARMER_PROFILES)
            .where("user_id", "==", user_id)
            .limit(1)
        )
        pdocs = [d async for d in pq.stream()]
        if pdocs:
            profile = pdocs[0].to_dict()
            profile["id"] = pdocs[0].id

        # Crops
        crops: list[dict] = []
        cq = db.collection(MongoCollections.CROPS).where("farmer_id", "==", user_id)
        async for doc in cq.stream():
            c = doc.to_dict()
            c["id"] = doc.id
            crops.append(c)

        # Livestock
        livestock: list[dict] = []
        lq = db.collection(MongoCollections.LIVESTOCK).where("farmer_id", "==", user_id)
        async for doc in lq.stream():
            ls = doc.to_dict()
            ls["id"] = doc.id
            livestock.append(ls)

        # Unread notifications
        nq = (
            db.collection(MongoCollections.NOTIFICATIONS)
            .where("user_id", "==", user_id)
            .where("is_read", "==", False)
        )
        notif_docs = [d async for d in nq.stream()]

        return {
            "profile": profile,
            "crops": crops,
            "livestock": livestock,
            "unread_notifications": len(notif_docs),
        }

    # ── Admin: list farmers ──────────────────────────────────────

    @staticmethod
    async def list_farmers(db, page: int, per_page: int) -> dict:
        """Return a paginated list of farmer profiles."""
        offset = (page - 1) * per_page
        query = (
            db.collection(MongoCollections.FARMER_PROFILES)
            .order_by("created_at")
            .offset(offset)
            .limit(per_page)
        )
        results: list[dict] = []
        async for doc in query.stream():
            item = doc.to_dict()
            item["id"] = doc.id
            results.append(item)

        return {"page": page, "per_page": per_page, "items": results}

    # ── Admin: get farmer by id ──────────────────────────────────

    @staticmethod
    async def get_farmer_by_id(db, farmer_id: str) -> dict:
        """Get a single farmer profile document by ID."""
        doc = await db.collection(MongoCollections.FARMER_PROFILES).document(farmer_id).get()
        if not doc.exists:
            raise not_found("Farmer profile not found")
        result = doc.to_dict()
        result["id"] = doc.id
        return result
