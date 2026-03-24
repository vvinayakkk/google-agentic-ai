"""Analytics service routes — pre-computed analytics endpoints."""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from shared.auth.deps import get_current_admin, get_current_user
from shared.db.firebase import get_firestore
from shared.core.constants import Firestore
from shared.errors import HttpStatus

router = APIRouter()


@router.get("/overview", status_code=HttpStatus.OK)
async def get_overview(date: str = Query(None), admin: dict = Depends(get_current_admin)):
    """Get daily analytics overview."""
    db = get_firestore()
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = await db.collection(Firestore.ANALYTICS_SNAPSHOTS).document(date).get()
    if doc.exists:
        return doc.to_dict()
    return {"date": date, "message": "No snapshot available"}


@router.get("/trends", status_code=HttpStatus.OK)
async def get_trends(days: int = Query(7, ge=1, le=90), admin: dict = Depends(get_current_admin)):
    """Get analytics trend over multiple days."""
    db = get_firestore()
    now = datetime.now(timezone.utc)
    results = []
    for i in range(days):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        doc = await db.collection(Firestore.ANALYTICS_SNAPSHOTS).document(d).get()
        if doc.exists:
            results.append(doc.to_dict())
    return {"days": days, "snapshots": results}


@router.get("/farmers/growth", status_code=HttpStatus.OK)
async def farmer_growth(days: int = Query(30, ge=1, le=365), admin: dict = Depends(get_current_admin)):
    """Farmer registration growth over time."""
    db = get_firestore()
    now = datetime.now(timezone.utc)
    daily_counts = {}
    async for doc in db.collection(Firestore.USERS).where("role", "==", "farmer").stream():
        data = doc.to_dict()
        created = data.get("created_at", "")
        if isinstance(created, str) and len(created) >= 10:
            day = created[:10]
            daily_counts[day] = daily_counts.get(day, 0) + 1

    series = []
    for i in range(days):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        series.append({"date": d, "count": daily_counts.get(d, 0)})
    series.reverse()
    return {"days": days, "series": series}


@router.get("/agent/usage", status_code=HttpStatus.OK)
async def agent_usage(days: int = Query(7, ge=1, le=30), admin: dict = Depends(get_current_admin)):
    """Agent query usage over time."""
    db = get_firestore()
    now = datetime.now(timezone.utc)
    daily_counts = {}
    async for doc in db.collection(Firestore.AGENT_CONVERSATIONS).stream():
        data = doc.to_dict()
        last_msg = data.get("last_message_at", "")
        if isinstance(last_msg, str) and len(last_msg) >= 10:
            day = last_msg[:10]
            daily_counts[day] = daily_counts.get(day, 0) + data.get("message_count", 1)

    series = []
    for i in range(days):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        series.append({"date": d, "queries": daily_counts.get(d, 0)})
    series.reverse()
    return {"days": days, "series": series}


@router.get("/market/popular-commodities", status_code=HttpStatus.OK)
async def popular_commodities(limit: int = Query(20, ge=1, le=50), admin: dict = Depends(get_current_admin)):
    """Most queried/available commodities by mandi price count."""
    db = get_firestore()
    from collections import Counter
    counter = Counter()
    async for doc in db.collection(Firestore.REF_MANDI_PRICES).limit(5000).stream():
        commodity = doc.to_dict().get("commodity", "")
        if commodity:
            counter[commodity] += 1
    return {"commodities": [{"commodity": c, "count": n} for c, n in counter.most_common(limit)]}


@router.get("/farmer/{farmer_id}/summary", status_code=HttpStatus.OK)
async def farmer_summary(farmer_id: str, user: dict = Depends(get_current_user)):
    """Personal analytics for a farmer (their own usage)."""
    db = get_firestore()
    # Count conversations
    convo_count = 0
    async for _ in db.collection(Firestore.AGENT_CONVERSATIONS).where("user_id", "==", farmer_id).stream():
        convo_count += 1

    # Count crops
    crop_count = 0
    async for _ in db.collection(Firestore.CROPS).where("farmer_id", "==", farmer_id).stream():
        crop_count += 1

    # Count bookings
    booking_count = 0
    async for _ in db.collection(Firestore.EQUIPMENT_BOOKINGS).where("renter_id", "==", farmer_id).stream():
        booking_count += 1

    return {
        "farmer_id": farmer_id,
        "total_conversations": convo_count,
        "total_crops": crop_count,
        "total_bookings": booking_count,
    }
