"""Equipment CRUD routes."""

from fastapi import APIRouter, Depends, Query

from shared.auth.deps import get_current_farmer
from shared.core.constants import MongoCollections
from shared.db.mongodb import FieldFilter, get_async_db
from shared.errors import HttpStatus
from shared.schemas.equipment import EquipmentRecordCreate, EquipmentRecordUpdate

from services.equipment_service import EquipmentService

router = APIRouter(prefix="", tags=["Equipment"])


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
async def list_equipment(
    browse: bool = Query(default=False, description="When true, return all available listings for marketplace browsing"),
    user: dict = Depends(get_current_farmer),
):
    """List the authenticated farmer's equipment."""
    db = get_async_db()
    if browse:
        state, district = await _resolve_user_geo(db=db, user_id=user["id"])
        return await EquipmentService.list_all_available(
            db=db,
            preferred_state=state,
            preferred_district=district,
        )
    return await EquipmentService.list_equipment(db=db, farmer_id=user["id"])


@router.post("/", status_code=HttpStatus.CREATED)
async def add_equipment(
    body: EquipmentRecordCreate,
    user: dict = Depends(get_current_farmer),
):
    """Add a piece of equipment."""
    db = get_async_db()
    return await EquipmentService.add_equipment(db=db, farmer_id=user["id"], data=body.model_dump())


@router.get("/{equipment_id}", status_code=HttpStatus.OK)
async def get_equipment(
    equipment_id: str,
    user: dict = Depends(get_current_farmer),
):
    """Get a single equipment item (ownership check)."""
    db = get_async_db()
    return await EquipmentService.get_equipment(db=db, equipment_id=equipment_id, farmer_id=user["id"])


@router.put("/{equipment_id}", status_code=HttpStatus.OK)
async def update_equipment(
    equipment_id: str,
    body: EquipmentRecordUpdate,
    user: dict = Depends(get_current_farmer),
):
    """Update equipment (ownership check)."""
    db = get_async_db()
    return await EquipmentService.update_equipment(
        db=db,
        equipment_id=equipment_id,
        farmer_id=user["id"],
        data=body.model_dump(exclude_none=True),
    )


@router.delete("/{equipment_id}", status_code=HttpStatus.NO_CONTENT)
async def delete_equipment(
    equipment_id: str,
    user: dict = Depends(get_current_farmer),
):
    """Delete equipment (ownership check)."""
    db = get_async_db()
    await EquipmentService.delete_equipment(db=db, equipment_id=equipment_id, farmer_id=user["id"])
