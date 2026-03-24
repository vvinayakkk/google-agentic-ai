"""Government scheme routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from shared.auth.deps import get_current_user, get_current_admin
from shared.db.firebase import get_firestore
from shared.errors import HttpStatus

from services.scheme_service import SchemeService

router = APIRouter(prefix="/schemes", tags=["Government Schemes"])


class EligibilityRequest(BaseModel):
    """Body for eligibility check."""

    farmer_id: str = Field(..., min_length=1)


@router.get("/", status_code=HttpStatus.OK)
async def list_schemes(
    state: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """List government schemes with optional filters."""
    db = get_firestore()
    filters = {"state": state, "category": category, "is_active": is_active}
    return await SchemeService.list_schemes(db=db, filters=filters, page=page, per_page=per_page)


@router.get("/{scheme_id}", status_code=HttpStatus.OK)
async def get_scheme(
    scheme_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a single government scheme."""
    db = get_firestore()
    return await SchemeService.get_scheme(db=db, scheme_id=scheme_id)


@router.post("/", status_code=HttpStatus.CREATED)
async def create_scheme(
    body: dict,
    admin: dict = Depends(get_current_admin),
):
    """Admin creates a government scheme."""
    db = get_firestore()
    return await SchemeService.create_scheme(db=db, data=body)


@router.put("/{scheme_id}", status_code=HttpStatus.OK)
async def update_scheme(
    scheme_id: str,
    body: dict,
    admin: dict = Depends(get_current_admin),
):
    """Admin updates a government scheme."""
    db = get_firestore()
    return await SchemeService.update_scheme(db=db, scheme_id=scheme_id, data=body)


@router.delete("/{scheme_id}", status_code=HttpStatus.NO_CONTENT)
async def delete_scheme(
    scheme_id: str,
    admin: dict = Depends(get_current_admin),
):
    """Admin deletes a government scheme."""
    db = get_firestore()
    await SchemeService.delete_scheme(db=db, scheme_id=scheme_id)


@router.post("/check-eligibility", status_code=HttpStatus.OK)
async def check_eligibility(
    body: EligibilityRequest,
    user: dict = Depends(get_current_user),
):
    """Check a farmer's eligibility for government schemes."""
    db = get_firestore()
    return await SchemeService.check_eligibility(db=db, farmer_id=body.farmer_id)
