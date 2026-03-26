"""Market price routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from shared.auth.deps import get_current_user, get_current_admin
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus
from shared.schemas.market import AdminPriceUpsert

from services.price_service import PriceService

router = APIRouter(prefix="/prices", tags=["Market Prices"])


@router.get("/", status_code=HttpStatus.OK)
async def list_prices(
    crop: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    mandi: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """List recent market prices with optional filters."""
    db = get_async_db()
    filters = {"crop": crop, "state": state, "mandi": mandi}
    return await PriceService.list_prices(db=db, filters=filters, page=page, per_page=per_page)


@router.get("/{price_id}", status_code=HttpStatus.OK)
async def get_price(
    price_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a single market price entry."""
    db = get_async_db()
    return await PriceService.get_price(db=db, price_id=price_id)


@router.post("/", status_code=HttpStatus.CREATED)
async def create_price(
    body: AdminPriceUpsert,
    admin: dict = Depends(get_current_admin),
):
    """Admin creates a market price entry."""
    db = get_async_db()
    return await PriceService.create_price(db=db, data=body.model_dump(exclude_none=True))


@router.put("/{price_id}", status_code=HttpStatus.OK)
async def update_price(
    price_id: str,
    body: AdminPriceUpsert,
    admin: dict = Depends(get_current_admin),
):
    """Admin updates a market price entry."""
    db = get_async_db()
    return await PriceService.update_price(
        db=db,
        price_id=price_id,
        data=body.model_dump(exclude_none=True),
    )


@router.delete("/{price_id}", status_code=HttpStatus.NO_CONTENT)
async def delete_price(
    price_id: str,
    admin: dict = Depends(get_current_admin),
):
    """Admin deletes a market price entry."""
    db = get_async_db()
    await PriceService.delete_price(db=db, price_id=price_id)
