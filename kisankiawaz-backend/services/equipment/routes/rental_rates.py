"""Equipment rental rate routes with provider-level details from DB."""

from typing import Optional, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from shared.auth.deps import get_current_user, get_current_admin
from shared.db.mongodb import get_async_db
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


async def _load_provider_rows(
    *,
    state: Optional[str] = None,
    district: Optional[str] = None,
    category: Optional[str] = None,
    equipment_name: Optional[str] = None,
    search: Optional[str] = None,
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

    for d in docs:
        row = d.to_dict() or {}
        row_state = str(row.get("state") or "").strip().lower()
        row_dist = str(row.get("district") or row.get("city") or "").strip().lower()
        row_cat = str(row.get("category") or "").strip().lower()
        row_name = str(row.get("name") or "").strip().lower()
        row_provider = str(row.get("provider_name") or "").strip().lower()

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
        out.append(row)

    return out


def _provider_view(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "equipment": row.get("name"),
        "category": row.get("category"),
        "rates": {
            "hourly": row.get("rate_hourly"),
            "daily": row.get("rate_daily"),
            "per_acre": row.get("rate_per_acre"),
            "per_trip": row.get("rate_per_trip"),
        },
        "source": row.get("source"),
        "source_type": row.get("source_type"),
        "source_url": row.get("source_url"),
        "provider": {
            "provider_id": row.get("provider_id"),
            "name": row.get("provider_name"),
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


@router.get("/", status_code=HttpStatus.OK)
async def list_rental_rates(
    category: Optional[str] = Query(default=None, description="Filter by category key"),
    state: Optional[str] = Query(default=None, description="Get state-specific rates"),
    district: Optional[str] = Query(default=None, description="Filter by district/city"),
    equipment_name: Optional[str] = Query(default=None, description="Filter by equipment name"),
    search: Optional[str] = Query(default=None, description="Search by keyword"),
    limit: int = Query(default=50, ge=1, le=500),
    user: dict = Depends(get_current_user),
):
    """
    List all equipment rental rates across India.
    Optionally filter by category, state, or keyword.
    """
    provider_rows = await _load_provider_rows(
        state=state,
        district=district,
        category=category,
        equipment_name=equipment_name,
        search=search,
        limit=limit,
    )
    if provider_rows:
        rows = [_provider_view(x) for x in provider_rows[:limit]]
        return {
            "rows": rows,
            "total": len(rows),
            "data_source": "ref_equipment_providers",
            "filters": {
                "state": state,
                "district": district,
                "category": category,
                "equipment_name": equipment_name,
                "search": search,
                "limit": limit,
            },
        }

    # Fallback to static rates if provider rows are not seeded.
    if search:
        equipment = search_equipment(search)
    elif category:
        equipment = get_equipment_by_category(category)
    else:
        equipment = get_all_equipment()

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
        "data_source": "static_catalog",
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
    provider_rows = await _load_provider_rows(
        state=state,
        district=district,
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

    results = search_equipment(q)
    if state:
        for e in results:
            state_var = e.get("state_variations", {}).get(state)
            if state_var:
                e["state_rate"] = state_var

    return {
        "results": results,
        "total": len(results),
        "query": q,
        "data_source": "static_catalog",
    }


@router.get("/{equipment_name}", status_code=HttpStatus.OK)
async def get_equipment_rate(
    equipment_name: str,
    state: Optional[str] = Query(default=None),
    district: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """Get rental rate details for specific equipment, optionally with state-specific pricing."""
    provider_rows = await _load_provider_rows(
        state=state,
        district=district,
        equipment_name=equipment_name,
        limit=limit,
    )
    if provider_rows:
        rows = [_provider_view(x) for x in provider_rows[:limit]]
        daily_rates = [x.get("rates", {}).get("daily") for x in rows if isinstance(x.get("rates", {}).get("daily"), (int, float))]
        hourly_rates = [x.get("rates", {}).get("hourly") for x in rows if isinstance(x.get("rates", {}).get("hourly"), (int, float))]
        return {
            "equipment_name": equipment_name,
            "state": state,
            "district": district,
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

            doc_id = f"{str(provider.get('provider_id') or '').lower().replace(' ', '-')}-{name.lower().replace(' ', '-').replace('/', '-') }"
            await col.document(doc_id).set(
                {
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
                    "operator_included": bool(item.get("operator_included")),
                    "fuel_extra": bool(item.get("fuel_extra")),
                    "availability": item.get("availability"),
                    "season_note": item.get("season_note"),
                    "last_verified_at": provider.get("last_verified_at"),
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

