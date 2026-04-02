import re
import uuid
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from shared.core.constants import MongoCollections
from shared.db.mongodb import get_db


_DATE_PATTERN = re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b")
_TIME_PATTERN = re.compile(r"\b([01]?\d|2[0-3]):([0-5]\d)\b")
_MAX_EVENTS_PER_REQUEST = max(1, int((os.getenv("CALENDAR_MAX_EVENTS_PER_REQUEST") or "10").strip() or "10"))
_MAX_DAYS_AHEAD = max(1, int((os.getenv("CALENDAR_MAX_DAYS_AHEAD") or "365").strip() or "365"))
_MAX_DAYS_PAST = max(0, int((os.getenv("CALENDAR_MAX_DAYS_PAST") or "30").strip() or "30"))
_CONFLICT_WINDOW_MINUTES = max(1, int((os.getenv("CALENDAR_CONFLICT_WINDOW_MINUTES") or "60").strip() or "60"))
_DUPLICATE_WINDOW_HOURS = max(1, int((os.getenv("CALENDAR_DUPLICATE_WINDOW_HOURS") or "24").strip() or "24"))
_ACTION_LOG_COLLECTION = "calendar_action_logs"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _compact_text(text: str, max_chars: int = 260) -> str:
    clean = " ".join(str(text or "").split()).strip()
    if len(clean) <= max_chars:
        return clean
    return clean[: max_chars - 3].rstrip() + "..."


def _normalize_date(value: str | None) -> str:
    if value:
        try:
            return datetime.strptime(value.strip(), "%Y-%m-%d").strftime("%Y-%m-%d")
        except ValueError:
            pass
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _normalize_time(value: str | None) -> str:
    if value:
        m = _TIME_PATTERN.search(value)
        if m:
            return f"{int(m.group(1)):02d}:{m.group(2)}"
    return "08:00"


def _normalize_title_for_match(title: str) -> str:
    txt = str(title or "").lower()
    txt = re.sub(r"[^a-z0-9\s]", " ", txt)
    txt = " ".join(txt.split())
    return txt


