"""Schemes service routes."""

from fastapi import APIRouter, Depends, Query
from shared.auth.deps import get_current_user
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus
from shared.schemas.scheme import SchemeSearchRequest
from services.schemes_service import SchemesService

router = APIRouter()


@router.get("/", status_code=HttpStatus.OK)
async def list_schemes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    ministry: str = Query(None),
    state: str = Query(None),
    user: dict = Depends(get_current_user),
):
    """List all schemes with optional filtering."""
    db = get_async_db()
    return await SchemesService.list_schemes(db, page=page, per_page=per_page, ministry=ministry, state=state)


@router.post("/search", status_code=HttpStatus.OK)
async def search_schemes(body: SchemeSearchRequest, user: dict = Depends(get_current_user)):
    """Semantic search over schemes using Qdrant."""
    return await SchemesService.semantic_search(
        query=body.query, state=body.state, ministry=body.ministry, limit=body.limit
    )


@router.post("/eligibility-check", status_code=HttpStatus.OK)
async def check_eligibility(
    scheme_id: str = Query(...),
    user: dict = Depends(get_current_user),
):
    """Check farmer eligibility for a scheme."""
    db = get_async_db()
    return await SchemesService.check_eligibility(db, scheme_id, user["id"])


@router.get("/pmfby", status_code=HttpStatus.OK)
async def get_pmfby(user: dict = Depends(get_current_user)):
    """Get PMFBY (crop insurance) data."""
    db = get_async_db()
    return await SchemesService.get_pmfby_data(db)


@router.get("/fertilizer-advisory", status_code=HttpStatus.OK)
async def get_fertilizer_advisory(user: dict = Depends(get_current_user)):
    """Get fertilizer advisory data."""
    db = get_async_db()
    return await SchemesService.get_fertilizer_data(db)


@router.get("/pesticide-advisory", status_code=HttpStatus.OK)
async def get_pesticide_advisory(user: dict = Depends(get_current_user)):
    """Get pesticide advisory data."""
    db = get_async_db()
    return await SchemesService.get_pesticide_data(db)


# This MUST come after all specific GET paths to avoid catch-all
@router.get("/{scheme_id}", status_code=HttpStatus.OK)
async def get_scheme(scheme_id: str, user: dict = Depends(get_current_user)):
    """Get a single scheme by ID."""
    db = get_async_db()
    return await SchemesService.get_scheme(db, scheme_id)
