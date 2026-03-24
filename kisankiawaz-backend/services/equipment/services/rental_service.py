"""Rental business logic."""

import uuid
from datetime import datetime, timezone

from google.cloud.firestore_v1.base_query import FieldFilter

from shared.core.constants import Firestore
from shared.errors import not_found, bad_request, unauthorized, ErrorCode


class RentalService:
    """Static methods for rental management operations."""

    # ── List rentals ─────────────────────────────────────────────

    @staticmethod
    async def list_rentals(db, user_id: str) -> dict:
        """Return rentals where the user is either the owner or renter."""
        # Rentals as renter
        renter_query = db.collection(Firestore.EQUIPMENT_BOOKINGS).where(
            filter=FieldFilter("renter_id", "==", user_id)
        )
        renter_docs = [d async for d in renter_query.stream()]

        # Rentals as owner
        owner_query = db.collection(Firestore.EQUIPMENT_BOOKINGS).where(
            filter=FieldFilter("owner_id", "==", user_id)
        )
        owner_docs = [d async for d in owner_query.stream()]

        # Merge and de-duplicate
        seen = set()
        items = []
        for doc in renter_docs + owner_docs:
            if doc.id not in seen:
                seen.add(doc.id)
                item = doc.to_dict()
                item["id"] = doc.id
                items.append(item)

        return {"items": items, "count": len(items)}

    # ── Create rental ────────────────────────────────────────────

    @staticmethod
    async def create_rental(db, renter_id: str, data: dict) -> dict:
        """Create a rental request for a piece of equipment."""
        equipment_id = data.get("equipment_id")
        if not equipment_id:
            raise bad_request("Missing required field: equipment_id")

        # Verify equipment exists
        equip_doc = await db.collection(Firestore.EQUIPMENT).document(equipment_id).get()
        if not equip_doc.exists:
            raise not_found("Equipment not found")

        equip_data = equip_doc.to_dict()
        owner_id = equip_data.get("farmer_id")

        if owner_id == renter_id:
            raise bad_request("Cannot rent your own equipment")

        rental_id = uuid.uuid4().hex
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            "equipment_id": equipment_id,
            "equipment_name": equip_data.get("name", ""),
            "owner_id": owner_id,
            "renter_id": renter_id,
            "start_date": data.get("start_date", ""),
            "end_date": data.get("end_date", ""),
            "message": data.get("message", ""),
            "status": "pending",
            "created_at": now,
            "updated_at": now,
        }
        await db.collection(Firestore.EQUIPMENT_BOOKINGS).document(rental_id).set(doc)

        doc["id"] = rental_id
        return doc

    # ── Get rental ───────────────────────────────────────────────

    @staticmethod
    async def get_rental(db, rental_id: str, user_id: str) -> dict:
        """Return a single rental. User must be owner or renter."""
        doc = await db.collection(Firestore.EQUIPMENT_BOOKINGS).document(rental_id).get()
        if not doc.exists:
            raise not_found("Rental not found")

        result = doc.to_dict()
        if result.get("owner_id") != user_id and result.get("renter_id") != user_id:
            raise unauthorized("Access denied to this rental")

        result["id"] = doc.id
        return result

    # ── Helper: fetch + verify owner ─────────────────────────────

    @staticmethod
    async def _get_rental_as_owner(db, rental_id: str, owner_id: str) -> tuple:
        """Fetch rental doc and verify the caller is the equipment owner."""
        ref = db.collection(Firestore.EQUIPMENT_BOOKINGS).document(rental_id)
        doc = await ref.get()
        if not doc.exists:
            raise not_found("Rental not found")
        data = doc.to_dict()
        if data.get("owner_id") != owner_id:
            raise unauthorized("Only the equipment owner can perform this action")
        return ref, data

    # ── Approve rental ───────────────────────────────────────────

    @staticmethod
    async def approve_rental(db, rental_id: str, owner_id: str) -> dict:
        """Owner approves a pending rental request."""
        ref, data = await RentalService._get_rental_as_owner(db, rental_id, owner_id)
        if data.get("status") != "pending":
            raise bad_request("Only pending rentals can be approved")

        update = {
            "status": "approved",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await ref.update(update)

        updated = await ref.get()
        result = updated.to_dict()
        result["id"] = updated.id
        return result

    # ── Reject rental ────────────────────────────────────────────

    @staticmethod
    async def reject_rental(db, rental_id: str, owner_id: str) -> dict:
        """Owner rejects a pending rental request."""
        ref, data = await RentalService._get_rental_as_owner(db, rental_id, owner_id)
        if data.get("status") != "pending":
            raise bad_request("Only pending rentals can be rejected")

        update = {
            "status": "rejected",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await ref.update(update)

        updated = await ref.get()
        result = updated.to_dict()
        result["id"] = updated.id
        return result

    # ── Complete rental ──────────────────────────────────────────

    @staticmethod
    async def complete_rental(db, rental_id: str, owner_id: str) -> dict:
        """Owner marks an approved rental as complete."""
        ref, data = await RentalService._get_rental_as_owner(db, rental_id, owner_id)
        if data.get("status") != "approved":
            raise bad_request("Only approved rentals can be completed")

        update = {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await ref.update(update)

        updated = await ref.get()
        result = updated.to_dict()
        result["id"] = updated.id
        return result

    # ── Cancel rental ────────────────────────────────────────────

    @staticmethod
    async def cancel_rental(db, rental_id: str, renter_id: str) -> dict:
        """Renter cancels a pending or approved rental."""
        ref = db.collection(Firestore.EQUIPMENT_BOOKINGS).document(rental_id)
        doc = await ref.get()
        if not doc.exists:
            raise not_found("Rental not found")

        data = doc.to_dict()
        if data.get("renter_id") != renter_id:
            raise unauthorized("Only the renter can cancel this rental")

        if data.get("status") not in ("pending", "approved"):
            raise bad_request("Only pending or approved rentals can be cancelled")

        update = {
            "status": "cancelled",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await ref.update(update)

        updated = await ref.get()
        result = updated.to_dict()
        result["id"] = updated.id
        return result
