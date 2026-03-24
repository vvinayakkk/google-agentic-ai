"""Crop CRUD routes."""

from fastapi import APIRouter, Depends

from shared.auth.deps import get_current_farmer
from shared.db.firebase import get_firestore
from shared.errors import HttpStatus
from shared.schemas.crop import CropCreate, CropUpdate

from services.crop_service import CropService

router = APIRouter()


@router.get("/", status_code=HttpStatus.OK)
async def list_crops(user: dict = Depends(get_current_farmer)):
    """List all crops for the current farmer."""
    db = get_firestore()
    return await CropService.list_crops(db=db, farmer_id=user["id"])


@router.post("/", status_code=HttpStatus.CREATED)
async def add_crop(body: CropCreate, user: dict = Depends(get_current_farmer)):
    """Add a new crop record."""
    db = get_firestore()
    return await CropService.add_crop(db=db, farmer_id=user["id"], data=body.model_dump())


@router.get("/{crop_id}", status_code=HttpStatus.OK)
async def get_crop(crop_id: str, user: dict = Depends(get_current_farmer)):
    """Get a single crop by ID."""
    db = get_firestore()
    return await CropService.get_crop(db=db, crop_id=crop_id, farmer_id=user["id"])


@router.put("/{crop_id}", status_code=HttpStatus.OK)
async def update_crop(
    crop_id: str,
    body: CropUpdate,
    user: dict = Depends(get_current_farmer),
):
    """Update a crop record."""
    db = get_firestore()
    return await CropService.update_crop(
        db=db, crop_id=crop_id, farmer_id=user["id"],
        data=body.model_dump(exclude_unset=True),
    )


@router.delete("/{crop_id}", status_code=HttpStatus.NO_CONTENT)
async def delete_crop(crop_id: str, user: dict = Depends(get_current_farmer)):
    """Delete a crop record."""
    db = get_firestore()
    await CropService.delete_crop(db=db, crop_id=crop_id, farmer_id=user["id"])