def _event_datetime_utc(event_date: str, event_time: str) -> datetime | None:
    try:
        return datetime.strptime(f"{event_date} {event_time}", "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _within_allowed_date_range(event_date: str) -> bool:
    try:
        day = datetime.strptime(event_date, "%Y-%m-%d").date()
    except ValueError:
        return False

    today = datetime.now(timezone.utc).date()
    if day < (today - timedelta(days=_MAX_DAYS_PAST)):
        return False
    if day > (today + timedelta(days=_MAX_DAYS_AHEAD)):
        return False
    return True


def _write_notification(user_id: str, title: str, body: str, ntype: str, data: dict[str, Any] | None = None) -> None:
    now = _now_iso()
    get_db().collection(MongoCollections.NOTIFICATIONS).document(uuid.uuid4().hex).set(
        {
            "user_id": user_id,
            "title": title,
            "message": body,
            "body": body,
            "type": ntype,
            "data": data or {},
            "is_read": False,
            "read": False,
            "created_at": now,
        }
    )


def _write_action_log(user_id: str, action_type: str, payload: dict[str, Any]) -> str:
    action_id = uuid.uuid4().hex
    get_db().collection(_ACTION_LOG_COLLECTION).document(action_id).set(
        {
            "user_id": user_id,
            "action_type": action_type,
            "payload": payload,
            "created_at": _now_iso(),
            "undone": False,
        }
    )
    return action_id


def _mark_action_log_undone(action_id: str) -> None:
    get_db().collection(_ACTION_LOG_COLLECTION).document(action_id).set(
        {"undone": True, "undone_at": _now_iso()}, merge=True
    )


def _find_existing_event(
    db,
    user_id: str,
    title: str,
    event_date: str,
    event_time: str,
) -> dict[str, Any] | None:
    title_key = _normalize_title_for_match(title)
    docs = list(
        db.collection(MongoCollections.CALENDAR_EVENTS)
        .where("user_id", "==", user_id)
        .where("event_date", "==", event_date)
        .where("event_time", "==", event_time)
        .limit(60)
        .stream()
    )

    for doc in docs:
        item = doc.to_dict() or {}
        if _normalize_title_for_match(str(item.get("title") or "")) == title_key:
            return {
                "id": str(item.get("id") or doc.id),
                "title": str(item.get("title") or "").strip(),
                "event_date": str(item.get("event_date") or "").strip(),
                "event_time": str(item.get("event_time") or "").strip(),
                "status": str(item.get("status") or "planned").strip(),
            }
    return None


def _find_conflicting_event(db, user_id: str, event_date: str, event_time: str) -> dict[str, Any] | None:
    target_dt = _event_datetime_utc(event_date, event_time)
    if target_dt is None:
        return None

    docs = list(
        db.collection(MongoCollections.CALENDAR_EVENTS)
        .where("user_id", "==", user_id)
        .where("event_date", "==", event_date)
        .limit(120)
        .stream()
    )
    for doc in docs:
        item = doc.to_dict() or {}
        other_time = str(item.get("event_time") or "").strip()
        other_dt = _event_datetime_utc(event_date, other_time)
        if other_dt is None:
            continue
        delta_min = abs((other_dt - target_dt).total_seconds()) / 60.0
        if delta_min <= _CONFLICT_WINDOW_MINUTES:
            return {
                "id": str(item.get("id") or doc.id),
                "title": str(item.get("title") or "").strip(),
                "event_date": event_date,
                "event_time": other_time,
                "status": str(item.get("status") or "planned").strip(),
                "delta_minutes": int(delta_min),
            }
    return None


def _suggest_alternate_slots(db, user_id: str, event_date: str, event_time: str, count: int = 2) -> list[dict[str, str]]:
    base_dt = _event_datetime_utc(event_date, event_time)
    if base_dt is None:
        return []

    deltas = [30, 60, 90, 120, -30, -60, -90, -120]
    suggestions: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for delta in deltas:
        cand_dt = base_dt + timedelta(minutes=delta)
        cand_date = cand_dt.strftime("%Y-%m-%d")
        cand_time = cand_dt.strftime("%H:%M")
        key = (cand_date, cand_time)
        if key in seen:
            continue
        seen.add(key)
        if not _within_allowed_date_range(cand_date):
            continue
        if _find_conflicting_event(db, user_id, cand_date, cand_time):
            continue
        suggestions.append({"event_date": cand_date, "event_time": cand_time})
        if len(suggestions) >= max(1, count):
            break
    return suggestions


def _find_fuzzy_duplicate_event(
    db,
    user_id: str,
    title: str,
    event_date: str,
    event_time: str,
) -> dict[str, Any] | None:
    target_dt = _event_datetime_utc(event_date, event_time)
    if target_dt is None:
        return None
    title_key = _normalize_title_for_match(title)

    start_date = (target_dt - timedelta(hours=_DUPLICATE_WINDOW_HOURS)).strftime("%Y-%m-%d")
    end_date = (target_dt + timedelta(hours=_DUPLICATE_WINDOW_HOURS)).strftime("%Y-%m-%d")
    docs = list(
        db.collection(MongoCollections.CALENDAR_EVENTS)
        .where("user_id", "==", user_id)
        .limit(300)
        .stream()
    )

    for doc in docs:
        item = doc.to_dict() or {}
        d = str(item.get("event_date") or "")
        if d < start_date or d > end_date:
            continue
        t = str(item.get("event_time") or "")
        other_dt = _event_datetime_utc(d, t)
        if other_dt is None:
            continue
        if abs((other_dt - target_dt).total_seconds()) > (_DUPLICATE_WINDOW_HOURS * 3600):
            continue
        other_key = _normalize_title_for_match(str(item.get("title") or ""))
        if other_key == title_key:
            return {
                "id": str(item.get("id") or doc.id),
                "title": str(item.get("title") or "").strip(),
                "event_date": d,
                "event_time": t,
                "status": str(item.get("status") or "planned").strip(),
            }
    return None


def _extract_tasks_from_request(request_text: str) -> list[dict[str, str]]:
    text = str(request_text or "").strip()
    if not text:
        return []

    # Keep only the scheduling segment when prompt mixes scheduling + advisory asks.
    lower = text.lower()
    cut_markers = [" also provide", " and also provide", " then provide", " plus provide"]
    for marker in cut_markers:
        idx = lower.find(marker)
        if idx > 0:
            text = text[:idx].strip()
            break

    tasks: list[dict[str, str]] = []

    # Pattern: YYYY-MM-DD HH:MM - title
    pattern = re.compile(
        r"(20\d{2}-\d{2}-\d{2})\s*(?:at|@)?\s*([01]?\d:[0-5]\d)?\s*[-:]\s*([^;\n|]+)",
        flags=re.IGNORECASE,
    )
    for match in pattern.finditer(text):
        date_s = _normalize_date(match.group(1))
        time_s = _normalize_time(match.group(2) or "")
        title = _compact_text(match.group(3), 140)
        if title:
            tasks.append({"title": title, "event_date": date_s, "event_time": time_s})

    if tasks:
        return tasks[:8]

    # Fallback split by delimiters and derive date/time from each chunk if present.
    parts = [p.strip(" -") for p in re.split(r";|\n|\|", text) if p.strip(" -")]
    for part in parts[:8]:
        date_match = _DATE_PATTERN.search(part)
        time_match = _TIME_PATTERN.search(part)
        date_s = _normalize_date(date_match.group(1) if date_match else None)
        time_s = _normalize_time(time_match.group(0) if time_match else None)
        title = part
        if date_match:
            title = title.replace(date_match.group(1), "")
        if time_match:
            title = title.replace(time_match.group(0), "")
        title = _compact_text(title.strip(" -:@"), 140)
        if title:
            tasks.append({"title": title, "event_date": date_s, "event_time": time_s})

    if tasks:
        return tasks[:8]

    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    return [{"title": _compact_text(text, 140), "event_date": tomorrow, "event_time": "08:00"}]


def _collect_route_context(
    message: str,
    state: str = "",
    district: str = "",
    crop_name: str = "",
) -> dict[str, Any]:
    from tools.crop_tools import get_crop_calendar
    from tools.market_tools import get_nearby_mandis, search_market_prices
    from tools.scheme_tools import search_equipment_rentals, search_government_schemes
    from tools.weather_tools import search_weather_knowledge

    state_hint = (state or "").strip()
    district_hint = (district or "").strip()
    crop_hint = (crop_name or "Tomato").strip() or "Tomato"

    context: dict[str, Any] = {"generated_at_utc": _now_iso()}

    try:
        context["market_prices"] = search_market_prices(
            crop_name=crop_hint,
            state=state_hint,
        )
    except Exception as exc:  # noqa: BLE001
        context["market_prices_error"] = str(exc)

    try:
        context["mandis"] = get_nearby_mandis(
            state=state_hint,
            district=district_hint,
        )
    except Exception as exc:  # noqa: BLE001
        context["mandis_error"] = str(exc)

    try:
        context["weather_knowledge"] = search_weather_knowledge(
            query=f"weather risk and soil moisture advisory {state_hint} {district_hint}"
        )
    except Exception as exc:  # noqa: BLE001
        context["weather_soil_error"] = str(exc)

    try:
        context["schemes"] = search_government_schemes(query=message, state=state_hint)
    except Exception as exc:  # noqa: BLE001
        context["schemes_error"] = str(exc)

    try:
        context["equipment"] = search_equipment_rentals(query=message, state=state_hint)
    except Exception as exc:  # noqa: BLE001
        context["equipment_error"] = str(exc)

    try:
        context["crop_calendar"] = get_crop_calendar(crop_name=crop_hint, region=district_hint or state_hint or "general")
    except Exception as exc:  # noqa: BLE001
        context["crop_calendar_error"] = str(exc)

    return context


def create_calendar_event(
    user_id: str,
    title: str,
    event_date: str,
    event_time: str = "08:00",
    details: str = "",
    metadata: dict[str, Any] | None = None,
    allow_conflict: bool = False,
    skip_notification: bool = False,
    log_action: bool = True,
) -> dict[str, Any]:
    """Create one calendar event and verify persistence in DB."""
    uid = str(user_id or "").strip()
    if not uid:
        return {"ok": False, "error": "user_id_required"}

    clean_title = _compact_text(title, 140)
    if not clean_title:
        return {"ok": False, "error": "title_required"}

    normalized_date = _normalize_date(event_date)
    normalized_time = _normalize_time(event_time)
    if not _within_allowed_date_range(normalized_date):
        return {
            "ok": False,
            "error": "event_date_out_of_allowed_range",
            "allowed_window_days": {
                "past": _MAX_DAYS_PAST,
                "ahead": _MAX_DAYS_AHEAD,
            },
        }

    db = get_db()
    existing = _find_existing_event(
        db=db,
        user_id=uid,
        title=clean_title,
        event_date=normalized_date,
        event_time=normalized_time,
    )
    if existing:
        return {
            "ok": True,
            "source": MongoCollections.CALENDAR_EVENTS,
            "event": existing,
            "verified": True,
            "idempotent": True,
            "message": "existing_event_reused",
        }

    fuzzy_dup = _find_fuzzy_duplicate_event(
        db=db,
        user_id=uid,
        title=clean_title,
        event_date=normalized_date,
        event_time=normalized_time,
    )
    if fuzzy_dup:
        return {
            "ok": True,
            "source": MongoCollections.CALENDAR_EVENTS,
            "event": fuzzy_dup,
            "verified": True,
            "idempotent": True,
            "message": "fuzzy_duplicate_reused",
        }

    conflict = _find_conflicting_event(
        db=db,
        user_id=uid,
        event_date=normalized_date,
        event_time=normalized_time,
    )
    if conflict and not allow_conflict:
        return {
            "ok": False,
            "error": "event_conflict_detected",
            "conflict": conflict,
            "suggestion": "Use a different time slot or pass allow_conflict=True.",
            "alternate_slots": _suggest_alternate_slots(
                db=db,
                user_id=uid,
                event_date=normalized_date,
                event_time=normalized_time,
                count=2,
            ),
        }

    event_id = uuid.uuid4().hex
    now = _now_iso()
    payload = {
        "user_id": uid,
        "farmer_id": uid,
        "title": clean_title,
        "details": _compact_text(details, 500),
        "event_date": normalized_date,
        "event_time": normalized_time,
        "status": "planned",
        "source": "agent_chat",
        "metadata": metadata or {},
        "created_at": now,
        "updated_at": now,
    }

    ref = db.collection(MongoCollections.CALENDAR_EVENTS).document(event_id)
    ref.set(payload)
    snap = ref.get()

    if not snap.exists:
        return {"ok": False, "error": "db_write_unverified", "event_id": event_id}

    saved = snap.to_dict()
    event_obj = {
        "id": event_id,
        "title": saved.get("title", ""),
        "event_date": saved.get("event_date", ""),
        "event_time": saved.get("event_time", ""),
        "status": saved.get("status", ""),
    }

    if log_action:
        _write_action_log(
            user_id=uid,
            action_type="create",
            payload={"event": event_obj},
        )

    if not skip_notification:
        _write_notification(
            user_id=uid,
            title="Calendar task scheduled",
            body=f"{event_obj['title']} on {event_obj['event_date']} at {event_obj['event_time']}.",
            ntype="calendar",
            data={"event_id": event_id, "action": "create"},
        )

    return {
        "ok": True,
        "source": MongoCollections.CALENDAR_EVENTS,
        "event": event_obj,
        "verified": True,
    }


def list_calendar_events(
    user_id: str,
    limit: int = 10,
    start_date: str = "",
    end_date: str = "",
) -> dict[str, Any]:
    """List upcoming calendar events for a user from DB."""
    uid = str(user_id or "").strip()
    if not uid:
        return {"ok": False, "error": "user_id_required"}

    docs = list(
        get_db()
        .collection(MongoCollections.CALENDAR_EVENTS)
        .where("user_id", "==", uid)
        .limit(max(20, min(int(limit) * 8, 300)))
        .stream()
    )

    start_s = _normalize_date(start_date) if start_date else ""
    end_s = _normalize_date(end_date) if end_date else ""

    rows: list[dict[str, Any]] = []
    for doc in docs:
        item = doc.to_dict() or {}
        d = str(item.get("event_date") or "")
        if start_s and d and d < start_s:
            continue
        if end_s and d and d > end_s:
            continue
        rows.append(
            {
                "id": str(item.get("id") or doc.id),
                "title": str(item.get("title") or "").strip(),
                "event_date": d,
                "event_time": str(item.get("event_time") or "").strip(),
                "status": str(item.get("status") or "planned").strip(),
                "details": str(item.get("details") or "").strip(),
                "updated_at": str(item.get("updated_at") or ""),
            }
        )

    rows.sort(key=lambda x: (x.get("event_date", ""), x.get("event_time", ""), x.get("title", "")))
    return {
        "ok": True,
        "source": MongoCollections.CALENDAR_EVENTS,
        "count": len(rows[: max(1, min(limit, 50))]),
        "events": rows[: max(1, min(limit, 50))],
    }


def update_calendar_event(
    user_id: str,
    event_id: str,
    title: str = "",
    event_date: str = "",
    event_time: str = "",
    details: str = "",
    status: str = "",
    allow_conflict: bool = False,
    skip_notification: bool = False,
    log_action: bool = True,
) -> dict[str, Any]:
    """Update calendar event fields with ownership check and verification."""
    uid = str(user_id or "").strip()
    eid = str(event_id or "").strip()
    if not uid or not eid:
        return {"ok": False, "error": "user_id_and_event_id_required"}

    db = get_db()
    ref = db.collection(MongoCollections.CALENDAR_EVENTS).document(eid)
    snap = ref.get()
    if not snap.exists:
        return {"ok": False, "error": "event_not_found", "event_id": eid}

    current = snap.to_dict() or {}
    if str(current.get("user_id") or "") != uid:
        return {"ok": False, "error": "event_access_denied", "event_id": eid}

    before = {
        "id": eid,
        "title": str(current.get("title") or "").strip(),
        "event_date": str(current.get("event_date") or "").strip(),
        "event_time": str(current.get("event_time") or "").strip(),
        "status": str(current.get("status") or "planned").strip(),
        "details": str(current.get("details") or "").strip(),
    }

    patch: dict[str, Any] = {"updated_at": _now_iso()}
    if title.strip():
        patch["title"] = _compact_text(title, 140)
    if event_date.strip():
        normalized_date = _normalize_date(event_date)
        if not _within_allowed_date_range(normalized_date):
            return {
                "ok": False,
                "error": "event_date_out_of_allowed_range",
                "allowed_window_days": {"past": _MAX_DAYS_PAST, "ahead": _MAX_DAYS_AHEAD},
            }
        patch["event_date"] = normalized_date
    if event_time.strip():
        patch["event_time"] = _normalize_time(event_time)
    if details.strip():
        patch["details"] = _compact_text(details, 500)
    if status.strip():
        patch["status"] = status.strip().lower()

    effective_date = str(patch.get("event_date") or before["event_date"])
    effective_time = str(patch.get("event_time") or before["event_time"])
    conflict = _find_conflicting_event(
        db=db,
        user_id=uid,
        event_date=effective_date,
        event_time=effective_time,
    )
    if conflict and str(conflict.get("id") or "") != eid and not allow_conflict:
        return {
            "ok": False,
            "error": "event_conflict_detected",
            "conflict": conflict,
            "suggestion": "Use a different time slot or pass allow_conflict=True.",
            "alternate_slots": _suggest_alternate_slots(
                db=db,
                user_id=uid,
                event_date=effective_date,
                event_time=effective_time,
                count=2,
            ),
        }

    ref.set(patch, merge=True)
    after = ref.get().to_dict() or {}
    event_obj = {
        "id": eid,
        "title": after.get("title", ""),
        "event_date": after.get("event_date", ""),
        "event_time": after.get("event_time", ""),
        "status": after.get("status", "planned"),
    }

    if log_action:
        _write_action_log(user_id=uid, action_type="update", payload={"before": before, "after": event_obj})

    if not skip_notification:
        _write_notification(
            user_id=uid,
            title="Calendar task updated",
            body=f"{event_obj['title']} is now set for {event_obj['event_date']} at {event_obj['event_time']}.",
            ntype="calendar",
            data={"event_id": eid, "action": "update"},
        )

    return {
        "ok": True,
        "source": MongoCollections.CALENDAR_EVENTS,
        "verified": True,
        "event": event_obj,
    }


def delete_calendar_event(user_id: str, event_id: str, skip_notification: bool = False, log_action: bool = True) -> dict[str, Any]:
    """Delete one calendar event with ownership check and verification."""
    uid = str(user_id or "").strip()
    eid = str(event_id or "").strip()
    if not uid or not eid:
        return {"ok": False, "error": "user_id_and_event_id_required"}

    db = get_db()
    ref = db.collection(MongoCollections.CALENDAR_EVENTS).document(eid)
    snap = ref.get()
    if not snap.exists:
        return {"ok": False, "error": "event_not_found", "event_id": eid}

    current = snap.to_dict() or {}
    if str(current.get("user_id") or "") != uid:
        return {"ok": False, "error": "event_access_denied", "event_id": eid}

    deleted_snapshot = {
        "id": eid,
        "user_id": uid,
        "title": str(current.get("title") or "").strip(),
        "details": str(current.get("details") or "").strip(),
        "event_date": str(current.get("event_date") or "").strip(),
        "event_time": str(current.get("event_time") or "").strip(),
        "status": str(current.get("status") or "planned").strip(),
        "source": str(current.get("source") or "agent_chat").strip(),
        "metadata": current.get("metadata") if isinstance(current.get("metadata"), dict) else {},
        "created_at": str(current.get("created_at") or ""),
        "updated_at": _now_iso(),
    }

    ref.delete()
    verified_deleted = not ref.get().exists
    if verified_deleted and log_action:
        _write_action_log(user_id=uid, action_type="delete", payload={"deleted": deleted_snapshot})
    if verified_deleted and (not skip_notification):
        _write_notification(
            user_id=uid,
            title="Calendar task deleted",
            body=f"Deleted: {deleted_snapshot['title']} ({deleted_snapshot['event_date']} {deleted_snapshot['event_time']}).",
            ntype="calendar",
            data={"event_id": eid, "action": "delete"},
        )
    return {
        "ok": verified_deleted,
        "source": MongoCollections.CALENDAR_EVENTS,
        "event_id": eid,
        "deleted": verified_deleted,
    }


def verify_calendar_event(user_id: str, event_id: str) -> dict[str, Any]:
    """Read back an event to verify its persisted state."""
    uid = str(user_id or "").strip()
    eid = str(event_id or "").strip()
    if not uid or not eid:
        return {"ok": False, "error": "user_id_and_event_id_required"}

    ref = get_db().collection(MongoCollections.CALENDAR_EVENTS).document(eid)
    snap = ref.get()
    if not snap.exists:
        return {"ok": False, "exists": False, "event_id": eid}

    item = snap.to_dict() or {}
    if str(item.get("user_id") or "") != uid:
        return {"ok": False, "error": "event_access_denied", "event_id": eid}

    return {
        "ok": True,
        "source": MongoCollections.CALENDAR_EVENTS,
        "exists": True,
        "event": {
            "id": eid,
            "title": item.get("title", ""),
            "event_date": item.get("event_date", ""),
            "event_time": item.get("event_time", ""),
            "status": item.get("status", "planned"),
            "updated_at": item.get("updated_at", ""),
        },
    }


def undo_last_calendar_action(user_id: str) -> dict[str, Any]:
    """Undo the latest non-undone calendar action for a user."""
    uid = str(user_id or "").strip()
    if not uid:
        return {"ok": False, "error": "user_id_required"}

    logs = list(
        get_db()
        .collection(_ACTION_LOG_COLLECTION)
        .where("user_id", "==", uid)
        .limit(120)
        .stream()
    )
    docs = []
    for doc in logs:
        item = doc.to_dict() or {}
        if bool(item.get("undone")):
            continue
        docs.append((doc.id, item))
    docs.sort(key=lambda x: str(x[1].get("created_at") or ""), reverse=True)
    if not docs:
        return {"ok": False, "error": "no_action_to_undo"}

    action_id, action = docs[0]
    action_type = str(action.get("action_type") or "")
    payload = action.get("payload") if isinstance(action.get("payload"), dict) else {}

    if action_type == "batch_create":
        event_ids = [str(eid) for eid in (payload.get("event_ids") or []) if str(eid).strip()]
        deleted = []
        for eid in event_ids:
            res = delete_calendar_event(user_id=uid, event_id=eid, skip_notification=True, log_action=False)
            if res.get("ok"):
                deleted.append(eid)
        _mark_action_log_undone(action_id)
        _write_notification(
            user_id=uid,
            title="Calendar undo applied",
            body=f"Removed {len(deleted)} task(s) from your last schedule action.",
            ntype="calendar",
            data={"action": "undo", "action_type": action_type},
        )
        return {"ok": True, "undone_action": action_type, "deleted_event_ids": deleted}

    if action_type == "create":
        event = payload.get("event") if isinstance(payload.get("event"), dict) else {}
        eid = str(event.get("id") or "")
        if not eid:
            return {"ok": False, "error": "undo_payload_invalid"}
        res = delete_calendar_event(user_id=uid, event_id=eid, skip_notification=True, log_action=False)
        if not res.get("ok"):
            return {"ok": False, "error": "undo_create_failed", "result": res}
        _mark_action_log_undone(action_id)
        _write_notification(
            user_id=uid,
            title="Calendar undo applied",
            body=f"Removed task: {event.get('title','')}",
            ntype="calendar",
            data={"action": "undo", "action_type": action_type, "event_id": eid},
        )
        return {"ok": True, "undone_action": action_type, "event_id": eid}

    if action_type == "delete":
        deleted = payload.get("deleted") if isinstance(payload.get("deleted"), dict) else {}
        eid = str(deleted.get("id") or "")
        if not eid:
            return {"ok": False, "error": "undo_payload_invalid"}
        doc = dict(deleted)
        doc["updated_at"] = _now_iso()
        get_db().collection(MongoCollections.CALENDAR_EVENTS).document(eid).set(doc)
        _mark_action_log_undone(action_id)
        _write_notification(
            user_id=uid,
            title="Calendar undo applied",
            body=f"Restored task: {doc.get('title','')}",
            ntype="calendar",
            data={"action": "undo", "action_type": action_type, "event_id": eid},
        )
        return {"ok": True, "undone_action": action_type, "event_id": eid}

    if action_type == "update":
        before = payload.get("before") if isinstance(payload.get("before"), dict) else {}
        eid = str(before.get("id") or "")
        if not eid:
            return {"ok": False, "error": "undo_payload_invalid"}
        res = update_calendar_event(
            user_id=uid,
            event_id=eid,
            title=str(before.get("title") or ""),
            event_date=str(before.get("event_date") or ""),
            event_time=str(before.get("event_time") or ""),
            details=str(before.get("details") or ""),
            status=str(before.get("status") or ""),
            allow_conflict=True,
            skip_notification=True,
            log_action=False,
        )
        if not res.get("ok"):
            return {"ok": False, "error": "undo_update_failed", "result": res}
        _mark_action_log_undone(action_id)
        _write_notification(
            user_id=uid,
            title="Calendar undo applied",
            body=f"Reverted update for task: {before.get('title','')}",
            ntype="calendar",
            data={"action": "undo", "action_type": action_type, "event_id": eid},
        )
        return {"ok": True, "undone_action": action_type, "event_id": eid}

    return {"ok": False, "error": f"undo_not_supported_for_{action_type}"}


def _best_matching_event(user_id: str, request_text: str) -> dict[str, Any] | None:
    text = str(request_text or "")
    date_match = _DATE_PATTERN.search(text)
    time_match = _TIME_PATTERN.search(text)
    date_hint = _normalize_date(date_match.group(1)) if date_match else ""
    time_hint = _normalize_time(time_match.group(0)) if time_match else ""

    candidates = list(
        get_db().collection(MongoCollections.CALENDAR_EVENTS).where("user_id", "==", user_id).limit(300).stream()
    )
    request_key = _normalize_title_for_match(text)
    request_tokens = set(request_key.split())

    scored: list[tuple[int, dict[str, Any]]] = []
    for doc in candidates:
        item = doc.to_dict() or {}
        event = {
            "id": str(item.get("id") or doc.id),
            "title": str(item.get("title") or "").strip(),
            "event_date": str(item.get("event_date") or "").strip(),
            "event_time": str(item.get("event_time") or "").strip(),
            "status": str(item.get("status") or "planned").strip(),
        }
        score = 0
        title_tokens = set(_normalize_title_for_match(event["title"]).split())
        overlap = len(request_tokens.intersection(title_tokens))
        score += overlap * 3
        if date_hint and event["event_date"] == date_hint:
            score += 4
        if time_hint and event["event_time"] == time_hint:
            score += 4
        if score > 0:
            scored.append((score, event))
    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        return None
    return scored[0][1]


def apply_calendar_action_from_request(user_id: str, request_text: str) -> dict[str, Any]:
    """Apply a natural-language calendar action: create, update, delete, undo, or list."""
    uid = str(user_id or "").strip()
    txt = str(request_text or "").strip()
    if not uid:
        return {"ok": False, "error": "user_id_required"}
    if not txt:
        return {"ok": False, "error": "request_text_required"}

    lower = txt.lower()
    if "undo" in lower:
        res = undo_last_calendar_action(uid)
        res["action"] = "undo"
        return res

    is_delete = any(k in lower for k in ["delete", "remove", "cancel"])
    is_update = any(k in lower for k in ["update", "reschedule", "move", "change"])
    is_create = any(k in lower for k in ["create", "add", "schedule", "set"])

    if is_delete:
        event = _best_matching_event(uid, txt)
        if not event:
            return {"ok": False, "action": "delete", "error": "no_matching_event_found"}
        res = delete_calendar_event(user_id=uid, event_id=str(event.get("id") or ""))
        res["action"] = "delete"
        res["target_event"] = event
        return res

    if is_update:
        event = _best_matching_event(uid, txt)
        if not event:
            return {"ok": False, "action": "update", "error": "no_matching_event_found"}
        date_match = _DATE_PATTERN.findall(txt)
        time_match = _TIME_PATTERN.findall(txt)
        new_date = date_match[-1] if date_match else event.get("event_date")
        new_time = ""
        if time_match:
            hh, mm = time_match[-1]
            new_time = f"{int(hh):02d}:{mm}"
        else:
            new_time = event.get("event_time")
        res = update_calendar_event(
            user_id=uid,
            event_id=str(event.get("id") or ""),
            event_date=str(new_date or ""),
            event_time=str(new_time or ""),
        )
        res["action"] = "update"
        res["target_event"] = event
        return res

    if is_create:
        res = create_calendar_events_from_request(user_id=uid, request_text=txt)
        res["action"] = "create"
        return res

    listed = list_calendar_events(user_id=uid, limit=10)
    listed["action"] = "list"
    return listed


def create_calendar_events_from_request(
    user_id: str,
    request_text: str,
    state: str = "",
    district: str = "",
    crop_name: str = "",
    include_route_context: bool = True,
) -> dict[str, Any]:
    """Create multiple calendar events from a chat request and verify DB writes.

    Supports patterns like:
    - 2026-04-05 06:30 - Irrigate tomato field
    - 2026-04-05 at 17:00 - Visit mandi
    """
    uid = str(user_id or "").strip()
    if not uid:
        return {"ok": False, "error": "user_id_required"}

    tasks = _extract_tasks_from_request(request_text)
    if not tasks:
        return {"ok": False, "error": "no_tasks_detected"}
    if len(tasks) > _MAX_EVENTS_PER_REQUEST:
        tasks = tasks[:_MAX_EVENTS_PER_REQUEST]

    route_context = {}
    if include_route_context:
        route_context = _collect_route_context(
            message=request_text,
            state=state,
            district=district,
            crop_name=crop_name,
        )

    created: list[dict[str, Any]] = []
    reused: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []
    for task in tasks:
        metadata = {
            "request_text": _compact_text(request_text, 400),
            "route_context": route_context,
        }
        result = create_calendar_event(
            user_id=uid,
            title=task["title"],
            event_date=task["event_date"],
            event_time=task["event_time"],
            details="Scheduled from chat request",
            metadata=metadata,
            log_action=False,
        )
        if result.get("ok"):
            event = result.get("event") or {}
            if result.get("idempotent"):
                reused.append(event)
            else:
                created.append(event)
        elif result.get("error") == "event_conflict_detected":
            conflicts.append(result.get("conflict") if isinstance(result.get("conflict"), dict) else {"detail": result})

    verified = []
    for event in created[:5]:
        event_id = str(event.get("id") or "")
        if not event_id:
            continue
        verified.append(verify_calendar_event(user_id=uid, event_id=event_id))

    if created:
        _write_action_log(
            user_id=uid,
            action_type="batch_create",
            payload={
                "event_ids": [str(e.get("id") or "") for e in created if str(e.get("id") or "")],
                "request_text": _compact_text(request_text, 360),
            },
        )

    if created:
        _write_notification(
            user_id=uid,
            title="Calendar tasks scheduled",
            body=f"Scheduled {len(created)} task(s). Reused {len(reused)} existing task(s).",
            ntype="calendar",
            data={"action": "batch_create", "created_count": len(created), "reused_count": len(reused)},
        )

    return {
        "ok": True,
        "source": MongoCollections.CALENDAR_EVENTS,
        "created_count": len(created),
        "reused_count": len(reused),
        "conflict_count": len(conflicts),
        "created_events": created,
        "reused_events": reused,
        "conflicts": conflicts,
        "verification": verified,
        "route_context_used": bool(route_context),
    }
