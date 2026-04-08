"""Admin service routes — all routes require ADMIN or SUPER_ADMIN JWT."""

import math
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from shared.auth.deps import get_current_admin, get_current_super_admin
from shared.auth.security import hash_password, verify_password, create_access_token, create_refresh_token
from shared.db.mongodb import get_async_db, FieldFilter
from shared.core.constants import MongoCollections
from shared.errors import HttpStatus, bad_request, not_found, conflict, ErrorCode
from shared.schemas.admin import (
    AdminLoginRequest,
    AdminUserCreate,
    AppConfigUpdate,
    FarmerStatusUpdate,
    BulkImportRequest,
    SchemeUpsertRequest,
    ProviderUpsertRequest,
    FeatureFlagsUpdate,
)
from services.bulk_import_service import bulk_import_schemes as run_bulk_import_schemes
from services.bulk_import_service import bulk_import_equipment as run_bulk_import_equipment
from services.bulk_import_service import _slug

router = APIRouter()


class RateHistoryEntry(BaseModel):
    equipment_name: str = Field(..., min_length=1, max_length=240)
    category: Optional[str] = Field(default=None, max_length=120)
    state: str = Field(..., min_length=1, max_length=120)
    rate_daily: Optional[float] = Field(default=None, ge=0)
    rate_hourly: Optional[float] = Field(default=None, ge=0)
    rate_per_acre: Optional[float] = Field(default=None, ge=0)
    period: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    source_note: Optional[str] = Field(default=None, max_length=500)

    model_config = {"strict": False, "extra": "allow"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _admin_browseable_collections() -> set[str]:
    names = set()
    for attr, value in vars(MongoCollections).items():
        if attr.startswith("_"):
            continue
        if isinstance(value, str):
            names.add(value)
    return names


ADMIN_BROWSEABLE_COLLECTIONS = _admin_browseable_collections()

_ADMIN_ROUTE_CACHE: dict[str, tuple[float, dict]] = {}


def _cache_get(key: str) -> Optional[dict]:
    entry = _ADMIN_ROUTE_CACHE.get(key)
    if not entry:
        return None
    expires_at, payload = entry
    if time.time() >= expires_at:
        _ADMIN_ROUTE_CACHE.pop(key, None)
        return None
    return payload


def _cache_set(key: str, payload: dict, ttl_seconds: int) -> None:
    _ADMIN_ROUTE_CACHE[key] = (time.time() + max(1, ttl_seconds), payload)


# ── Auth ─────────────────────────────────────────────────────────
@router.post("/login", status_code=HttpStatus.OK)
async def admin_login(body: AdminLoginRequest):
    """Admin login with email + password."""
    db = get_async_db()
    query = db.collection(MongoCollections.ADMIN_USERS).where("email", "==", body.email).limit(1)
    docs = [d async for d in query.stream()]
    if not docs:
        raise bad_request("Invalid email or password", ErrorCode.AUTH_INVALID_CREDENTIALS)
    doc = docs[0]
    admin = doc.to_dict()
    if not verify_password(body.password, admin.get("password_hash", "")):
        raise bad_request("Invalid email or password", ErrorCode.AUTH_INVALID_CREDENTIALS)
    if not admin.get("is_active", False):
        raise bad_request("Account is deactivated", ErrorCode.AUTH_USER_INACTIVE)

    access = create_access_token(doc.id, admin["role"])
    refresh = create_refresh_token(doc.id, admin["role"])
    await db.collection(MongoCollections.ADMIN_USERS).document(doc.id).update({"last_login_at": datetime.now(timezone.utc).isoformat()})
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "admin": {"admin_id": doc.id, "email": admin["email"], "name": admin["name"], "role": admin["role"]}}


# ── Dashboard ────────────────────────────────────────────────────
@router.get("/stats", status_code=HttpStatus.OK)
async def get_stats(admin: dict = Depends(get_current_admin)):
    """Daily overview stats."""
    db = get_async_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # Try analytics snapshot
    snap = await db.collection(MongoCollections.ANALYTICS_SNAPSHOTS).document(today).get()
    if snap.exists:
        return snap.to_dict()
    # Fallback: count farmers
    total = 0
    async for _ in db.collection(MongoCollections.USERS).where("role", "==", "farmer").stream():
        total += 1
    return {"date": today, "total_farmers": total, "new_farmers_today": 0, "dau": 0, "agent_queries_today": 0}


