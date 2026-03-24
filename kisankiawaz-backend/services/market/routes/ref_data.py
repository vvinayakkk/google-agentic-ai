"""New reference data routes for market service — cold storage, reservoir, MSP, trends."""

from fastapi import APIRouter, Query, Depends
from shared.auth.deps import get_current_user
from shared.db.firebase import get_firestore
from shared.core.constants import Firestore
from shared.errors import HttpStatus
from typing import Optional

router = APIRouter(prefix="/ref-data", tags=["Reference Data"])


@router.get("/cold-storage", status_code=HttpStatus.OK)
async def get_cold_storage(state: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    """Get cold storage capacity by state from ref data."""
    db = get_firestore()
    query = db.collection(Firestore.REF_COLD_STORAGE)
    if state:
        query = query.where("state", "==", state)
    items = []
    async for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        items.append(data)
    return {"items": items, "total": len(items)}


@router.get("/reservoir", status_code=HttpStatus.OK)
async def get_reservoir(state: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    """Get reservoir data by state."""
    db = get_firestore()
    query = db.collection(Firestore.REF_RESERVOIR_DATA)
    if state:
        query = query.where("state", "==", state)
    items = []
    async for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        items.append(data)
    return {"items": items, "total": len(items)}


@router.get("/msp-data", status_code=HttpStatus.OK)
async def get_msp_firestore(user: dict = Depends(get_current_user)):
    """Get MSP data from Firestore."""
    db = get_firestore()
    items = []
    async for doc in db.collection(Firestore.REF_MSP_PRICES).stream():
        data = doc.to_dict()
        data["id"] = doc.id
        items.append(data)
    return {"items": items, "total": len(items)}


@router.get("/mandi-directory", status_code=HttpStatus.OK)
async def get_mandi_directory(
    state: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    user: dict = Depends(get_current_user),
):
    """Get mandi directory from ref data."""
    db = get_firestore()
    query = db.collection(Firestore.REF_MANDI_DIRECTORY)
    if state:
        query = query.where("state", "==", state)
    query = query.limit(limit)
    items = []
    async for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        items.append(data)
    return {"items": items, "total": len(items)}


@router.get("/price-trends", status_code=HttpStatus.OK)
async def get_price_trends(
    commodity: str = Query(...),
    state: Optional[str] = Query(None),
    market: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    """Get price trend for a commodity using ref_mandi_prices."""
    db = get_firestore()
    query = db.collection(Firestore.REF_MANDI_PRICES).where("commodity", "==", commodity)
    if state:
        query = query.where("state", "==", state)
    if market:
        query = query.where("market", "==", market)

    prices = []
    async for doc in query.stream():
        data = doc.to_dict()
        prices.append(data)

    if not prices:
        return {"commodity": commodity, "trend": "STABLE", "avg_modal_price": 0, "price_points": []}

    prices.sort(key=lambda x: x.get("arrival_date", ""))
    modal_prices = [p.get("modal_price", 0) for p in prices if p.get("modal_price")]
    avg = sum(modal_prices) / len(modal_prices) if modal_prices else 0

    # Calculate trend
    if len(modal_prices) >= 4:
        first_half = sum(modal_prices[:len(modal_prices)//2]) / max(len(modal_prices)//2, 1)
        second_half = sum(modal_prices[len(modal_prices)//2:]) / max(len(modal_prices)//2, 1)
        if second_half > first_half * 1.05:
            trend = "UP"
        elif second_half < first_half * 0.95:
            trend = "DOWN"
        else:
            trend = "STABLE"
    else:
        trend = "STABLE"

    return {
        "commodity": commodity,
        "state": state or "All India",
        "market": market or "All Markets",
        "trend": trend,
        "avg_modal_price": round(avg, 2),
        "total_records": len(prices),
        "price_points": [{"date": p.get("arrival_date", ""), "modal_price": p.get("modal_price", 0)} for p in prices[-30:]],
    }
