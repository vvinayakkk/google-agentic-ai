"""Government scheme business logic."""

import uuid
from datetime import datetime, timezone

from shared.db.mongodb import FieldFilter

from shared.core.constants import MongoCollections
from shared.errors import not_found, bad_request, ErrorCode


class SchemeService:
    _ALLOWED_FIELDS = {
        "name",
        "description",
        "category",
        "state",
        "is_active",
    }

    """Static methods for government scheme operations."""

    # ── List schemes ─────────────────────────────────────────────

    @staticmethod
    async def list_schemes(db, filters: dict, page: int, per_page: int) -> dict:
        """Return paginated government schemes, optionally filtered."""
        query = db.collection(MongoCollections.GOVERNMENT_SCHEMES)

        if filters.get("state"):
            query = query.where(filter=FieldFilter("state", "==", filters["state"]))
        if filters.get("category"):
            query = query.where(filter=FieldFilter("category", "==", filters["category"]))
        if filters.get("is_active") is not None:
            query = query.where(filter=FieldFilter("is_active", "==", filters["is_active"]))

        offset = (page - 1) * per_page

        docs = [d async for d in query.stream()]
        items = []
        for doc in docs:
            item = doc.to_dict()
            item["id"] = doc.id
            items.append(item)

        # Fallback to built-in scheme dataset when MongoCollections has not been seeded yet.
        if not items:
            from services.government_schemes_data import ALL_SCHEMES

            for idx, scheme in enumerate(ALL_SCHEMES, start=1):
                item = dict(scheme)
                item["id"] = item.get("id") or f"builtin-scheme-{idx}"
                items.append(item)

            if filters.get("state"):
                state_filter = str(filters["state"]).lower()
                items = [
                    s for s in items
                    if str(s.get("state", "")).lower() in {"all", state_filter}
                ]
            if filters.get("category"):
                cat_filter = str(filters["category"]).lower()
                items = [s for s in items if str(s.get("category", "")).lower() == cat_filter]
            if filters.get("is_active") is not None:
                is_active = bool(filters["is_active"])
                items = [s for s in items if bool(s.get("is_active", True)) == is_active]

        # Sort and paginate in Python (avoids composite index requirement)
        items.sort(key=lambda x: x.get("name", ""))
        items = items[offset:offset + per_page]

        return {
            "items": items,
            "page": page,
            "per_page": per_page,
            "count": len(items),
        }

    # ── Get single scheme ────────────────────────────────────────

    @staticmethod
    async def get_scheme(db, scheme_id: str) -> dict:
        """Return a single government scheme."""
        doc = await db.collection(MongoCollections.GOVERNMENT_SCHEMES).document(scheme_id).get()
        if not doc.exists:
            raise not_found("Government scheme not found")
        result = doc.to_dict()
        result["id"] = doc.id
        return result

    # ── Create scheme ────────────────────────────────────────────

    @staticmethod
    async def create_scheme(db, data: dict) -> dict:
        """Create a new government scheme."""
        data = {k: v for k, v in data.items() if k in SchemeService._ALLOWED_FIELDS}
        required = ["name", "description"]
        for field in required:
            if field not in data:
                raise bad_request(f"Missing required field: {field}")

        scheme_id = uuid.uuid4().hex
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            **data,
            "is_active": data.get("is_active", True),
            "created_at": now,
            "updated_at": now,
        }
        await db.collection(MongoCollections.GOVERNMENT_SCHEMES).document(scheme_id).set(doc)

        doc["id"] = scheme_id
        return doc

    # ── Update scheme ────────────────────────────────────────────

    @staticmethod
    async def update_scheme(db, scheme_id: str, data: dict) -> dict:
        """Update an existing government scheme."""
        ref = db.collection(MongoCollections.GOVERNMENT_SCHEMES).document(scheme_id)
        existing = await ref.get()
        if not existing.exists:
            raise not_found("Government scheme not found")

        updates = {k: v for k, v in data.items() if k in SchemeService._ALLOWED_FIELDS}
        if not updates:
            raise bad_request("No valid fields to update")
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await ref.update(updates)

        updated = await ref.get()
        result = updated.to_dict()
        result["id"] = updated.id
        return result

    # ── Delete scheme ────────────────────────────────────────────

    @staticmethod
    async def delete_scheme(db, scheme_id: str) -> None:
        """Delete a government scheme."""
        ref = db.collection(MongoCollections.GOVERNMENT_SCHEMES).document(scheme_id)
        existing = await ref.get()
        if not existing.exists:
            raise not_found("Government scheme not found")
        await ref.delete()

    # ── Check eligibility ────────────────────────────────────────

    @staticmethod
    async def check_eligibility(db, farmer_id: str) -> dict:
        """Check which active schemes a farmer is eligible for.

        Looks up the farmer profile, fetches active schemes matching
        the farmer's state, and returns each scheme with an
        ``eligibility_match`` boolean.
        """
        # 1. Lookup farmer profile
        profile_doc = await db.collection(MongoCollections.FARMER_PROFILES).document(farmer_id).get()
        if not profile_doc.exists:
            # Try looking up by user_id field
            query = (
                db.collection(MongoCollections.FARMER_PROFILES)
                .where(filter=FieldFilter("user_id", "==", farmer_id))
                .limit(1)
            )
            docs = [d async for d in query.stream()]
            if not docs:
                raise not_found("Farmer profile not found")
            farmer = docs[0].to_dict()
            farmer["id"] = docs[0].id
        else:
            farmer = profile_doc.to_dict()
            farmer["id"] = profile_doc.id

        farmer_state = farmer.get("state", "")

        # 2. Fetch active schemes (optionally filter by farmer state)
        schemes_query = db.collection(MongoCollections.GOVERNMENT_SCHEMES).where(
            filter=FieldFilter("is_active", "==", True)
        )
        all_schemes = [d async for d in schemes_query.stream()]

        results = []
        for scheme_doc in all_schemes:
            scheme = scheme_doc.to_dict()
            scheme["id"] = scheme_doc.id

            # Eligibility logic: scheme applies if no state restriction
            # or farmer's state matches
            scheme_state = scheme.get("state", "")
            eligibility_match = (
                not scheme_state
                or scheme_state.lower() == "all"
                or scheme_state.lower() == farmer_state.lower()
            )

            results.append({
                "scheme_id": scheme["id"],
                "scheme_name": scheme.get("name", ""),
                "category": scheme.get("category", ""),
                "benefits": scheme.get("benefits", ""),
                "eligibility_match": eligibility_match,
            })

        return {
            "farmer_id": farmer["id"],
            "farmer_state": farmer_state,
            "schemes": results,
            "eligible_count": sum(1 for r in results if r["eligibility_match"]),
            "total_active_schemes": len(results),
        }

