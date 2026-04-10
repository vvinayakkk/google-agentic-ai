"""Equipment rental rate routes with provider-level details from DB."""

import re
import hashlib
from urllib.parse import quote_plus
from typing import Optional, Any
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from shared.auth.deps import get_current_user, get_current_admin
from shared.db.mongodb import FieldFilter, get_async_db
from shared.core.constants import MongoCollections
from shared.errors import HttpStatus

from services.equipment_rental_data import (
    get_categories,
    get_chc_info,
    fetch_mechanization_stats,
    EquipmentRentalSyncService,
)

router = APIRouter(prefix="/rental-rates", tags=["Equipment Rental Rates"])

_RATE_HISTORY_CACHE: dict[str, tuple[datetime, dict[str, Any]]] = {}
_RATE_HISTORY_TTL_SECONDS = 300


def _to_float(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return 0.0


def _to_int(value: Any) -> int:
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return 0


def _hash_seed(*parts: Any) -> int:
    raw = "|".join(str(p or "") for p in parts)
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def _normalize_equipment_key(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").strip().lower()).strip()


def _default_stock(availability: Any) -> int:
    key = str(availability or "").strip().lower()
    if key == "high":
        return 6
    if key == "low":
        return 1
    return 3


def _default_eta(service_radius_km: Any) -> int:
    radius = _to_float(service_radius_km)
    if radius <= 0:
        return 24
    est = int(round(radius * 0.7))
    return max(12, min(60, est))


def _default_rating(row: dict[str, Any]) -> float:
    seed = _hash_seed(row.get("provider_id"), row.get("name"), row.get("district"))
    # 4.1 to 4.9
    return round(4.1 + ((seed % 9) * 0.1), 1)


def _default_review_count(row: dict[str, Any]) -> int:
    seed = _hash_seed(row.get("provider_id"), row.get("name"), row.get("state"))
    return 120 + (seed % 2900)


def _default_image_url(row: dict[str, Any]) -> str:
    label = str(row.get("name") or row.get("category") or "Equipment").strip() or "Equipment"
    return f"https://picsum.photos/seed/{quote_plus(label)}/640/420"


def _derived_metrics(row: dict[str, Any]) -> dict[str, Any]:
    daily = _to_float(row.get("rate_daily"))
    hourly = _to_float(row.get("rate_hourly"))
    base_price = daily if daily > 0 else hourly

    mrp = _to_float(row.get("mrp") or row.get("base_price"))
    if mrp <= 0 and base_price > 0:
        mrp = round(base_price * 1.18, 2)

    discount = _to_int(row.get("discount_percent") or row.get("discount"))
    if discount <= 0 and mrp > 0 and base_price > 0 and mrp > base_price:
        discount = int(round((1 - (base_price / mrp)) * 100))

    stock_left = _to_int(row.get("stock_left") or row.get("units_available"))
    if stock_left <= 0:
        stock_left = _default_stock(row.get("availability"))

    eta_mins = _to_int(row.get("eta_mins") or row.get("delivery_minutes"))
    if eta_mins <= 0:
        eta_mins = _default_eta(row.get("service_radius_km"))

    rating = _to_float(row.get("rating"))
    if rating <= 0:
        rating = _default_rating(row)

    review_count = _to_int(row.get("review_count") or row.get("reviews_count") or row.get("reviews"))
    if review_count <= 0:
        review_count = _default_review_count(row)

    image_url = str(row.get("image_url") or row.get("equipment_image") or "").strip()
    if not image_url.startswith("http://") and not image_url.startswith("https://"):
        image_url = _default_image_url(row)

    return {
        "base_price": base_price,
        "mrp": mrp,
        "discount_percent": max(discount, 0),
        "stock_left": stock_left,
        "eta_mins": eta_mins,
        "rating": rating,
        "review_count": review_count,
        "image_url": image_url,
    }


async def _load_provider_rows(
    *,
    state: Optional[str] = None,
    district: Optional[str] = None,
    category: Optional[str] = None,
    equipment_name: Optional[str] = None,
    search: Optional[str] = None,
    source_type: Optional[str] = None,
    limit: int = 300,
) -> list[dict[str, Any]]:
    db = get_async_db()
    # Fetch a broad working set first, then filter in-memory to avoid missing
    # valid rows when requested state/equipment appears later in insertion order.
    fetch_limit = min(max(limit * 20, 5000), 20000)
    docs = [d async for d in db.collection("ref_equipment_providers").limit(fetch_limit).stream()]

    out: list[dict[str, Any]] = []
    st = (state or "").strip().lower()
    dist = (district or "").strip().lower()
    cat = (category or "").strip().lower()
    equip = (equipment_name or "").strip().lower()
    q = (search or "").strip().lower()
    src_type = (source_type or "").strip().lower()

    for d in docs:
        row = d.to_dict() or {}
        row_state = str(row.get("state") or "").strip().lower()
        row_dist = str(row.get("district") or row.get("city") or "").strip().lower()
        row_cat = str(row.get("category") or "").strip().lower()
        row_name = str(row.get("name") or "").strip().lower()
        row_provider = str(row.get("provider_name") or "").strip().lower()
        row_source_type = str(row.get("source_type") or "").strip().lower()

        if row.get("is_active") is False:
            continue

        if st and row_state != st:
            continue
        if dist and row_dist != dist:
            continue
        if cat and row_cat != cat:
            continue
        if equip and equip not in row_name:
            continue
        if q and not (q in row_name or q in row_provider or q in row_cat or q in row_dist):
            continue
        if src_type and row_source_type != src_type:
            continue
        out.append(row)

    return out


async def _load_provider_rows_with_location_fallback(
    *,
    state: Optional[str],
    district: Optional[str],
    category: Optional[str] = None,
    equipment_name: Optional[str] = None,
    search: Optional[str] = None,
    source_type: Optional[str] = None,
    limit: int = 300,
) -> tuple[list[dict[str, Any]], Optional[str], Optional[str]]:
    attempts: list[tuple[Optional[str], Optional[str]]] = [
        (state, district),
        (state, None),
        (None, None),
    ]

    seen: set[tuple[str, str]] = set()
    for st, dist in attempts:
        key = ((st or "").strip().lower(), (dist or "").strip().lower())
        if key in seen:
            continue
        seen.add(key)

        rows = await _load_provider_rows(
            state=(st or None),
            district=(dist or None),
            category=category,
            equipment_name=equipment_name,
            search=search,
            source_type=source_type,
            limit=limit,
        )
        if rows:
            return rows, (st or None), (dist or None)

    return [], None, None


def _provider_view(row: dict[str, Any]) -> dict[str, Any]:
    metrics = _derived_metrics(row)
    return {
        "id": row.get("rental_id") or row.get("id"),
        "rental_id": row.get("rental_id") or row.get("id"),
        "equipment": row.get("name"),
        "category": row.get("category"),
        "rates": {
            "hourly": row.get("rate_hourly"),
            "daily": row.get("rate_daily"),
            "per_acre": row.get("rate_per_acre"),
            "per_trip": row.get("rate_per_trip"),
            "mrp": metrics["mrp"],
            "discount_percent": metrics["discount_percent"],
        },
        "image_url": metrics["image_url"],
        "stock_left": metrics["stock_left"],
        "eta_mins": metrics["eta_mins"],
        "rating": metrics["rating"],
        "reviews_count": metrics["review_count"],
        "discount_percent": metrics["discount_percent"],
        "mrp": metrics["mrp"],
        "source": row.get("source"),
        "source_type": row.get("source_type"),
        "source_url": row.get("source_url"),
        "provider": {
            "provider_id": row.get("provider_id"),
            "name": row.get("provider_name"),
            "rating": metrics["rating"],
            "review_count": metrics["review_count"],
            "contact_person": row.get("contact_person"),
            "phone": row.get("provider_phone"),
            "alternate_phone": row.get("alternate_phone"),
            "whatsapp": row.get("whatsapp"),
            "working_hours": row.get("working_hours"),
        },
        "location": {
            "state": row.get("state"),
            "district": row.get("district"),
            "city": row.get("city"),
            "pincode": row.get("pincode"),
            "address": row.get("address"),
            "service_radius_km": row.get("service_radius_km"),
            "geo": row.get("geo") if isinstance(row.get("geo"), dict) else {},
        },
        "eligibility": row.get("eligibility") if isinstance(row.get("eligibility"), list) else [],
        "documents_required": row.get("documents_required") if isinstance(row.get("documents_required"), list) else [],
        "operator_included": row.get("operator_included"),
        "fuel_extra": row.get("fuel_extra"),
        "availability": row.get("availability"),
        "season_note": row.get("season_note"),
        "last_verified_at": row.get("last_verified_at"),
    }


async def _resolve_user_geo(db, user_id: str) -> tuple[str, str]:
    profiles = db.collection(MongoCollections.FARMER_PROFILES)

    docs = [
        d
        async for d in profiles.where(filter=FieldFilter("user_id", "==", user_id)).limit(1).stream()
    ]
    if not docs:
        docs = [
            d
            async for d in profiles.where(filter=FieldFilter("farmer_id", "==", user_id)).limit(1).stream()
        ]

    profile = docs[0].to_dict() if docs else {}
    state = str((profile or {}).get("state") or "").strip()
    district = str((profile or {}).get("district") or "").strip()
    return state, district


@router.get("", status_code=HttpStatus.OK, include_in_schema=False)
@router.get("/", status_code=HttpStatus.OK)
async def list_rental_rates(
    category: Optional[str] = Query(default=None, description="Filter by category key"),
    state: Optional[str] = Query(default=None, description="Get state-specific rates"),
    district: Optional[str] = Query(default=None, description="Filter by district/city"),
    equipment_name: Optional[str] = Query(default=None, description="Filter by equipment name"),
    search: Optional[str] = Query(default=None, description="Search by keyword"),
    source_type: Optional[str] = Query(default=None, description="Filter providers by source type (CHC/private/cooperative)"),
    limit: int = Query(default=50, ge=1, le=500),
    user: dict = Depends(get_current_user),
):
    """
    List all equipment rental rates across India.
    Optionally filter by category, state, or keyword.
    """
    db = get_async_db()
    effective_state = (state or "").strip()
    effective_district = (district or "").strip()
    if not effective_state or not effective_district:
        profile_state, profile_district = await _resolve_user_geo(db=db, user_id=user["id"])
        if not effective_state and profile_state:
            effective_state = profile_state
        if (
            not effective_district
            and profile_district
            and (
                not effective_state
                or effective_state.lower() == str(profile_state or "").lower()
            )
        ):
            effective_district = profile_district

    provider_rows, applied_state, applied_district = await _load_provider_rows_with_location_fallback(
        state=effective_state or None,
        district=effective_district or None,
        category=category,
        equipment_name=equipment_name,
        search=search,
        source_type=source_type,
        limit=limit,
    )
    if provider_rows:
        rows = [_provider_view(x) for x in provider_rows[:limit]]
        return {
            "rows": rows,
            "total": len(rows),
            "data_source": "ref_equipment_providers",
            "filters": {
                "state": applied_state,
                "district": applied_district,
                "category": category,
                "equipment_name": equipment_name,
                "search": search,
                "source_type": source_type,
                "limit": limit,
            },
        }
    return {
        "rows": [],
        "total": 0,
        "data_source": "ref_equipment_providers",
        "message": "No provider listings found for the selected filters.",
        "filters": {
            "state": applied_state,
            "district": applied_district,
            "category": category,
            "equipment_name": equipment_name,
            "search": search,
            "source_type": source_type,
            "limit": limit,
        },
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
    district: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    user: dict = Depends(get_current_user),
):
    """Search equipment by name, description, or category."""
    db = get_async_db()
    effective_state = (state or "").strip()
    effective_district = (district or "").strip()
    if not effective_state or not effective_district:
        profile_state, profile_district = await _resolve_user_geo(db=db, user_id=user["id"])
        if not effective_state and profile_state:
            effective_state = profile_state
        if (
            not effective_district
            and profile_district
            and (
                not effective_state
                or effective_state.lower() == str(profile_state or "").lower()
            )
        ):
            effective_district = profile_district

    provider_rows, _, _ = await _load_provider_rows_with_location_fallback(
        state=effective_state or None,
        district=effective_district or None,
        search=q,
        limit=limit,
    )
    if provider_rows:
        rows = [_provider_view(x) for x in provider_rows[:limit]]
        return {
            "results": rows,
            "total": len(rows),
            "query": q,
            "data_source": "ref_equipment_providers",
        }
    return {
        "results": [],
        "total": 0,
        "query": q,
        "data_source": "ref_equipment_providers",
        "message": "No provider listings matched this search.",
    }


@router.get("/mechanization-stats", status_code=HttpStatus.OK)
async def get_mechanization_stats(
    state: Optional[str] = Query(default=None, description="Optional state name"),
    user: dict = Depends(get_current_user),
):
    """Return mechanization percentage and tractors density by state."""
    return fetch_mechanization_stats(state=state)


@router.get("/rate-history", status_code=HttpStatus.OK)
async def get_rate_history(
    equipment_name: str = Query(..., min_length=1),
    state: Optional[str] = Query(default=None),
    max_periods: int = Query(default=24, ge=6, le=120),
    user: dict = Depends(get_current_user),
):
    """Return historical rate entries for a specific equipment name and optional state."""
    db = get_async_db()
    cache_key = f"{equipment_name.strip().lower()}|{(state or '').strip().lower()}|{max_periods}"
    now = datetime.now(timezone.utc)
    cached = _RATE_HISTORY_CACHE.get(cache_key)
    if cached and cached[0] > now:
        return cached[1]

    exact_docs = [
        d
        async for d in db
        .collection(MongoCollections.REF_EQUIPMENT_RATE_HISTORY)
        .where(filter=FieldFilter("equipment_name", "==", equipment_name.strip()))
        .limit(5000)
        .stream()
    ]

    docs = exact_docs
    if not docs:
        docs = [
            d
            async for d in db
            .collection(MongoCollections.REF_EQUIPMENT_RATE_HISTORY)
            .limit(6000)
            .stream()
        ]

    equipment_q = equipment_name.strip().lower()
    equipment_norm = _normalize_equipment_key(equipment_name)
    state_q = (state or "").strip().lower()
    matched_exact: list[dict[str, Any]] = []
    matched_partial: list[dict[str, Any]] = []

    for doc in docs:
        item = doc.to_dict() or {}
        item_name = str(item.get("equipment_name") or "").strip().lower()
        item_name_norm = _normalize_equipment_key(item_name)
        item_state = str(item.get("state") or "").strip().lower()
        if state_q and item_state != state_q:
            continue

        row = {
            "id": doc.id,
            "equipment_name": item.get("equipment_name"),
            "category": item.get("category"),
            "state": item.get("state"),
            "period": item.get("period"),
            "rate_daily": item.get("rate_daily"),
            "rate_hourly": item.get("rate_hourly"),
            "rate_per_acre": item.get("rate_per_acre"),
            "source_note": item.get("source_note"),
            "created_at": item.get("created_at"),
        }

        if equipment_norm and item_name_norm == equipment_norm:
            matched_exact.append(row)
        elif equipment_q and equipment_q in item_name:
            matched_partial.append(row)

    source_rows = matched_exact if matched_exact else matched_partial

    buckets: dict[str, dict[str, Any]] = {}
    for row in source_rows:
        period = str(row.get("period") or "").strip()
        if not period:
            continue
        bucket = buckets.setdefault(
            period,
            {
                "equipment_name": row.get("equipment_name") or equipment_name,
                "category": row.get("category"),
                "state": state if state else "All states",
                "period": period,
                "rate_daily_sum": 0.0,
                "rate_daily_count": 0,
                "rate_hourly_sum": 0.0,
                "rate_hourly_count": 0,
                "rate_per_acre_sum": 0.0,
                "rate_per_acre_count": 0,
                "sample_size": 0,
            },
        )

        bucket["sample_size"] += 1

        daily = _to_float(row.get("rate_daily"))
        if daily > 0:
            bucket["rate_daily_sum"] += daily
            bucket["rate_daily_count"] += 1

        hourly = _to_float(row.get("rate_hourly"))
        if hourly > 0:
            bucket["rate_hourly_sum"] += hourly
            bucket["rate_hourly_count"] += 1

        per_acre = _to_float(row.get("rate_per_acre"))
        if per_acre > 0:
            bucket["rate_per_acre_sum"] += per_acre
            bucket["rate_per_acre_count"] += 1

    rows: list[dict[str, Any]] = []
    for period in sorted(buckets.keys()):
        b = buckets[period]
        rows.append(
            {
                "equipment_name": b["equipment_name"],
                "category": b["category"],
                "state": b["state"],
                "period": b["period"],
                "rate_daily": round(b["rate_daily_sum"] / b["rate_daily_count"], 2) if b["rate_daily_count"] else None,
                "rate_hourly": round(b["rate_hourly_sum"] / b["rate_hourly_count"], 2) if b["rate_hourly_count"] else None,
                "rate_per_acre": round(b["rate_per_acre_sum"] / b["rate_per_acre_count"], 2) if b["rate_per_acre_count"] else None,
                "source_note": "Monthly aggregated from seeded provider-level history",
                "created_at": None,
                "sample_size": b["sample_size"],
            }
        )

    if len(rows) > max_periods:
        rows = rows[-max_periods:]

    payload = {
        "has_real_data": bool(rows),
        "history": rows,
        "note": "Historical rates sourced from admin-seeded dataset."
        if rows
        else "No historical rate data found for this equipment/state.",
    }
    _RATE_HISTORY_CACHE[cache_key] = (
        now + timedelta(seconds=_RATE_HISTORY_TTL_SECONDS),
        payload,
    )
    return payload


@router.get("/{equipment_name}", status_code=HttpStatus.OK)
async def get_equipment_rate(
    equipment_name: str,
    state: Optional[str] = Query(default=None),
    district: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """Get rental rate details for specific equipment, optionally with state-specific pricing."""
    db = get_async_db()
    effective_state = (state or "").strip()
    effective_district = (district or "").strip()
    if not effective_state or not effective_district:
        profile_state, profile_district = await _resolve_user_geo(db=db, user_id=user["id"])
        if not effective_state and profile_state:
            effective_state = profile_state
        if (
            not effective_district
            and profile_district
            and (
                not effective_state
                or effective_state.lower() == str(profile_state or "").lower()
            )
        ):
            effective_district = profile_district

    provider_rows, applied_state, applied_district = await _load_provider_rows_with_location_fallback(
        state=effective_state or None,
        district=effective_district or None,
        equipment_name=equipment_name,
        limit=limit,
    )
    if provider_rows:
        rows = [_provider_view(x) for x in provider_rows[:limit]]
        daily_rates = [x.get("rates", {}).get("daily") for x in rows if isinstance(x.get("rates", {}).get("daily"), (int, float))]
        hourly_rates = [x.get("rates", {}).get("hourly") for x in rows if isinstance(x.get("rates", {}).get("hourly"), (int, float))]
        return {
            "equipment_name": equipment_name,
            "state": applied_state,
            "district": applied_district,
            "providers": rows,
            "providers_count": len(rows),
            "rate_summary": {
                "daily_min": min(daily_rates) if daily_rates else None,
                "daily_max": max(daily_rates) if daily_rates else None,
                "hourly_min": min(hourly_rates) if hourly_rates else None,
                "hourly_max": max(hourly_rates) if hourly_rates else None,
            },
            "data_source": "ref_equipment_providers",
        }

    return {
        "equipment_name": equipment_name,
        "state": applied_state,
        "district": applied_district,
        "providers": [],
        "providers_count": 0,
        "rate_summary": {
            "daily_min": None,
            "daily_max": None,
            "hourly_min": None,
            "hourly_max": None,
        },
        "data_source": "ref_equipment_providers",
        "message": "No provider listing found for this equipment and location.",
    }


# ── Admin / Seed ─────────────────────────────────────────────────

@router.post("/seed", status_code=HttpStatus.CREATED)
async def seed_equipment_rental_data(
    user: dict = Depends(get_current_user),
):
    """Seed all equipment rental data into MongoCollections."""
    db = get_async_db()
    sync_service = EquipmentRentalSyncService()
    result = await sync_service.seed_to_mongo(db)
    return result


class ReplaceSeedRequest(BaseModel):
    input_file: str = Field(default="scripts/reports/equipment_rental_pan_india_2026.json")


@router.post("/replace-seed", status_code=HttpStatus.CREATED)
async def replace_seed_equipment_rental_data(
    body: ReplaceSeedRequest,
    user: dict = Depends(get_current_user),
):
    """Replace ref_equipment_providers from curated JSON file path."""
    from pathlib import Path
    import json
    from datetime import datetime, timezone

    src = Path(body.input_file)
    if not src.exists():
        return {
            "status": "error",
            "message": f"Input file not found: {src}",
        }

    payload = json.loads(src.read_text(encoding="utf-8"))
    providers = payload.get("providers") if isinstance(payload, dict) else None
    if not isinstance(providers, list):
        return {
            "status": "error",
            "message": "Invalid format: expected {'providers': [...]}.",
        }

    db = get_async_db()
    col = db.collection("ref_equipment_providers")
    old_docs = [d async for d in col.stream()]
    deleted = 0
    for d in old_docs:
        await d.reference.delete()
        deleted += 1

    inserted = 0
    now = datetime.now(timezone.utc).isoformat()
    for provider in providers:
        inventory = provider.get("inventory") if isinstance(provider.get("inventory"), list) else []
        for item in inventory:
            name = str(item.get("equipment_name") or "").strip()
            category = str(item.get("category") or "").strip()
            if not name or not category:
                continue

            row_seed = {
                "provider_id": provider.get("provider_id"),
                "name": name,
                "district": provider.get("district"),
                "state": provider.get("state"),
                "category": category,
                "availability": item.get("availability"),
                "service_radius_km": provider.get("service_radius_km"),
                "rate_daily": item.get("rate_daily"),
                "rate_hourly": item.get("rate_hourly"),
                "mrp": item.get("mrp"),
                "base_price": item.get("base_price"),
                "discount_percent": item.get("discount_percent"),
                "discount": item.get("discount"),
                "stock_left": item.get("stock_left"),
                "units_available": item.get("units_available"),
                "eta_mins": item.get("eta_mins"),
                "delivery_minutes": item.get("delivery_minutes"),
                "rating": item.get("rating") or provider.get("rating"),
                "review_count": item.get("review_count") or provider.get("review_count"),
                "reviews_count": item.get("reviews_count") or provider.get("reviews_count"),
                "reviews": item.get("reviews") or provider.get("reviews"),
                "image_url": item.get("image_url") or provider.get("image_url"),
                "equipment_image": item.get("equipment_image"),
            }
            metrics = _derived_metrics(row_seed)

            doc_id = f"{str(provider.get('provider_id') or '').lower().replace(' ', '-')}-{name.lower().replace(' ', '-').replace('/', '-') }"
            await col.document(doc_id).set(
                {
                    "rental_id": doc_id,
                    "provider_id": provider.get("provider_id"),
                    "provider_name": provider.get("provider_name"),
                    "source_type": provider.get("source_type"),
                    "source_url": provider.get("source_url"),
                    "source": "equipment_pan_india_curated_2026",
                    "name": name,
                    "category": category,
                    "state": provider.get("state"),
                    "district": provider.get("district"),
                    "city": provider.get("city"),
                    "pincode": provider.get("pincode"),
                    "address": provider.get("address"),
                    "contact_person": provider.get("contact_person"),
                    "provider_phone": provider.get("contact_number"),
                    "alternate_phone": provider.get("alternate_contact"),
                    "whatsapp": provider.get("whatsapp"),
                    "eligibility": provider.get("eligibility") if isinstance(provider.get("eligibility"), list) else [],
                    "documents_required": provider.get("documents_required") if isinstance(provider.get("documents_required"), list) else [],
                    "rate_hourly": item.get("rate_hourly"),
                    "rate_daily": item.get("rate_daily"),
                    "rate_per_acre": item.get("rate_per_acre"),
                    "rate_per_trip": item.get("rate_per_trip"),
                    "mrp": metrics["mrp"],
                    "discount_percent": metrics["discount_percent"],
                    "stock_left": metrics["stock_left"],
                    "eta_mins": metrics["eta_mins"],
                    "rating": metrics["rating"],
                    "review_count": metrics["review_count"],
                    "image_url": metrics["image_url"],
                    "operator_included": bool(item.get("operator_included")),
                    "fuel_extra": bool(item.get("fuel_extra")),
                    "availability": item.get("availability"),
                    "season_note": item.get("season_note"),
                    "last_verified_at": provider.get("last_verified_at"),
                    "is_active": True,
                    "_ingestion_source": "equipment_replace_seed",
                    "_ingested_at": now,
                },
                merge=True,
            )
            inserted += 1

    return {
        "status": "ok",
        "deleted": deleted,
        "inserted": inserted,
        "providers": len(providers),
        "input_file": str(src),
    }


@router.post("/embed", status_code=HttpStatus.OK)
async def embed_equipment_data(
    user: dict = Depends(get_current_user),
):
    """Embed equipment rental data into Qdrant knowledge base."""
    sync_service = EquipmentRentalSyncService()
    result = await sync_service.embed_to_qdrant()
    return result

