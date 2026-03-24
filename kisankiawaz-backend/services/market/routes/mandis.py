"""Mandi routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from shared.auth.deps import get_current_user, get_current_admin
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus

from services.mandi_service import MandiService

router = APIRouter(prefix="/mandis", tags=["Mandis"])


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
    filters = {"state": state, "district": district}
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
    body: dict,
    admin: dict = Depends(get_current_admin),
):
    """Admin creates a mandi."""
    db = get_async_db()
    return await MandiService.create_mandi(db=db, data=body)


@router.put("/{mandi_id}", status_code=HttpStatus.OK)
async def update_mandi(
    mandi_id: str,
    body: dict,
    admin: dict = Depends(get_current_admin),
):
    """Admin updates a mandi."""
    db = get_async_db()
    return await MandiService.update_mandi(db=db, mandi_id=mandi_id, data=body)


@router.delete("/{mandi_id}", status_code=HttpStatus.NO_CONTENT)
async def delete_mandi(
    mandi_id: str,
    admin: dict = Depends(get_current_admin),
):
    """Admin deletes a mandi."""
    db = get_async_db()
    await MandiService.delete_mandi(db=db, mandi_id=mandi_id)
