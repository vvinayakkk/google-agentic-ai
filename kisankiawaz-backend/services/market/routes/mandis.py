"""Mandi routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from shared.core.constants import MongoCollections
from shared.auth.deps import get_current_user, get_current_admin
from shared.db.mongodb import FieldFilter, get_async_db
from shared.errors import HttpStatus
from shared.schemas.market import AdminMandiUpsert

from services.mandi_service import MandiService

router = APIRouter(prefix="/mandis", tags=["Mandis"])


async def _resolve_user_geo(db, user_id: str) -> tuple[str, str]:
    profiles = db.collection(MongoCollections.FARMER_PROFILES)

    docs = await (
        profiles.where(filter=FieldFilter("user_id", "==", user_id)).limit(1).get()
    )
    if not docs:
        docs = await (
            profiles.where(filter=FieldFilter("farmer_id", "==", user_id)).limit(1).get()
        )

    profile = docs[0].to_dict() if docs else {}
    state = str((profile or {}).get("state") or "").strip()
    district = str((profile or {}).get("district") or "").strip()
    return state, district


@router.get("/", status_code=HttpStatus.OK)
async def list_mandis(
    state: Optional[str] = Query(default=None),
    district: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """List all mandis with optional filters."""
    db = get_async_db()
    effective_state = (state or "").strip()
    effective_district = (district or "").strip()

    if not effective_state or not effective_district:
        profile_state, profile_district = await _resolve_user_geo(db=db, user_id=user["id"])
        if not effective_state and profile_state:
            effective_state = profile_state
        if (
            not effective_district
            and profile_district
            and (
                not effective_state
                or effective_state.lower() == str(profile_state or "").lower()
            )
        ):
            effective_district = profile_district

    filters = {
        "state": effective_state or None,
        "district": effective_district or None,
    }
    return await MandiService.list_mandis(db=db, filters=filters, page=page, per_page=per_page)


@router.get("/{mandi_id}", status_code=HttpStatus.OK)
async def get_mandi(
    mandi_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a single mandi."""
    db = get_async_db()
    return await MandiService.get_mandi(db=db, mandi_id=mandi_id)


@router.post("/", status_code=HttpStatus.CREATED)
async def create_mandi(
    body: AdminMandiUpsert,
    admin: dict = Depends(get_current_admin),
):
    """Admin creates a mandi."""
    db = get_async_db()
    return await MandiService.create_mandi(db=db, data=body.model_dump(exclude_none=True))


@router.put("/{mandi_id}", status_code=HttpStatus.OK)
async def update_mandi(
    mandi_id: str,
    body: AdminMandiUpsert,
    admin: dict = Depends(get_current_admin),
):
    """Admin updates a mandi."""
    db = get_async_db()
    return await MandiService.update_mandi(
        db=db,
        mandi_id=mandi_id,
        data=body.model_dump(exclude_none=True),
    )


@router.delete("/{mandi_id}", status_code=HttpStatus.NO_CONTENT)
async def delete_mandi(
    mandi_id: str,
    admin: dict = Depends(get_current_admin),
):
    """Admin deletes a mandi."""
    db = get_async_db()
    await MandiService.delete_mandi(db=db, mandi_id=mandi_id)
