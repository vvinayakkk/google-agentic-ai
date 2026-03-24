"""Rental management routes."""

from fastapi import APIRouter, Depends

from shared.auth.deps import get_current_farmer
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus

from services.rental_service import RentalService

router = APIRouter(prefix="/rentals", tags=["Rentals"])


@router.get("/", status_code=HttpStatus.OK)
async def list_rentals(
    user: dict = Depends(get_current_farmer),
):
    """List rental requests (both as owner and renter)."""
    db = get_async_db()
    return await RentalService.list_rentals(db=db, user_id=user["id"])


@router.post("/", status_code=HttpStatus.CREATED)
async def create_rental(
    body: dict,
    user: dict = Depends(get_current_farmer),
):
    """Create a rental request for equipment."""
    db = get_async_db()
    return await RentalService.create_rental(db=db, renter_id=user["id"], data=body)


@router.get("/{rental_id}", status_code=HttpStatus.OK)
async def get_rental(
    rental_id: str,
    user: dict = Depends(get_current_farmer),
):
    """Get rental details."""
    db = get_async_db()
    return await RentalService.get_rental(db=db, rental_id=rental_id, user_id=user["id"])


@router.put("/{rental_id}/approve", status_code=HttpStatus.OK)
async def approve_rental(
    rental_id: str,
    user: dict = Depends(get_current_farmer),
):
    """Owner approves a rental request."""
    db = get_async_db()
    return await RentalService.approve_rental(db=db, rental_id=rental_id, owner_id=user["id"])


@router.put("/{rental_id}/reject", status_code=HttpStatus.OK)
async def reject_rental(
    rental_id: str,
    user: dict = Depends(get_current_farmer),
):
    """Owner rejects a rental request."""
    db = get_async_db()
    return await RentalService.reject_rental(db=db, rental_id=rental_id, owner_id=user["id"])


@router.put("/{rental_id}/complete", status_code=HttpStatus.OK)
async def complete_rental(
    rental_id: str,
    user: dict = Depends(get_current_farmer),
):
    """Mark a rental as complete."""
    db = get_async_db()
    return await RentalService.complete_rental(db=db, rental_id=rental_id, owner_id=user["id"])


@router.put("/{rental_id}/cancel", status_code=HttpStatus.OK)
async def cancel_rental(
    rental_id: str,
    user: dict = Depends(get_current_farmer),
):
    """Renter cancels a rental request."""
    db = get_async_db()
    return await RentalService.cancel_rental(db=db, rental_id=rental_id, renter_id=user["id"])
