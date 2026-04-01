"""Livestock CRUD routes."""

from fastapi import APIRouter, Depends

from shared.auth.deps import get_current_farmer
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus
from shared.schemas.livestock import LivestockRecordCreate, LivestockRecordUpdate

from services.livestock_service import LivestockService

router = APIRouter(prefix="/livestock", tags=["Livestock"])


@router.get("", status_code=HttpStatus.OK, include_in_schema=False)
@router.get("/", status_code=HttpStatus.OK)
async def list_livestock(
    user: dict = Depends(get_current_farmer),
):
    """List the authenticated farmer's livestock."""
    db = get_async_db()
    return await LivestockService.list_livestock(db=db, farmer_id=user["id"])


@router.post("/", status_code=HttpStatus.CREATED)
async def add_livestock(
    body: LivestockRecordCreate,
    user: dict = Depends(get_current_farmer),
):
    """Add livestock."""
    db = get_async_db()
    return await LivestockService.add_livestock(db=db, farmer_id=user["id"], data=body.model_dump())


@router.get("/{livestock_id}", status_code=HttpStatus.OK)
async def get_livestock(
    livestock_id: str,
    user: dict = Depends(get_current_farmer),
):
    """Get a single livestock record (ownership check)."""
    db = get_async_db()
    return await LivestockService.get_livestock(db=db, livestock_id=livestock_id, farmer_id=user["id"])


@router.put("/{livestock_id}", status_code=HttpStatus.OK)
async def update_livestock(
    livestock_id: str,
    body: LivestockRecordUpdate,
    user: dict = Depends(get_current_farmer),
):
    """Update livestock (ownership check)."""
    db = get_async_db()
    return await LivestockService.update_livestock(
        db=db,
        livestock_id=livestock_id,
        farmer_id=user["id"],
        data=body.model_dump(exclude_none=True),
    )


@router.delete("/{livestock_id}", status_code=HttpStatus.NO_CONTENT)
async def delete_livestock(
    livestock_id: str,
    user: dict = Depends(get_current_farmer),
):
    """Delete livestock (ownership check)."""
    db = get_async_db()
    await LivestockService.delete_livestock(db=db, livestock_id=livestock_id, farmer_id=user["id"])
