"""
Real-time mandi and market data routes.
Integrates live data.gov.in API for massive mandi information.
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from google.cloud.firestore_v1.base_query import FieldFilter

from shared.auth.deps import get_current_user, get_current_admin
from shared.db.firebase import get_firestore
from shared.errors import HttpStatus
from shared.core.constants import Firestore

from services.mandi_data_fetcher import (
    MandiDataFetcher,
    MandiDataSyncService,
    get_msp_price,
    get_all_msp_prices,
    MAJOR_COMMODITIES,
    INDIAN_STATES,
    MSP_PRICES,
)

router = APIRouter(prefix="/live-market", tags=["Live Market Data"])


async def _query_firestore_prices(
    db,
    state: Optional[str] = None,
    commodity: Optional[str] = None,
    district: Optional[str] = None,
    limit: int = 100,
) -> list[dict]:
    """Load market prices from Firestore in live-market response shape."""
    query = db.collection(Firestore.MARKET_PRICES)

    if state:
        query = query.where(filter=FieldFilter("state", "==", state.strip()))
    if commodity:
        query = query.where(filter=FieldFilter("crop_name", "==", commodity.strip()))
    if district:
        query = query.where(filter=FieldFilter("district", "==", district.strip()))

    docs = [d async for d in query.limit(min(limit, 1000)).stream()]
    items = []
    for doc in docs:
        data = doc.to_dict()
        items.append(
            {
                "market": data.get("mandi_name", ""),
                "commodity": data.get("crop_name", ""),
                "variety": data.get("variety", ""),
                "state": data.get("state", ""),
                "district": data.get("district", ""),
                "min_price": float(data.get("min_price", 0) or 0),
                "max_price": float(data.get("max_price", 0) or 0),
                "modal_price": float(data.get("modal_price", 0) or 0),
                "unit": data.get("unit", "quintal"),
                "arrival_date": data.get("date", ""),
                "source": data.get("source", "firestore"),
            }
        )

    items.sort(key=lambda x: x.get("arrival_date", ""), reverse=True)
    return items[:limit]


async def _query_firestore_mandis(
    db,
    state: Optional[str] = None,
    limit: int = 200,
) -> list[dict]:
    """Load mandi directory from Firestore."""
    query = db.collection(Firestore.MANDIS)
    if state:
        query = query.where(filter=FieldFilter("state", "==", state.strip()))

    docs = [d async for d in query.limit(min(limit, 1000)).stream()]
    items = []
    for doc in docs:
        data = doc.to_dict()
        items.append(
            {
                "name": data.get("name", ""),
                "state": data.get("state", ""),
                "district": data.get("district", ""),
                "source": data.get("source", "firestore"),
            }
        )
    return items


# ── Request Models ───────────────────────────────────────────────

class SyncRequest(BaseModel):
    states: Optional[List[str]] = Field(default=None, description="List of states to sync")
    commodity: Optional[str] = Field(default=None, description="Specific commodity to sync")


# ── Live Price Endpoints ─────────────────────────────────────────

@router.get("/prices", status_code=HttpStatus.OK)
async def get_live_prices(
    state: Optional[str] = Query(default=None),
    commodity: Optional[str] = Query(default=None),
    district: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    refresh: bool = Query(default=False, description="Force live fetch from data.gov.in"),
    user: dict = Depends(get_current_user),
):
    """Get commodity prices with DB-first strategy and optional live refresh."""
    db = get_firestore()
    if not refresh:
        cached_prices = await _query_firestore_prices(
            db=db,
            state=state,
            commodity=commodity,
            district=district,
            limit=limit,
        )
        if cached_prices:
            return {
                "prices": cached_prices,
                "total": len(cached_prices),
                "source": "firestore",
                "filters": {"state": state, "commodity": commodity, "district": district},
                "cache_hit": True,
            }

    fetcher = MandiDataFetcher()
    try:
        prices = await fetcher.fetch_daily_prices(
            state=state,
            commodity=commodity,
            district=district,
            limit=limit,
        )
        if not prices:
            cached_prices = await _query_firestore_prices(
                db=db,
                state=state,
                commodity=commodity,
                district=district,
                limit=limit,
            )
            if cached_prices:
                return {
                    "prices": cached_prices,
                    "total": len(cached_prices),
                    "source": "firestore_fallback",
                    "filters": {"state": state, "commodity": commodity, "district": district},
                    "cache_hit": True,
                }
            relaxed_prices = await _query_firestore_prices(
                db=db,
                state=None,
                commodity=commodity,
                district=None,
                limit=limit,
            )
            if relaxed_prices:
                return {
                    "prices": relaxed_prices,
                    "total": len(relaxed_prices),
                    "source": "firestore_relaxed_fallback",
                    "filters": {
                        "state": state,
                        "commodity": commodity,
                        "district": district,
                        "relaxed": True,
                    },
                    "cache_hit": True,
                }
        return {
            "prices": prices,
            "total": len(prices),
            "source": "data.gov.in",
            "filters": {"state": state, "commodity": commodity, "district": district},
            "cache_hit": False,
        }
    finally:
        await fetcher.close()


@router.get("/prices/all-india", status_code=HttpStatus.OK)
async def get_all_india_prices(
    commodity: str = Query(..., description="Commodity name"),
    limit: int = Query(default=500, ge=1, le=1000),
    refresh: bool = Query(default=False, description="Force live fetch from data.gov.in"),
    user: dict = Depends(get_current_user),
):
    """Get prices for a commodity across India with DB-first lookup."""
    db = get_firestore()
    if not refresh:
        cached_prices = await _query_firestore_prices(
            db=db,
            commodity=commodity,
            limit=limit,
        )
        if cached_prices:
            return {
                "commodity": commodity,
                "prices": cached_prices,
                "total": len(cached_prices),
                "source": "firestore",
                "cache_hit": True,
            }

    fetcher = MandiDataFetcher()
    try:
        prices = await fetcher.fetch_commodity_prices_all_india(commodity, limit=limit)
        if not prices:
            cached_prices = await _query_firestore_prices(
                db=db,
                commodity=commodity,
                limit=limit,
            )
            if cached_prices:
                return {
                    "commodity": commodity,
                    "prices": cached_prices,
                    "total": len(cached_prices),
                    "source": "firestore_fallback",
                    "cache_hit": True,
                }
            relaxed_prices = await _query_firestore_prices(
                db=db,
                commodity=None,
                limit=limit,
            )
            if relaxed_prices:
                return {
                    "commodity": commodity,
                    "prices": relaxed_prices,
                    "total": len(relaxed_prices),
                    "source": "firestore_relaxed_fallback",
                    "cache_hit": True,
                }
        return {
            "commodity": commodity,
            "prices": prices,
            "total": len(prices),
            "source": "data.gov.in",
            "cache_hit": False,
        }
    finally:
        await fetcher.close()


@router.get("/prices/bulk", status_code=HttpStatus.OK)
async def get_bulk_prices(
    limit_per_state: int = Query(default=100, ge=1, le=500),
    user: dict = Depends(get_current_user),
):
    """
    Fetch MASSIVE price data from top agricultural states.
    Pulls data from 15+ states simultaneously.
    """
    fetcher = MandiDataFetcher()
    try:
        prices = await fetcher.fetch_bulk_prices(limit_per_state=limit_per_state)
        
        # Group by state for summary
        state_summary = {}
        for p in prices:
            st = p.get("state", "Unknown")
            if st not in state_summary:
                state_summary[st] = {"count": 0, "commodities": set()}
            state_summary[st]["count"] += 1
            state_summary[st]["commodities"].add(p.get("commodity", ""))
        
        # Convert sets to lists for JSON
        for st in state_summary:
            state_summary[st]["commodities"] = list(state_summary[st]["commodities"])[:20]
        
        return {
            "prices": prices,
            "total": len(prices),
            "state_summary": state_summary,
            "source": "data.gov.in",
        }
    finally:
        await fetcher.close()


@router.get("/mandis", status_code=HttpStatus.OK)
async def get_live_mandi_list(
    state: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    refresh: bool = Query(default=False, description="Force live fetch from data.gov.in"),
    user: dict = Depends(get_current_user),
):
    """Fetch mandi list with live-first strategy and Firestore fallback."""
    db = get_firestore()

    fetcher = MandiDataFetcher()
    try:
        mandis = await fetcher.fetch_mandi_list(state=state, limit=limit)
        if mandis:
            return {
                "mandis": mandis,
                "total": len(mandis),
                "source": "data.gov.in",
                "cache_hit": False,
            }

        cached_mandis = await _query_firestore_mandis(db=db, state=state, limit=limit)
        if cached_mandis:
            return {
                "mandis": cached_mandis,
                "total": len(cached_mandis),
                "source": "firestore_fallback",
                "cache_hit": True,
            }

        return {
            "mandis": mandis,
            "total": len(mandis),
            "source": "data.gov.in",
            "cache_hit": False,
        }
    finally:
        await fetcher.close()


# ── MSP Endpoints ────────────────────────────────────────────────

@router.get("/msp", status_code=HttpStatus.OK)
async def get_msp(
    crop: Optional[str] = Query(default=None),
    commodity: Optional[str] = Query(default=None),
    user: dict = Depends(get_current_user),
):
    """Get all MSP values or a specific commodity MSP (query-param compatible)."""
    selected = crop or commodity
    if selected:
        msp = get_msp_price(selected)
        if msp is None:
            return {
                "commodity": selected,
                "msp": None,
                "message": f"MSP not available for '{selected}'. MSP is available for: {', '.join(MSP_PRICES.keys())}",
            }
        return {
            "commodity": selected,
            "msp": msp,
            "unit": "INR/quintal",
            "season": "2024-25",
        }

    return {
        "msp_prices": MSP_PRICES,
        "season": "2024-25",
        "total": len(MSP_PRICES),
        "note": "Prices in INR per quintal",
    }


@router.get("/msp/all", status_code=HttpStatus.OK)
async def get_all_msp_alias(
    user: dict = Depends(get_current_user),
):
    """Compatibility alias used by older frontend clients."""
    return {
        "msp_prices": MSP_PRICES,
        "season": "2024-25",
        "total": len(MSP_PRICES),
        "note": "Prices in INR per quintal",
    }


@router.get("/msp/{commodity}", status_code=HttpStatus.OK)
async def get_commodity_msp(
    commodity: str,
    user: dict = Depends(get_current_user),
):
    """Get MSP for a specific commodity."""
    msp = get_msp_price(commodity)
    if msp is None:
        return {
            "commodity": commodity,
            "msp": None,
            "message": f"MSP not available for '{commodity}'. MSP is available for: {', '.join(MSP_PRICES.keys())}",
        }
    return {
        "commodity": commodity,
        "msp": msp,
        "unit": "INR/quintal",
        "season": "2024-25",
    }


# ── Sync / Ingestion Endpoints ──────────────────────────────────

@router.post("/sync", status_code=HttpStatus.OK)
async def sync_market_data(
    body: SyncRequest = SyncRequest(),
    user: dict = Depends(get_current_user),
):
    """
    Sync live market data: Fetch from APIs → Store in Firestore → Embed in Qdrant.
    This can take a while for large syncs.
    """
    db = get_firestore()
    sync_service = MandiDataSyncService()
    try:
        if body.commodity:
            result = await sync_service.sync_prices_to_firestore(
                db, commodity=body.commodity
            )
        else:
            result = await sync_service.sync_prices_to_firestore(
                db, states=body.states
            )
        return result
    finally:
        await sync_service.close()


@router.post("/sync/full", status_code=HttpStatus.OK)
async def full_sync(
    body: SyncRequest = SyncRequest(),
    admin: dict = Depends(get_current_admin),
):
    """
    Full sync: Fetch prices + mandis → Firestore → Qdrant embeddings.
    Admin only. May take several minutes.
    """
    db = get_firestore()
    sync_service = MandiDataSyncService()
    try:
        result = await sync_service.full_sync(db, states=body.states)
        return result
    finally:
        await sync_service.close()


# ── Reference Data ───────────────────────────────────────────────

@router.get("/commodities", status_code=HttpStatus.OK)
async def list_commodities(
    user: dict = Depends(get_current_user),
):
    """List all supported commodity names for querying."""
    return {"commodities": MAJOR_COMMODITIES, "total": len(MAJOR_COMMODITIES)}


@router.get("/states", status_code=HttpStatus.OK)
async def list_states(
    user: dict = Depends(get_current_user),
):
    """List all Indian states for filtering."""
    return {"states": INDIAN_STATES, "total": len(INDIAN_STATES)}
