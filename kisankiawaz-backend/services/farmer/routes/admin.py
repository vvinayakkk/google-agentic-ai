"""Admin-only farmer management routes."""

from fastapi import APIRouter, Depends, Query

from shared.auth.deps import get_current_admin
from shared.core.constants import DEFAULT_PAGE, DEFAULT_PER_PAGE
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus

from services.farmer_service import FarmerService

router = APIRouter()


@router.get("/", status_code=HttpStatus.OK)
async def list_farmers(
    page: int = Query(default=DEFAULT_PAGE, ge=1),
    per_page: int = Query(default=DEFAULT_PER_PAGE, ge=1, le=100),
    _admin: dict = Depends(get_current_admin),
):
    """Paginated list of all farmer profiles (admin only)."""
    db = get_async_db()
    return await FarmerService.list_farmers(db=db, page=page, per_page=per_page)


@router.get("/{farmer_id}", status_code=HttpStatus.OK)
async def get_farmer(farmer_id: str, _admin: dict = Depends(get_current_admin)):
    """Get a specific farmer profile by ID (admin only)."""
    db = get_async_db()
    return await FarmerService.get_farmer_by_id(db=db, farmer_id=farmer_id)
