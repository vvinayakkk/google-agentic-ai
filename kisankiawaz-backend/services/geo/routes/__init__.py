"""Geo service routes."""

from fastapi import APIRouter, Depends, Query
from shared.auth.deps import get_current_user
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus
from shared.schemas.geo import VillageSearchRequest
from services.geo_service import GeoService

router = APIRouter()


@router.get("/pin/{pincode}", status_code=HttpStatus.OK)
async def get_pin(pincode: str, user: dict = Depends(get_current_user)):
    """Look up location details by PIN code."""
    db = get_async_db()
    return await GeoService.lookup_pincode(db, pincode)


@router.post("/village/search", status_code=HttpStatus.OK)
async def search_village(body: VillageSearchRequest, user: dict = Depends(get_current_user)):
    """Search for a village by name (fuzzy via Qdrant)."""
    return await GeoService.search_village(query=body.query, state=body.state, limit=body.limit)


@router.get("/district/{state}", status_code=HttpStatus.OK)
async def get_districts(state: str, user: dict = Depends(get_current_user)):
    """List all districts in a state."""
    db = get_async_db()
    return await GeoService.get_districts(db, state)


@router.get("/states", status_code=HttpStatus.OK)
async def get_states(user: dict = Depends(get_current_user)):
    """List all states."""
    db = get_async_db()
    return await GeoService.get_states(db)