@router.get("/data-freshness", status_code=HttpStatus.OK)
async def get_data_freshness(admin: dict = Depends(get_current_admin)):
    """Last ingestion timestamp per collection."""
    db = get_async_db()
    items = []
    async for doc in db.collection(MongoCollections.REF_DATA_INGESTION_META).stream():
        data = doc.to_dict()
        items.append({"collection": data.get("dataset", doc.id), "last_run_at": data.get("last_run_at"), "row_count": data.get("row_count", 0), "status": data.get("status", "")})
    return {"items": items}


@router.get("/data/collection/{collection_name}", status_code=HttpStatus.OK)
async def browse_collection(
    collection_name: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=500),
    search: str = Query(None),
    refresh: bool = Query(False),
    admin: dict = Depends(get_current_admin),
):
    """Generic collection browser for admin dashboard database explorer."""
    if collection_name not in ADMIN_BROWSEABLE_COLLECTIONS:
        raise bad_request(f"Collection '{collection_name}' is not allowed")

    db = get_async_db()
    docs = []
    query_text = (search or "").strip().lower()

    # Fast path for pagination without search to avoid full scans on large collections.
    if not query_text:
        cache_key = f"browse:{collection_name}:{page}:{per_page}"
        if not refresh:
            cached = _cache_get(cache_key)
            if cached is not None:
                return cached

        start = (page - 1) * per_page
        query = db.collection(collection_name).order_by("updated_at", "DESCENDING").offset(start).limit(per_page)

        async for doc in query.stream():
            data = doc.to_dict() or {}
            data["id"] = doc.id
            if collection_name in {MongoCollections.USERS, MongoCollections.ADMIN_USERS}:
                data.pop("password_hash", None)
            docs.append(data)

        total = start + len(docs)
        total_pages = page + 1 if len(docs) == per_page else page
        payload = {
            "collection": collection_name,
            "items": docs,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
        }
        if payload["items"]:
            _cache_set(cache_key, payload, ttl_seconds=300)
        return payload

    async for doc in db.collection(collection_name).stream():
        data = doc.to_dict() or {}
        data["id"] = doc.id

        if collection_name in {MongoCollections.USERS, MongoCollections.ADMIN_USERS}:
            data.pop("password_hash", None)

        if query_text and query_text not in str(data).lower():
            continue

        docs.append(data)

    docs.sort(key=lambda item: str(item.get("updated_at") or item.get("created_at") or item.get("_ingested_at") or ""), reverse=True)
    total = len(docs)
    start = (page - 1) * per_page
    end = start + per_page

    return {
        "collection": collection_name,
        "items": docs[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if per_page else 0,
    }


# ── Farmer Management ────────────────────────────────────────────
@router.get("/farmers", status_code=HttpStatus.OK)
async def list_farmers(
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    state: str = Query(None), search: str = Query(None),
    admin: dict = Depends(get_current_admin),
):
    """Paginated farmer list."""
    db = get_async_db()
    query = db.collection(MongoCollections.USERS).where("role", "==", "farmer")
    docs = []
    async for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        data.pop("password_hash", None)
        if search and search.lower() not in (data.get("name", "") + data.get("phone", "")).lower():
            continue
        docs.append(data)
    total = len(docs)
    start = (page - 1) * per_page
    return {"items": docs[start:start + per_page], "total": total, "page": page, "per_page": per_page, "total_pages": math.ceil(total / per_page) if per_page else 0}


@router.get("/farmers/{farmer_id}", status_code=HttpStatus.OK)
async def get_farmer(farmer_id: str, admin: dict = Depends(get_current_admin)):
    """Full farmer profile."""
    db = get_async_db()
    doc = await db.collection(MongoCollections.USERS).document(farmer_id).get()
    if not doc.exists:
        raise not_found("Farmer not found")
    data = doc.to_dict()
    data["id"] = doc.id
    data.pop("password_hash", None)
    # Get profile
    profile = await db.collection(MongoCollections.FARMER_PROFILES).document(f"profile_{farmer_id}").get()
    if profile.exists:
        data["profile"] = profile.to_dict()
    return data


@router.put("/farmers/{farmer_id}/status", status_code=HttpStatus.OK)
async def update_farmer_status(farmer_id: str, body: FarmerStatusUpdate, admin: dict = Depends(get_current_admin)):
    """Activate/suspend a farmer."""
    db = get_async_db()
    doc = await db.collection(MongoCollections.USERS).document(farmer_id).get()
    if not doc.exists:
        raise not_found("Farmer not found")
    await db.collection(MongoCollections.USERS).document(farmer_id).update({"is_active": body.is_active, "updated_at": datetime.now(timezone.utc).isoformat()})
    # Audit log
    await db.collection(MongoCollections.ADMIN_AUDIT_LOGS).add({"admin_id": admin.get("id", ""), "action": "UPDATE_FARMER_STATUS", "target_collection": "users", "target_doc_id": farmer_id, "payload_summary": f"is_active={body.is_active}", "timestamp": datetime.now(timezone.utc).isoformat()})
    return {"detail": f"Farmer {'activated' if body.is_active else 'suspended'}"}


@router.get("/farmers/{farmer_id}/conversations", status_code=HttpStatus.OK)
async def get_farmer_conversations(farmer_id: str, admin: dict = Depends(get_current_admin)):
    """View farmer's agent chat history."""
    db = get_async_db()
    convos = []
    async for doc in db.collection(MongoCollections.AGENT_CONVERSATIONS).where("user_id", "==", farmer_id).stream():
        data = doc.to_dict()
        data["id"] = doc.id
        convos.append(data)
    return {"farmer_id": farmer_id, "conversations": convos}


# ── Reference Data Management ────────────────────────────────────
@router.get("/data/schemes", status_code=HttpStatus.OK)
async def list_schemes(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    docs = []
    async for doc in db.collection(MongoCollections.REF_FARMER_SCHEMES).stream():
        data = doc.to_dict()
        data["id"] = doc.id
        docs.append(data)
    total = len(docs)
    start = (page - 1) * per_page
    return {"items": docs[start:start + per_page], "total": total, "page": page, "per_page": per_page, "total_pages": math.ceil(total / per_page) if per_page else 0}


@router.post("/data/schemes", status_code=HttpStatus.CREATED)
async def create_scheme(data: SchemeUpsertRequest, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    payload = data.model_dump(exclude_none=True)
    now = datetime.now(timezone.utc).isoformat()
    payload["_ingested_at"] = now
    payload["_created_by"] = admin.get("id", "")
    scheme_id = payload.get("scheme_id", "")
    doc_id = f"scheme_{scheme_id}" if scheme_id else None
    if doc_id:
        await db.collection(MongoCollections.REF_FARMER_SCHEMES).document(doc_id).set(payload, merge=True)
    else:
        _, ref = await db.collection(MongoCollections.REF_FARMER_SCHEMES).add(payload)
        doc_id = ref.id
    await db.collection(MongoCollections.ADMIN_AUDIT_LOGS).add({"admin_id": admin.get("id", ""), "action": "CREATE_SCHEME", "target_collection": "ref_farmer_schemes", "target_doc_id": doc_id, "timestamp": now})
    return {"detail": "Scheme created", "id": doc_id}


@router.put("/data/schemes/{scheme_id}", status_code=HttpStatus.OK)
async def update_scheme(scheme_id: str, data: SchemeUpsertRequest, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    doc_id = f"scheme_{scheme_id}" if not scheme_id.startswith("scheme_") else scheme_id
    doc = await db.collection(MongoCollections.REF_FARMER_SCHEMES).document(doc_id).get()
    if not doc.exists:
        raise not_found("Scheme not found")
    payload = data.model_dump(exclude_none=True)
    payload["_ingested_at"] = datetime.now(timezone.utc).isoformat()
    await db.collection(MongoCollections.REF_FARMER_SCHEMES).document(doc_id).update(payload)
    return {"detail": "Scheme updated"}


@router.delete("/data/schemes/{scheme_id}", status_code=HttpStatus.OK)
async def delete_scheme(scheme_id: str, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    doc_id = f"scheme_{scheme_id}" if not scheme_id.startswith("scheme_") else scheme_id
    await db.collection(MongoCollections.REF_FARMER_SCHEMES).document(doc_id).update({"is_active": False})
    return {"detail": "Scheme soft-deleted"}


@router.get("/data/equipment-providers", status_code=HttpStatus.OK)
async def list_providers(
    refresh: bool = Query(False),
    admin: dict = Depends(get_current_admin),
):
    cache_key = "equipment-providers:all"
    if not refresh:
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

    db = get_async_db()
    items = []
    async for doc in db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).stream():
        data = doc.to_dict()
        data["id"] = doc.id
        data.setdefault("rental_id", doc.id)
        items.append(data)
    payload = {"items": items, "total": len(items)}
    if items:
        _cache_set(cache_key, payload, ttl_seconds=300)
    return payload


@router.post("/data/equipment-providers", status_code=HttpStatus.CREATED)
async def create_provider(data: ProviderUpsertRequest, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    payload = data.model_dump(exclude_none=True)
    now = datetime.now(timezone.utc).isoformat()
    payload["_ingested_at"] = now
    payload["updated_at"] = now

    # Keep API/admin payload compatibility with runtime equipment routes.
    if payload.get("contact_phone") and not payload.get("provider_phone"):
        payload["provider_phone"] = payload.get("contact_phone")
    if payload.get("provider_phone") and not payload.get("contact_phone"):
        payload["contact_phone"] = payload.get("provider_phone")

    rental_id = str(payload.get("rental_id") or "").strip()
    if not rental_id:
        provider_key = str(payload.get("provider_id") or payload.get("provider_name") or "provider")
        equipment_key = str(payload.get("name") or payload.get("category") or "equipment")
        state_key = str(payload.get("state") or "")
        district_key = str(payload.get("district") or "")
        rental_id = f"rental_{_slug(provider_key)}_{_slug(equipment_key)}_{_slug(state_key)}_{_slug(district_key)}"

    payload["rental_id"] = rental_id
    await db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).document(rental_id).set(payload, merge=True)
    return {"detail": "Provider created", "id": rental_id}


@router.put("/data/equipment-providers/{rental_id}", status_code=HttpStatus.OK)
async def update_provider(rental_id: str, data: ProviderUpsertRequest, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    doc = await db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).document(rental_id).get()
    if not doc.exists:
        raise not_found("Provider not found")
    payload = data.model_dump(exclude_none=True)

    if payload.get("contact_phone") and not payload.get("provider_phone"):
        payload["provider_phone"] = payload.get("contact_phone")
    if payload.get("provider_phone") and not payload.get("contact_phone"):
        payload["contact_phone"] = payload.get("provider_phone")

    payload["rental_id"] = rental_id
    payload["updated_at"] = _now_iso()
    await db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).document(rental_id).update(payload)
    await db.collection(MongoCollections.ADMIN_AUDIT_LOGS).add(
        {
            "admin_id": admin.get("id", ""),
            "action": "UPDATE_EQUIPMENT_PROVIDER",
            "target_collection": MongoCollections.REF_EQUIPMENT_PROVIDERS,
            "target_doc_id": rental_id,
            "payload_summary": f"fields={','.join(sorted(payload.keys()))}",
            "timestamp": _now_iso(),
        }
    )
    return {"detail": "Provider updated"}


@router.delete("/data/equipment-providers/{rental_id}", status_code=HttpStatus.OK)
async def soft_delete_provider(rental_id: str, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    ref = db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).document(rental_id)
    doc = await ref.get()
    if not doc.exists:
        raise not_found("Provider not found")

    await ref.update({"is_active": False, "updated_at": _now_iso()})
    await db.collection(MongoCollections.ADMIN_AUDIT_LOGS).add(
        {
            "admin_id": admin.get("id", ""),
            "action": "SOFT_DELETE_EQUIPMENT_PROVIDER",
            "target_collection": MongoCollections.REF_EQUIPMENT_PROVIDERS,
            "target_doc_id": rental_id,
            "payload_summary": "is_active=False",
            "timestamp": _now_iso(),
        }
    )
    return {"detail": "Provider deactivated"}


@router.get("/data/equipment-providers/search", status_code=HttpStatus.OK)
async def search_providers(
    q: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=200),
    admin: dict = Depends(get_current_admin),
):
    db = get_async_db()
    query_text = (q or "").strip().lower()
    state_q = (state or "").strip().lower()
    category_q = (category or "").strip().lower()

    items = []
    async for doc in db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).stream():
        data = doc.to_dict() or {}
        if is_active is not None and bool(data.get("is_active", True)) != is_active:
            continue
        if state_q and str(data.get("state") or "").strip().lower() != state_q:
            continue
        if category_q and str(data.get("category") or "").strip().lower() != category_q:
            continue
        if query_text and query_text not in str(data).lower():
            continue

        data["id"] = doc.id
        data.setdefault("rental_id", doc.id)
        items.append(data)

    items.sort(key=lambda row: str(row.get("updated_at") or row.get("_ingested_at") or ""), reverse=True)
    total = len(items)
    start = (page - 1) * per_page
    end = start + per_page
    return {
        "items": items[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if per_page else 0,
    }


@router.post("/data/equipment-rate-history", status_code=HttpStatus.CREATED)
async def create_rate_history_entry(body: RateHistoryEntry, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    payload = body.model_dump(exclude_none=True)
    now = _now_iso()
    doc_id = f"{_slug(payload.get('equipment_name', ''))}_{_slug(payload.get('state', ''))}_{_slug(payload.get('period', ''))}"
    payload.update(
        {
            "created_at": now,
            "updated_at": now,
            "created_by": admin.get("id", ""),
        }
    )
    await db.collection(MongoCollections.REF_EQUIPMENT_RATE_HISTORY).document(doc_id).set(payload, merge=True)
    await db.collection(MongoCollections.ADMIN_AUDIT_LOGS).add(
        {
            "admin_id": admin.get("id", ""),
            "action": "CREATE_EQUIPMENT_RATE_HISTORY",
            "target_collection": MongoCollections.REF_EQUIPMENT_RATE_HISTORY,
            "target_doc_id": doc_id,
            "payload_summary": f"{payload.get('equipment_name')}|{payload.get('state')}|{payload.get('period')}",
            "timestamp": now,
        }
    )
    return {"detail": "Rate history entry created", "id": doc_id}


@router.get("/data/equipment-rate-history", status_code=HttpStatus.OK)
async def list_rate_history_entries(
    equipment_name: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    admin: dict = Depends(get_current_admin),
):
    db = get_async_db()
    eq_q = (equipment_name or "").strip().lower()
    st_q = (state or "").strip().lower()

    items = []
    async for doc in db.collection(MongoCollections.REF_EQUIPMENT_RATE_HISTORY).stream():
        data = doc.to_dict() or {}
        row_name = str(data.get("equipment_name") or "").strip().lower()
        row_state = str(data.get("state") or "").strip().lower()
        if eq_q and eq_q not in row_name:
            continue
        if st_q and row_state != st_q:
            continue
        data["id"] = doc.id
        items.append(data)

    items.sort(key=lambda row: str(row.get("period") or ""))
    return {"items": items, "total": len(items)}


@router.get("/rentals", status_code=HttpStatus.OK)
async def admin_list_rentals(
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=200),
    admin: dict = Depends(get_current_admin),
):
    db = get_async_db()
    status_q = (status or "").strip().lower()

    rentals = []
    query = db.collection(MongoCollections.EQUIPMENT_BOOKINGS)
    if status_q:
        query = query.where(filter=FieldFilter("status", "==", status_q))

    async for doc in query.stream():
        row = doc.to_dict() or {}
        row["id"] = doc.id
        rentals.append(row)

    rentals.sort(key=lambda row: str(row.get("updated_at") or row.get("created_at") or ""), reverse=True)
    total = len(rentals)
    start = (page - 1) * per_page
    end = start + per_page
    return {
        "items": rentals[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if per_page else 0,
    }


@router.get("/rentals/{rental_id}", status_code=HttpStatus.OK)
async def admin_get_rental(rental_id: str, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    doc = await db.collection(MongoCollections.EQUIPMENT_BOOKINGS).document(rental_id).get()
    if not doc.exists:
        raise not_found("Rental not found")
    data = doc.to_dict() or {}
    data["id"] = doc.id
    return data


async def _admin_update_rental_status(db, rental_id: str, status_value: str, admin_id: str, action: str) -> dict:
    ref = db.collection(MongoCollections.EQUIPMENT_BOOKINGS).document(rental_id)
    doc = await ref.get()
    if not doc.exists:
        raise not_found("Rental not found")

    current = (doc.to_dict() or {}).get("status", "")
    if str(current).lower() != "pending":
        raise bad_request("Only pending rentals can be updated by admin")

    now = _now_iso()
    await ref.update(
        {
            "status": status_value,
            "updated_at": now,
            "admin_action_by": admin_id,
            "admin_action_at": now,
        }
    )
    await db.collection(MongoCollections.ADMIN_AUDIT_LOGS).add(
        {
            "admin_id": admin_id,
            "action": action,
            "target_collection": MongoCollections.EQUIPMENT_BOOKINGS,
            "target_doc_id": rental_id,
            "payload_summary": f"status={status_value}",
            "timestamp": now,
        }
    )

    updated = await ref.get()
    payload = updated.to_dict() or {}
    payload["id"] = updated.id
    return payload


@router.put("/rentals/{rental_id}/approve", status_code=HttpStatus.OK)
async def admin_approve_rental(rental_id: str, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    return await _admin_update_rental_status(
        db=db,
        rental_id=rental_id,
        status_value="approved",
        admin_id=admin.get("id", ""),
        action="ADMIN_APPROVE_RENTAL",
    )


@router.put("/rentals/{rental_id}/reject", status_code=HttpStatus.OK)
async def admin_reject_rental(rental_id: str, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    return await _admin_update_rental_status(
        db=db,
        rental_id=rental_id,
        status_value="rejected",
        admin_id=admin.get("id", ""),
        action="ADMIN_REJECT_RENTAL",
    )


@router.put("/rentals/{rental_id}/force-status", status_code=HttpStatus.OK)
async def force_rental_status(
    rental_id: str,
    new_status: str = Query(..., min_length=1),
    reason: str = Query(..., min_length=3, max_length=500),
    admin: dict = Depends(get_current_super_admin),
):
    allowed = {"pending", "approved", "rejected", "completed", "cancelled"}
    status_clean = new_status.strip().lower()
    if status_clean not in allowed:
        raise bad_request(f"new_status must be one of {sorted(allowed)}")

    db = get_async_db()
    ref = db.collection(MongoCollections.EQUIPMENT_BOOKINGS).document(rental_id)
    doc = await ref.get()
    if not doc.exists:
        raise not_found("Rental not found")

    now = _now_iso()
    updates = {
        "status": status_clean,
        "updated_at": now,
        "admin_override_reason": reason,
        "admin_override_by": admin.get("id", ""),
        "admin_override_at": now,
    }
    await ref.update(updates)
    await db.collection(MongoCollections.ADMIN_AUDIT_LOGS).add(
        {
            "admin_id": admin.get("id", ""),
            "action": "FORCE_RENTAL_STATUS",
            "target_collection": MongoCollections.EQUIPMENT_BOOKINGS,
            "target_doc_id": rental_id,
            "payload_summary": f"status={status_clean};reason={reason}",
            "timestamp": now,
        }
    )

    updated = await ref.get()
    data = updated.to_dict() or {}
    data["id"] = updated.id
    return data


@router.get("/equipment/stats", status_code=HttpStatus.OK)
async def equipment_stats(admin: dict = Depends(get_current_admin)):
    db = get_async_db()

    equipment_items = [d.to_dict() or {} async for d in db.collection(MongoCollections.EQUIPMENT).stream()]
    booking_items = [d.to_dict() or {} async for d in db.collection(MongoCollections.EQUIPMENT_BOOKINGS).stream()]
    provider_items = [d.to_dict() or {} async for d in db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).stream()]

    total_listings = len(equipment_items)
    available_count = sum(1 for row in equipment_items if str(row.get("status") or "").lower() == "available")

    status_counts: dict[str, int] = {}
    for row in booking_items:
        key = str(row.get("status") or "unknown").lower()
        status_counts[key] = status_counts.get(key, 0) + 1

    approved_count = status_counts.get("approved", 0)
    completed_count = status_counts.get("completed", 0)
    total_bookings = len(booking_items)
    approval_rate = round(((approved_count + completed_count) / total_bookings) * 100.0, 2) if total_bookings else 0.0
    completion_rate = round((completed_count / max(1, approved_count + completed_count)) * 100.0, 2)

    active_providers = [row for row in provider_items if row.get("is_active") is not False]
    provider_states = {
        str(row.get("state") or "").strip()
        for row in active_providers
        if str(row.get("state") or "").strip()
    }
    provider_categories = {
        str(row.get("category") or "").strip()
        for row in active_providers
        if str(row.get("category") or "").strip()
    }

    by_category: dict[str, int] = {}
    for row in active_providers:
        cat = str(row.get("category") or "unknown").strip().lower()
        by_category[cat] = by_category.get(cat, 0) + 1
    top_categories = sorted(by_category.items(), key=lambda item: item[1], reverse=True)[:10]

    return {
        "farmer_listings": {
            "total": total_listings,
            "available": available_count,
        },
        "bookings": {
            "total": total_bookings,
            "by_status": status_counts,
            "approval_rate": approval_rate,
            "completion_rate": completion_rate,
        },
        "provider_marketplace": {
            "active_count": len(active_providers),
            "states_covered": len(provider_states),
            "categories_covered": len(provider_categories),
            "top_10_by_category": [
                {"category": category, "count": count} for category, count in top_categories
            ],
        },
    }


@router.post("/data/import/schemes", status_code=HttpStatus.OK)
async def bulk_import_schemes(body: BulkImportRequest, admin: dict = Depends(get_current_super_admin)):
    result = run_bulk_import_schemes(body.input_file, body.reembed)
    db = get_async_db()
    await db.collection(MongoCollections.ADMIN_AUDIT_LOGS).add(
        {
            "admin_id": admin.get("id", ""),
            "action": "BULK_IMPORT_SCHEMES",
            "target_collection": "ref_farmer_schemes",
            "target_doc_id": "bulk-import",
            "payload_summary": f"{result['input_file']} inserted={result.get('inserted', 0)} skipped_db={result.get('skipped_duplicate_in_db', 0)} skipped_file={result.get('skipped_duplicate_in_file', 0)} reembed={body.reembed}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
    return result


@router.post("/data/import/equipment", status_code=HttpStatus.OK)
async def bulk_import_equipment(body: BulkImportRequest, admin: dict = Depends(get_current_super_admin)):
    result = run_bulk_import_equipment(body.input_file, body.reembed)
    db = get_async_db()
    await db.collection(MongoCollections.ADMIN_AUDIT_LOGS).add(
        {
            "admin_id": admin.get("id", ""),
            "action": "BULK_IMPORT_EQUIPMENT",
            "target_collection": "ref_equipment_providers",
            "target_doc_id": "bulk-import",
            "payload_summary": f"{result['input_file']} inserted={result.get('inserted', 0)} skipped_db={result.get('skipped_duplicate_in_db', 0)} skipped_file={result.get('skipped_duplicate_in_file', 0)} reembed={body.reembed}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
    return result


@router.get("/data/mandi-prices", status_code=HttpStatus.OK)
async def browse_mandi_prices(
    state: str = Query(None), commodity: str = Query(None),
    page: int = Query(1, ge=1), per_page: int = Query(50, ge=1, le=200),
    admin: dict = Depends(get_current_admin),
):
    db = get_async_db()
    query = db.collection(MongoCollections.REF_MANDI_PRICES)
    if state:
        query = query.where("state", "==", state)
    if commodity:
        query = query.where("commodity", "==", commodity)
    query = query.limit(per_page)
    items = []
    async for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        items.append(data)
    return {"items": items, "page": page, "per_page": per_page}


# ── Ingestion Monitoring ─────────────────────────────────────────
@router.get("/ingestion/logs", status_code=HttpStatus.OK)
async def get_ingestion_logs(admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    items = []
    async for doc in db.collection(MongoCollections.REF_DATA_INGESTION_META).stream():
        data = doc.to_dict()
        data["id"] = doc.id
        items.append(data)
    return {"items": items}


@router.post("/ingestion/trigger/{script_name}", status_code=HttpStatus.OK)
async def trigger_ingestion(script_name: str, admin: dict = Depends(get_current_super_admin)):
    """Trigger a data ingestion script. SUPER_ADMIN only."""
    allowed = [
        "seed_reference_data",
        "generate_qdrant_indexes",
        "generate_analytics_snapshots",
        "upsert_schemes_from_file",
        "upsert_equipment_from_file",
    ]
    if script_name not in allowed:
        raise bad_request(f"Script '{script_name}' is not allowed. Allowed: {allowed}")
    db = get_async_db()
    now = datetime.now(timezone.utc).isoformat()
    await db.collection(MongoCollections.ADMIN_AUDIT_LOGS).add({
        "admin_id": admin.get("id", ""),
        "action": "TRIGGER_INGESTION",
        "target_collection": "scripts",
        "target_doc_id": script_name,
        "payload_summary": f"Triggered {script_name}",
        "timestamp": now,
    })
    return {"detail": f"Script '{script_name}' triggered", "note": "Script runs asynchronously. Check ingestion logs for status."}


# ── Analytics ────────────────────────────────────────────────────
@router.get("/analytics/overview", status_code=HttpStatus.OK)
async def analytics_overview(date: str = Query(None), admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = await db.collection(MongoCollections.ANALYTICS_SNAPSHOTS).document(date).get()
    if doc.exists:
        return doc.to_dict()
    return {"date": date, "message": "No snapshot available for this date"}


# ── System Config ────────────────────────────────────────────────
@router.get("/config", status_code=HttpStatus.OK)
async def get_config(admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    doc = await db.collection(MongoCollections.APP_CONFIG).document("global").get()
    if doc.exists:
        return doc.to_dict()
    return {"maintenance_mode": False, "agent_enabled": True, "voice_enabled": True}


@router.put("/config", status_code=HttpStatus.OK)
async def update_config(body: AppConfigUpdate, admin: dict = Depends(get_current_super_admin)):
    db = get_async_db()
    updates = body.model_dump(exclude_none=True)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = admin.get("id", "")
    await db.collection(MongoCollections.APP_CONFIG).document("global").update(updates)
    await db.collection(MongoCollections.ADMIN_AUDIT_LOGS).add({"admin_id": admin.get("id", ""), "action": "UPDATE_CONFIG", "target_collection": "app_config", "target_doc_id": "global", "payload_summary": str(updates), "timestamp": updates["updated_at"]})
    return {"detail": "Config updated"}


@router.put("/config/feature-flags", status_code=HttpStatus.OK)
async def update_feature_flags(body: FeatureFlagsUpdate, admin: dict = Depends(get_current_super_admin)):
    db = get_async_db()
    now = datetime.now(timezone.utc).isoformat()
    await db.collection(MongoCollections.APP_CONFIG).document("global").update({"feature_flags": body.flags, "updated_at": now, "updated_by": admin.get("id", "")})
    return {"detail": "Feature flags updated"}


# ── Admin User Management ────────────────────────────────────────
@router.get("/admins", status_code=HttpStatus.OK)
async def list_admins(admin: dict = Depends(get_current_super_admin)):
    db = get_async_db()
    items = []
    async for doc in db.collection(MongoCollections.ADMIN_USERS).stream():
        data = doc.to_dict()
        data["id"] = doc.id
        data.pop("password_hash", None)
        items.append(data)
    return {"items": items}


@router.post("/admins", status_code=HttpStatus.CREATED)
async def create_admin(body: AdminUserCreate, admin: dict = Depends(get_current_super_admin)):
    db = get_async_db()
    # Check duplicate
    existing = db.collection(MongoCollections.ADMIN_USERS).where("email", "==", body.email).limit(1)
    dups = [d async for d in existing.stream()]
    if dups:
        raise conflict("Admin with this email already exists", ErrorCode.ADMIN_USER_EXISTS)
    now = datetime.now(timezone.utc).isoformat()
    admin_id = f"admin_{body.email.split('@')[0].replace('.', '_')}"
    admin_doc = {"admin_id": admin_id, "email": body.email, "password_hash": hash_password(body.password), "name": body.name, "role": body.role, "is_active": True, "created_at": now, "last_login_at": None, "created_by": admin.get("id", "")}
    await db.collection(MongoCollections.ADMIN_USERS).document(admin_id).set(admin_doc)
    return {"detail": "Admin created", "admin_id": admin_id}


@router.put("/admins/{admin_id}/status", status_code=HttpStatus.OK)
async def update_admin_status(admin_id: str, body: FarmerStatusUpdate, admin: dict = Depends(get_current_super_admin)):
    db = get_async_db()
    doc = await db.collection(MongoCollections.ADMIN_USERS).document(admin_id).get()
    if not doc.exists:
        raise not_found("Admin not found")
    await db.collection(MongoCollections.ADMIN_USERS).document(admin_id).update({"is_active": body.is_active})
    return {"detail": f"Admin {'activated' if body.is_active else 'deactivated'}"}
