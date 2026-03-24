"""Farmer dashboard route."""

from fastapi import APIRouter, Depends

from shared.auth.deps import get_current_farmer
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus

from services.farmer_service import FarmerService

router = APIRouter()


@router.get("/me/dashboard", status_code=HttpStatus.OK)
async def get_dashboard(user: dict = Depends(get_current_farmer)):
    """Aggregated farmer dashboard."""
    db = get_async_db()
    return await FarmerService.get_dashboard(db=db, user_id=user["id"])
