"""Analytics service routes — comprehensive rule-based platform insights."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

from shared.auth.deps import get_current_admin, get_current_user
from shared.core.constants import UserRole
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus, forbidden
from shared.schemas.analytics import AdminInsightOverview, FarmerInsightSummary

from services.insight_service import InsightService

router = APIRouter(tags=["Analytics"])


@router.get("/overview", status_code=HttpStatus.OK, response_model=AdminInsightOverview)
async def get_overview(
    days: int = Query(30, ge=7, le=180),
    _admin: dict = Depends(get_current_admin),
):
    """Unified god-level admin insights across growth, engagement, risk, and opportunity."""
    db = get_async_db()
    return await InsightService.build_admin_overview(db=db, days=days)


@router.get("/insights/kpis", status_code=HttpStatus.OK)
async def get_kpis(
    days: int = Query(30, ge=7, le=180),
    _admin: dict = Depends(get_current_admin),
):
    """High-level KPI scorecards optimized for admin dashboard cards."""
    db = get_async_db()
    overview = await InsightService.build_admin_overview(db=db, days=days)
    return {"window_days": days, "generated_at": overview["generated_at"], "scorecard": overview["scorecard"]}


@router.get("/insights/engagement", status_code=HttpStatus.OK)
async def get_engagement_insights(
    days: int = Query(30, ge=7, le=180),
    _admin: dict = Depends(get_current_admin),
):
    """Engagement intensity, retention risk, and channel adoption metrics."""
    db = get_async_db()
    overview = await InsightService.build_admin_overview(db=db, days=days)
    return {
        "window_days": days,
        "generated_at": overview["generated_at"],
        "engagement": overview["engagement"],
        "growth_trends": overview["growth_trends"],
    }


@router.get("/insights/operational", status_code=HttpStatus.OK)
async def get_operational_insights(
    days: int = Query(30, ge=7, le=180),
    _admin: dict = Depends(get_current_admin),
):
    """Operational quality metrics: profile health, freshness lag, and reliability score."""
    db = get_async_db()
    overview = await InsightService.build_admin_overview(db=db, days=days)
    return {
        "window_days": days,
        "generated_at": overview["generated_at"],
        "operational_health": overview["operational_health"],
    }


@router.get("/insights/opportunities", status_code=HttpStatus.OK)
async def get_opportunity_insights(
    days: int = Query(30, ge=7, le=180),
    _admin: dict = Depends(get_current_admin),
):
    """Actionable opportunity map for admin growth playbooks."""
    db = get_async_db()
    overview = await InsightService.build_admin_overview(db=db, days=days)
    return {
        "window_days": days,
        "generated_at": overview["generated_at"],
        "opportunities": overview["opportunities"],
        "recommendations": overview["recommendations"],
    }


@router.get("/insights/market", status_code=HttpStatus.OK)
async def get_market_insights(
    days: int = Query(30, ge=7, le=180),
    _admin: dict = Depends(get_current_admin),
):
    """Market momentum and commodity-level intelligence for strategic planning."""
    db = get_async_db()
    overview = await InsightService.build_admin_overview(db=db, days=days)
    return {
        "window_days": days,
        "generated_at": overview["generated_at"],
        "market_intelligence": overview["market_intelligence"],
    }


@router.get("/insights/equipment", status_code=HttpStatus.OK)
async def get_equipment_insights(
    days: int = Query(30, ge=7, le=180),
    _admin: dict = Depends(get_current_admin),
):
    """Equipment marketplace and farmer-listing insights for admin dashboards."""
    db = get_async_db()
    return await InsightService.build_equipment_insights(db=db, days=days)


@router.get("/insights/recommendations", status_code=HttpStatus.OK)
async def get_recommendations(
    days: int = Query(30, ge=7, le=180),
    _admin: dict = Depends(get_current_admin),
):
    """Prioritized admin actions derived from deterministic insight rules."""
    db = get_async_db()
    overview = await InsightService.build_admin_overview(db=db, days=days)
    return {
        "window_days": days,
        "generated_at": overview["generated_at"],
        "recommendations": overview["recommendations"],
    }


@router.get("/segments/farmers", status_code=HttpStatus.OK)
async def get_farmer_segments(
    days: int = Query(30, ge=7, le=180),
    _admin: dict = Depends(get_current_admin),
):
    """Farmer segmentation view for outreach planning."""
    db = get_async_db()
    overview = await InsightService.build_admin_overview(db=db, days=days)
    segments = {
        "highly_active": overview["engagement"]["active_farmers"],
        "at_risk": overview["opportunities"]["inactive_farmers"],
        "without_crops": overview["opportunities"]["farmers_without_crops"],
        "top_states": overview["operational_health"].get("top_states", []),
    }
    return {
        "window_days": days,
        "generated_at": overview["generated_at"],
        "segments": segments,
    }


@router.get("/trends", status_code=HttpStatus.OK)
async def get_trends(
    days: int = Query(30, ge=7, le=180),
    _admin: dict = Depends(get_current_admin),
):
    """Time-series trendlines for core adoption and usage indicators."""
    db = get_async_db()
    overview = await InsightService.build_admin_overview(db=db, days=days)
    return {
        "window_days": days,
        "generated_at": overview["generated_at"],
        "growth_trends": overview["growth_trends"],
    }


@router.post("/snapshots/generate", status_code=HttpStatus.CREATED)
async def generate_snapshot(
    date: str | None = Query(default=None),
    days: int = Query(30, ge=7, le=180),
    _admin: dict = Depends(get_current_admin),
):
    """Generate and persist a deterministic analytics snapshot for admin reporting."""
    db = get_async_db()
    return await InsightService.generate_snapshot(db=db, date_str=date, days=days)


@router.get("/snapshots/{date}", status_code=HttpStatus.OK)
async def get_snapshot(
    date: str,
    _admin: dict = Depends(get_current_admin),
):
    """Fetch a previously generated analytics snapshot by date (YYYY-MM-DD)."""
    db = get_async_db()
    return await InsightService.get_snapshot(db=db, date_str=date)


@router.get("/snapshots/trends", status_code=HttpStatus.OK)
async def get_snapshot_trends(
    days: int = Query(30, ge=7, le=180),
    _admin: dict = Depends(get_current_admin),
):
    """Read recent snapshots for historical performance tracking."""
    db = get_async_db()
    return await InsightService.get_snapshot_trends(db=db, days=days)


@router.get("/farmer/{farmer_id}/summary", status_code=HttpStatus.OK, response_model=FarmerInsightSummary)
async def farmer_summary(
    farmer_id: str,
    days: int = Query(30, ge=7, le=180),
    user: dict = Depends(get_current_user),
):
    """Personalized farmer insight summary (self-access or admin-access)."""
    is_admin = user.get("role") in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)
    if not is_admin and user.get("id") != farmer_id:
        raise forbidden("You can only access your own summary")

    db = get_async_db()
    return await InsightService.build_farmer_summary(db=db, farmer_id=farmer_id, days=days)


@router.get("/farmer/{farmer_id}/benchmarks", status_code=HttpStatus.OK)
async def farmer_benchmarks(
    farmer_id: str,
    days: int = Query(30, ge=7, le=180),
    user: dict = Depends(get_current_user),
):
    """Benchmark farmer performance against broader network behavior."""
    is_admin = user.get("role") in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)
    if not is_admin and user.get("id") != farmer_id:
        raise forbidden("You can only access your own benchmarks")

    db = get_async_db()
    return await InsightService.build_farmer_benchmarks(db=db, farmer_id=farmer_id, days=days)


@router.get("/overview/live", status_code=HttpStatus.OK)
async def get_live_overview(
    _admin: dict = Depends(get_current_admin),
):
    """Fast default view used by admin dashboards for real-time monitoring."""
    db = get_async_db()
    return await InsightService.build_admin_overview(db=db, days=30)


@router.get("/overview/today", status_code=HttpStatus.OK)
async def get_today_snapshot(
    _admin: dict = Depends(get_current_admin),
):
    """Convenience endpoint to fetch today's persisted snapshot."""
    db = get_async_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return await InsightService.get_snapshot(db=db, date_str=today)
