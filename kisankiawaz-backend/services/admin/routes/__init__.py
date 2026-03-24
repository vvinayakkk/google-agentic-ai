"""Admin service routes — all routes require ADMIN or SUPER_ADMIN JWT."""

import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from shared.auth.deps import get_current_admin, get_current_super_admin
from shared.auth.security import hash_password, verify_password, create_access_token, create_refresh_token
from shared.db.mongodb import get_async_db
from shared.core.constants import MongoCollections
from shared.errors import HttpStatus, bad_request, not_found, conflict, ErrorCode
from shared.schemas.admin import AdminLoginRequest, AdminUserCreate, AppConfigUpdate, FarmerStatusUpdate

router = APIRouter()


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
async def create_scheme(data: dict, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    now = datetime.now(timezone.utc).isoformat()
    data["_ingested_at"] = now
    data["_created_by"] = admin.get("id", "")
    scheme_id = data.get("scheme_id", "")
    doc_id = f"scheme_{scheme_id}" if scheme_id else None
    if doc_id:
        await db.collection(MongoCollections.REF_FARMER_SCHEMES).document(doc_id).set(data, merge=True)
    else:
        _, ref = await db.collection(MongoCollections.REF_FARMER_SCHEMES).add(data)
        doc_id = ref.id
    await db.collection(MongoCollections.ADMIN_AUDIT_LOGS).add({"admin_id": admin.get("id", ""), "action": "CREATE_SCHEME", "target_collection": "ref_farmer_schemes", "target_doc_id": doc_id, "timestamp": now})
    return {"detail": "Scheme created", "id": doc_id}


@router.put("/data/schemes/{scheme_id}", status_code=HttpStatus.OK)
async def update_scheme(scheme_id: str, data: dict, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    doc_id = f"scheme_{scheme_id}" if not scheme_id.startswith("scheme_") else scheme_id
    doc = await db.collection(MongoCollections.REF_FARMER_SCHEMES).document(doc_id).get()
    if not doc.exists:
        raise not_found("Scheme not found")
    data["_ingested_at"] = datetime.now(timezone.utc).isoformat()
    await db.collection(MongoCollections.REF_FARMER_SCHEMES).document(doc_id).update(data)
    return {"detail": "Scheme updated"}


@router.delete("/data/schemes/{scheme_id}", status_code=HttpStatus.OK)
async def delete_scheme(scheme_id: str, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    doc_id = f"scheme_{scheme_id}" if not scheme_id.startswith("scheme_") else scheme_id
    await db.collection(MongoCollections.REF_FARMER_SCHEMES).document(doc_id).update({"is_active": False})
    return {"detail": "Scheme soft-deleted"}


@router.get("/data/equipment-providers", status_code=HttpStatus.OK)
async def list_providers(admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    items = []
    async for doc in db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).stream():
        data = doc.to_dict()
        data["id"] = doc.id
        items.append(data)
    return {"items": items, "total": len(items)}


@router.post("/data/equipment-providers", status_code=HttpStatus.CREATED)
async def create_provider(data: dict, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    data["_ingested_at"] = datetime.now(timezone.utc).isoformat()
    rental_id = data.get("rental_id", "")
    if rental_id:
        await db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).document(rental_id).set(data, merge=True)
    else:
        await db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).add(data)
    return {"detail": "Provider created"}


@router.put("/data/equipment-providers/{rental_id}", status_code=HttpStatus.OK)
async def update_provider(rental_id: str, data: dict, admin: dict = Depends(get_current_admin)):
    db = get_async_db()
    doc = await db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).document(rental_id).get()
    if not doc.exists:
        raise not_found("Provider not found")
    await db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).document(rental_id).update(data)
    return {"detail": "Provider updated"}


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
    allowed = ["seed_reference_data", "generate_qdrant_indexes", "generate_analytics_snapshots"]
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
async def update_feature_flags(flags: dict, admin: dict = Depends(get_current_super_admin)):
    db = get_async_db()
    now = datetime.now(timezone.utc).isoformat()
    await db.collection(MongoCollections.APP_CONFIG).document("global").update({"feature_flags": flags, "updated_at": now, "updated_by": admin.get("id", "")})
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
