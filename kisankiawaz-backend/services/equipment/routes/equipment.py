"""Equipment CRUD routes."""

from fastapi import APIRouter, Depends

from shared.auth.deps import get_current_farmer
from shared.db.firebase import get_firestore
from shared.errors import HttpStatus

from services.equipment_service import EquipmentService

router = APIRouter(prefix="", tags=["Equipment"])


@router.get("/", status_code=HttpStatus.OK)
async def list_equipment(
    user: dict = Depends(get_current_farmer),
):
    """List the authenticated farmer's equipment."""
    db = get_firestore()
    return await EquipmentService.list_equipment(db=db, farmer_id=user["id"])


@router.post("/", status_code=HttpStatus.CREATED)
async def add_equipment(
    body: dict,
    user: dict = Depends(get_current_farmer),
):
    """Add a piece of equipment."""
    db = get_firestore()
    return await EquipmentService.add_equipment(db=db, farmer_id=user["id"], data=body)


@router.get("/{equipment_id}", status_code=HttpStatus.OK)
async def get_equipment(
    equipment_id: str,
    user: dict = Depends(get_current_farmer),
):
    """Get a single equipment item (ownership check)."""
    db = get_firestore()
    return await EquipmentService.get_equipment(db=db, equipment_id=equipment_id, farmer_id=user["id"])


@router.put("/{equipment_id}", status_code=HttpStatus.OK)
async def update_equipment(
    equipment_id: str,
    body: dict,
    user: dict = Depends(get_current_farmer),
):
    """Update equipment (ownership check)."""
    db = get_firestore()
    return await EquipmentService.update_equipment(
        db=db, equipment_id=equipment_id, farmer_id=user["id"], data=body,
    )


@router.delete("/{equipment_id}", status_code=HttpStatus.NO_CONTENT)
async def delete_equipment(
    equipment_id: str,
    user: dict = Depends(get_current_farmer),
):
    """Delete equipment (ownership check)."""
    db = get_firestore()
    await EquipmentService.delete_equipment(db=db, equipment_id=equipment_id, farmer_id=user["id"])
