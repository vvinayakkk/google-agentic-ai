"""End-to-end verification for chat-driven calendar features.

Covers:
1) Multi-task create from chat + DB verification
2) Idempotent repeat (no duplicates)
3) Conflict detection (same slot)
4) NL update by reference
5) NL delete by reference
6) Undo last action
7) Date-range guardrail
8) Calendar notifications written
9) Calendar verification block in response
10) Multi-topic checklist suffix behavior
"""

from __future__ import annotations

import json
import re
import sys
import os
import urllib.error
import urllib.request
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "agent"))

from shared.core.constants import MongoCollections
from shared.db.mongodb import get_db

try:
    from services.agent.tools.calendar_tools import apply_calendar_action_from_request
except ModuleNotFoundError:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "agent"))
    from tools.calendar_tools import apply_calendar_action_from_request

API_BASE = "http://localhost:8000"
PHONE = "+919800000001"
PASSWORD = "Farmer@123"
USER_ID = "seed_farmer_01"
TITLE_ONE = "E2E Calendar Task One"
TITLE_TWO = "E2E Calendar Task Two"


def _request(method: str, path: str, payload: dict | None = None, token: str | None = None) -> tuple[int, str]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(f"{API_BASE}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=240) as resp:
            return int(resp.status), resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return int(exc.code), exc.read().decode("utf-8", errors="replace")


def _norm(text: str) -> str:
    txt = (text or "").lower()
    txt = re.sub(r"[^a-z0-9\s]", " ", txt)
    return " ".join(txt.split())


def _login() -> str:
    code, body = _request("POST", "/api/v1/auth/login", {"phone": PHONE, "password": PASSWORD})
    if code != 200:
        raise RuntimeError(f"login_failed status={code} body={body[:400]}")
    payload = json.loads(body) if body else {}
    token = str(payload.get("access_token") or payload.get("token") or "").strip()
    if not token:
        raise RuntimeError("login_token_missing")
    return token


def _chat(token: str, message: str) -> dict:
    code, body = _request(
        "POST",
        "/api/v1/agent/chat",
        {"message": message, "language": "en", "allow_fallback": True},
        token=token,
    )
    if code != 200:
        raise RuntimeError(f"chat_failed status={code} body={body[:600]}")
    return json.loads(body) if body else {}


def _calendar_rows() -> list[dict]:
    docs = list(
        get_db()
        .collection(MongoCollections.CALENDAR_EVENTS)
        .where("user_id", "==", USER_ID)
        .limit(400)
        .stream()
    )
    rows: list[dict] = []
    for doc in docs:
        item = doc.to_dict() or {}
        rows.append(
            {
                "id": str(item.get("id") or doc.id),
                "title": str(item.get("title") or "").strip(),
                "event_date": str(item.get("event_date") or "").strip(),
                "event_time": str(item.get("event_time") or "").strip(),
                "status": str(item.get("status") or "").strip(),
                "created_at": str(item.get("created_at") or ""),
            }
        )
    return rows


def _notifications_count() -> int:
    docs = list(
        get_db()
        .collection(MongoCollections.NOTIFICATIONS)
        .where("user_id", "==", USER_ID)
        .limit(500)
        .stream()
    )
    return len(docs)


def _cleanup_e2e_events() -> None:
    for row in _calendar_rows():
        if _norm(row["title"]).startswith("e2e calendar task"):
            get_db().collection(MongoCollections.CALENDAR_EVENTS).document(row["id"]).delete()


def _count_named(rows: list[dict]) -> Counter:
    wanted = {
        (_norm(TITLE_ONE), "2026-04-12", "06:30"),
        (_norm(TITLE_TWO), "2026-04-12", "17:00"),
    }
    counter: Counter = Counter()
    for row in rows:
        key = (_norm(row["title"]), row["event_date"], row["event_time"])
        if key in wanted:
            counter[key] += 1
    return counter


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def _has_topic_coverage(text: str) -> bool:
    t = (text or "").lower()
    checks = [
        any(k in t for k in ["price", "rate", "daam", "bhav"]),
        any(k in t for k in ["mandi", "market", "apmc"]),
        any(k in t for k in ["scheme", "subsidy", "pm-kisan", "kcc", "pmfby"]),
        any(k in t for k in ["equipment", "tractor", "rental", "sprayer", "harvester"]),
        any(k in t for k in ["weather", "rain", "forecast", "temperature"]),
        any(k in t for k in ["soil", "moisture", "ph", "nitrogen"]),
    ]
    return sum(1 for x in checks if x) >= 5


def main() -> int:
    token = _login()
    _chat(token, "set chat mode detailed")
    _cleanup_e2e_events()
    notif_before = _notifications_count()

    create_prompt = (
        "Please schedule and verify these events in my calendar: "
        "2026-04-12 06:30 - E2E Calendar Task One; "
        "2026-04-12 17:00 - E2E Calendar Task Two. "
        "Also provide weather risk, tomato price, nearby mandi, schemes and soil status."
    )
    create_resp = _chat(token, create_prompt)
    create_text = str(create_resp.get("response") or "")
    _assert(isinstance(create_resp.get("suggestions"), list) and len(create_resp.get("suggestions") or []) > 0, "missing follow-up suggestions")
    _assert("Action Plan" in create_text, "missing action plan block")
    _assert("Why this recommendation" in create_text, "missing rationale block")
    _assert("Confidence:" in create_text, "missing confidence block")
    _assert("Source snippets:" in create_text, "missing source snippet block")
    _assert("Follow-up check:" in create_text, "missing outcome follow-up block")
    _assert("Calendar verification" in create_text or "कैलेंडर सत्यापन" in create_text, "missing calendar verification block")
    _assert(
        ("Coverage checklist" in create_text or "कवरेज चेकलिस्ट" in create_text) or _has_topic_coverage(create_text),
        "missing checklist or equivalent topic coverage",
    )

    mode_resp = _chat(token, "set chat mode brief")
    _assert("Preference saved" in str(mode_resp.get("response") or ""), "mode preference command failed")

    mixed_prompt = (
        "Need weather, market prices, scheme eligibility, equipment rental, soil status and calendar reminders together."
    )
    mixed_resp = _chat(token, mixed_prompt)
    mixed_text = str(mixed_resp.get("response") or "")
    _assert("Clarification for next turn:" in mixed_text, "mixed-intent clarification missing")

    rows_after_first = _calendar_rows()
    counts_first = _count_named(rows_after_first)
    _assert(all(v == 1 for v in counts_first.values()) and len(counts_first) == 2, "first create failed to persist expected events")

    _chat(token, create_prompt)
    rows_after_second = _calendar_rows()
    counts_second = _count_named(rows_after_second)
    _assert(all(v == 1 for v in counts_second.values()) and len(counts_second) == 2, "idempotency failed; duplicate events detected")

    conflict_prompt = "Schedule 2026-04-12 06:45 - E2E Calendar Conflict Task for same morning slot and verify."
    _chat(token, conflict_prompt)
    conflict_rows = [r for r in _calendar_rows() if _norm(r["title"]).startswith("e2e calendar conflict task")]
    _assert(len(conflict_rows) == 0, "conflict guard failed; conflicting task was created")

    conflict_tool = apply_calendar_action_from_request(
        user_id=USER_ID,
        request_text="Schedule 2026-04-12 06:40 - E2E Alternate Slot Probe",
    )
    if isinstance(conflict_tool, dict) and conflict_tool.get("ok") is False and conflict_tool.get("error") == "event_conflict_detected":
        _assert(len(conflict_tool.get("alternate_slots") or []) >= 1, "alternate slot suggestions missing")

    update_prompt = "Reschedule E2E Calendar Task One to 2026-04-12 07:10 and verify."
    _chat(token, update_prompt)
    updated = [r for r in _calendar_rows() if _norm(r["title"]) == _norm(TITLE_ONE)]
    _assert(updated and updated[0]["event_time"] == "07:10", "nl update failed")

    delete_prompt = "Delete E2E Calendar Task Two from my calendar and verify."
    _chat(token, delete_prompt)
    deleted = [r for r in _calendar_rows() if _norm(r["title"]) == _norm(TITLE_TWO)]
    _assert(len(deleted) == 0, "nl delete failed")

    undo_prompt = "Undo my last calendar action and verify from DB."
    _chat(token, undo_prompt)
    restored = [r for r in _calendar_rows() if _norm(r["title"]) == _norm(TITLE_TWO)]
    _assert(len(restored) == 1, "undo failed to restore deleted event")

    range_prompt = "Schedule 2035-01-01 09:00 - E2E Calendar Task Far Future and verify."
    _chat(token, range_prompt)
    far_future = [r for r in _calendar_rows() if _norm(r["title"]).startswith("e2e calendar task far future")]
    _assert(len(far_future) == 0, "date range guard failed; far future event created")

    notif_after = _notifications_count()
    _assert(notif_after > notif_before, "calendar notifications were not written")

    print("PASS: all calendar chat e2e checks succeeded")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL: {exc}")
        raise SystemExit(1)
