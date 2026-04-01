"""Farmer profile CRUD routes."""

from fastapi import APIRouter, Depends

from shared.auth.deps import get_current_farmer
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus
from shared.schemas.farmer import (
    FarmerProfileCreate,
    FarmerProfileMePatch,
    FarmerProfileUpdate,
)

from services.farmer_service import FarmerService

router = APIRouter()


@router.get("/me/profile", status_code=HttpStatus.OK)
async def get_profile(user: dict = Depends(get_current_farmer)):
    """Return the current farmer's profile."""
    db = get_async_db()
    user_id = user.get("id") or user.get("uid") or user.get("user_id")
    return await FarmerService.get_profile(db=db, user_id=user_id)


@router.post("/me/profile", status_code=HttpStatus.CREATED)
async def create_profile(
    body: FarmerProfileCreate,
    user: dict = Depends(get_current_farmer),
):
    """Create a farmer profile."""
    db = get_async_db()
    user_id = user.get("id") or user.get("uid") or user.get("user_id")
    return await FarmerService.create_profile(db=db, user_id=user_id, data=body.model_dump())


@router.put("/me/profile", status_code=HttpStatus.OK)
async def update_profile(
    body: FarmerProfileUpdate,
    user: dict = Depends(get_current_farmer),
):
    """Update the current farmer's profile."""
    db = get_async_db()
    user_id = user.get("id") or user.get("uid") or user.get("user_id")
    return await FarmerService.update_profile(
        db=db, user_id=user_id, data=body.model_dump(exclude_unset=True),
    )


@router.patch("/me", status_code=HttpStatus.OK)
async def patch_profile(
    body: FarmerProfileMePatch,
    user: dict = Depends(get_current_farmer),
):
    """Patch profile fields (used by document vault persistence)."""
    db = get_async_db()
    user_id = user.get("id") or user.get("uid") or user.get("user_id")
    return await FarmerService.patch_profile(
        db=db,
        user_id=user_id,
        data=body.model_dump(exclude_unset=True),
    )


@router.delete("/me/profile", status_code=HttpStatus.NO_CONTENT)
async def delete_profile(user: dict = Depends(get_current_farmer)):
    """Delete the current farmer's profile."""
    db = get_async_db()
    user_id = user.get("id") or user.get("uid") or user.get("user_id")
    await FarmerService.delete_profile(db=db, user_id=user_id)
