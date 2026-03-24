"""
Equipment rental rate routes.
Provides comprehensive rental rate data for agricultural equipment across India.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from shared.auth.deps import get_current_user, get_current_admin
from shared.db.firebase import get_firestore
from shared.errors import HttpStatus

from services.equipment_rental_data import (
    get_all_equipment,
    get_equipment_by_category,
    get_equipment_by_name,
    get_equipment_rate_for_state,
    get_categories,
    get_chc_info,
    search_equipment,
    EquipmentRentalSyncService,
)

router = APIRouter(prefix="/rental-rates", tags=["Equipment Rental Rates"])


@router.get("/", status_code=HttpStatus.OK)
async def list_rental_rates(
    category: Optional[str] = Query(default=None, description="Filter by category key"),
    state: Optional[str] = Query(default=None, description="Get state-specific rates"),
    search: Optional[str] = Query(default=None, description="Search by keyword"),
    user: dict = Depends(get_current_user),
):
    """
    List all equipment rental rates across India.
    Optionally filter by category, state, or keyword.
    """
    if search:
        equipment = search_equipment(search)
    elif category:
        equipment = get_equipment_by_category(category)
    else:
        equipment = get_all_equipment()

    # Add state-specific rates if requested
    if state:
        for e in equipment:
            state_var = e.get("state_variations", {}).get(state)
            if state_var:
                e["state_rate"] = state_var
                e["rate_source"] = "state_specific"
            else:
                e["rate_source"] = "national_average"

    return {
        "equipment": equipment,
        "total": len(equipment),
        "state_filter": state,
    }


@router.get("/categories", status_code=HttpStatus.OK)
async def list_equipment_categories(
    user: dict = Depends(get_current_user),
):
    """List all equipment categories."""
    categories = get_categories()
    return {"categories": categories}


@router.get("/chc-info", status_code=HttpStatus.OK)
async def get_chc_information(
    user: dict = Depends(get_current_user),
):
    """Get Custom Hiring Centre (CHC) information and how to find them."""
    return {"chc": get_chc_info()}


@router.get("/search", status_code=HttpStatus.OK)
async def search_rental_equipment(
    q: str = Query(..., description="Search query"),
    state: Optional[str] = Query(default=None),
    user: dict = Depends(get_current_user),
):
    """Search equipment by name, description, or category."""
    results = search_equipment(q)

    if state:
        for e in results:
            state_var = e.get("state_variations", {}).get(state)
            if state_var:
                e["state_rate"] = state_var

    return {"results": results, "total": len(results), "query": q}


@router.get("/{equipment_name}", status_code=HttpStatus.OK)
async def get_equipment_rate(
    equipment_name: str,
    state: Optional[str] = Query(default=None),
    user: dict = Depends(get_current_user),
):
    """Get rental rate details for specific equipment, optionally with state-specific pricing."""
    if state:
        result = get_equipment_rate_for_state(equipment_name, state)
        if result:
            return result
    
    equip = get_equipment_by_name(equipment_name)
    if not equip:
        return {
            "message": f"Equipment '{equipment_name}' not found",
            "available": [e["name"] for e in get_all_equipment()],
        }
    return equip


# ── Admin / Seed ─────────────────────────────────────────────────

@router.post("/seed", status_code=HttpStatus.CREATED)
async def seed_equipment_rental_data(
    user: dict = Depends(get_current_user),
):
    """Seed all equipment rental data into Firestore."""
    db = get_firestore()
    sync_service = EquipmentRentalSyncService()
    result = await sync_service.seed_to_firestore(db)
    return result


@router.post("/embed", status_code=HttpStatus.OK)
async def embed_equipment_data(
    user: dict = Depends(get_current_user),
):
    """Embed equipment rental data into Qdrant knowledge base."""
    sync_service = EquipmentRentalSyncService()
    result = await sync_service.embed_to_qdrant()
    return result
