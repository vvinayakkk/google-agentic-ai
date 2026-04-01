"""Verify personalized locality behavior across core services and chat.

Checks:
1) Market prices default to profile location when filters are omitted.
2) Mandi listing defaults to profile location when filters are omitted.
3) Equipment browse and rental-rates are locality-preferred.
4) Weather full route resolves profile state/district.
5) Soil moisture route returns records for profile region.
6) Chat responses are location-grounded.
7) Staged chat prepare/finalize returns both parts.

Usage:
  python scripts/verify_personalization_and_service_locality.py
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Any

API_BASE = os.getenv("API_BASE", "http://localhost:8000").rstrip("/")
TEST_PHONE = os.getenv("TEST_PHONE", "+919800000001")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "Farmer@123")

TARGET_STATE = "Maharashtra"
TARGET_DISTRICT = "Pune"
TARGET_VILLAGE = "Shirur"
TARGET_PIN = "412210"


def _request(
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    token: str | None = None,
    timeout_seconds: int = 120,
) -> tuple[int, str]:
    url = f"{API_BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method.upper(), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return int(resp.status), body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return int(exc.code), body


def _json_dict(raw: str) -> dict[str, Any]:
    try:
        obj = json.loads(raw) if raw else {}
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass
    return {}


def _login() -> tuple[str, list[str]]:
    issues: list[str] = []
    code, body = _request(
        "POST",
        "/api/v1/auth/login",
        {"phone": TEST_PHONE, "password": TEST_PASSWORD},
    )
    if code != 200:
        issues.append(f"auth.login failed status={code}")
        return "", issues

    token = (_json_dict(body).get("access_token") or _json_dict(body).get("token") or "").strip()
    if not token:
        issues.append("auth.login token missing")
    return token, issues


def _ensure_profile(token: str) -> list[str]:
    issues: list[str] = []
    desired = {
        "village": TARGET_VILLAGE,
        "district": TARGET_DISTRICT,
        "state": TARGET_STATE,
        "pin_code": TARGET_PIN,
        "land_size_acres": 3.2,
        "soil_type": "Loamy",
        "irrigation_type": "Drip",
        "language": "en",
    }

    code, _ = _request("GET", "/api/v1/farmers/me/profile", token=token)
    if code == 200:
        upd_code, upd_body = _request("PUT", "/api/v1/farmers/me/profile", desired, token=token)
        if upd_code != 200:
            issues.append(f"profile.update failed status={upd_code} body={upd_body[:260]}")
        return issues

    create_code, create_body = _request("POST", "/api/v1/farmers/me/profile", desired, token=token)
    if create_code not in {200, 201}:
        issues.append(f"profile.create failed status={create_code} body={create_body[:260]}")
    return issues


def _lower(v: Any) -> str:
    return str(v or "").strip().lower()


def _contains_local_hint(text: str) -> bool:
    t = _lower(text)
    return "pune" in t or "maharashtra" in t


def _check_market_prices(token: str, issues: list[str]) -> None:
    code, body = _request("GET", "/api/v1/market/prices/?page=1&per_page=20", token=token)
    if code != 200:
        issues.append(f"market.prices status={code}")
        return

    data = _json_dict(body)
    items = data.get("items") if isinstance(data.get("items"), list) else []
    if not items:
        issues.append("market.prices returned no items")
        return

    first = items[0] if isinstance(items[0], dict) else {}
    first_state = _lower(first.get("state"))
    first_district = _lower(first.get("district"))
    if first_state and first_state != TARGET_STATE.lower():
        issues.append(f"market.prices not localized first_state={first_state}")
    if first_district and TARGET_DISTRICT.lower() not in first_district:
        issues.append(f"market.prices not nearest-first first_district={first_district}")


def _check_mandis(token: str, issues: list[str]) -> None:
    code, body = _request("GET", "/api/v1/market/mandis/?page=1&per_page=20", token=token)
    if code != 200:
        issues.append(f"market.mandis status={code}")
        return

    data = _json_dict(body)
    items = data.get("items") if isinstance(data.get("items"), list) else []
    if not items:
        issues.append("market.mandis returned no items")
        return

    first = items[0] if isinstance(items[0], dict) else {}
    first_state = _lower(first.get("state"))
    first_district = _lower(first.get("district"))
    if first_state and first_state != TARGET_STATE.lower():
        issues.append(f"market.mandis not localized first_state={first_state}")
    if first_district and TARGET_DISTRICT.lower() not in first_district:
        issues.append(f"market.mandis not nearest-first first_district={first_district}")


def _check_equipment(token: str, issues: list[str]) -> None:
    code, body = _request("GET", "/api/v1/equipment/?browse=true", token=token)
    if code != 200:
        issues.append(f"equipment.browse status={code}")
    else:
        data = _json_dict(body)
        items = data.get("items") if isinstance(data.get("items"), list) else []
        if not items:
            issues.append("equipment.browse returned no items")
        else:
            first = items[0] if isinstance(items[0], dict) else {}
            st = _lower(first.get("state"))
            if st and st != TARGET_STATE.lower():
                issues.append(f"equipment.browse first listing not localized state={st}")

    code, body = _request("GET", "/api/v1/equipment/rental-rates/?limit=20", token=token)
    if code != 200:
        issues.append(f"equipment.rental-rates status={code}")
        return

    data = _json_dict(body)
    rows = data.get("rows") if isinstance(data.get("rows"), list) else []
    if not rows:
        issues.append("equipment.rental-rates returned no rows")
        return

    first = rows[0] if isinstance(rows[0], dict) else {}
    loc = first.get("location") if isinstance(first.get("location"), dict) else {}
    st = _lower(loc.get("state"))
    dist = _lower(loc.get("district") or loc.get("city"))
    if st and st != TARGET_STATE.lower():
        issues.append(f"equipment.rental-rates first row not localized state={st}")
    if dist and TARGET_DISTRICT.lower() not in dist:
        issues.append(f"equipment.rental-rates first row not nearest-first district={dist}")


def _check_weather_soil(token: str, issues: list[str]) -> None:
    code, body = _request("GET", "/api/v1/market/weather/full", token=token)
    if code != 200:
        issues.append(f"market.weather.full status={code}")
    else:
        data = _json_dict(body)
        loc = data.get("location") if isinstance(data.get("location"), dict) else {}
        st = _lower(loc.get("state"))
        dist = _lower(loc.get("district"))
        if st and st != TARGET_STATE.lower():
            issues.append(f"weather.full resolved non-local state={st}")
        if dist and TARGET_DISTRICT.lower() not in dist:
            issues.append(f"weather.full resolved non-local district={dist}")

    code, body = _request(
        "GET",
        f"/api/v1/market/soil-moisture?state={TARGET_STATE}&district={TARGET_DISTRICT}&limit=5",
        token=token,
    )
    if code != 200:
        issues.append(f"market.soil-moisture status={code}")
    else:
        data = _json_dict(body)
        latest = data.get("latest_records") if isinstance(data.get("latest_records"), list) else []
        if not latest:
            issues.append("market.soil-moisture returned no latest_records")


def _check_chat_locality(token: str, issues: list[str]) -> None:
    checks = [
        (
            "market_local",
            "What is today's tomato mandi price in Pune, Maharashtra? Give nearest mandi and action.",
            "market",
        ),
        (
            "equipment_local",
            "Need tractor rental options near Pune with practical booking steps.",
            "market",
        ),
        (
            "weather_hinglish",
            "Kal baarish chance kitna hai aur spraying kab karu?",
            "weather",
        ),
    ]

    session_id = ""
    for check_id, message, agent_type in checks:
        payload: dict[str, Any] = {
            "message": message,
            "language": "hinglish" if "hinglish" in check_id else "en",
            "agent_type": agent_type,
            "allow_fallback": True,
        }
        if session_id:
            payload["session_id"] = session_id

        code, body = _request("POST", "/api/v1/agent/chat", payload, token=token)
        if code != 200:
            issues.append(f"chat.{check_id} status={code}")
            continue

        data = _json_dict(body)
        session_id = str(data.get("session_id") or session_id)
        response = str(data.get("response") or "")
        if not response.strip():
            issues.append(f"chat.{check_id} empty response")
            continue
        if not _contains_local_hint(response):
            issues.append(f"chat.{check_id} missing local hint (Pune/Maharashtra)")


def _check_two_part_chat(token: str, issues: list[str]) -> None:
    prepare_payload = {
        "message": "Need tractor rental options near Pune district with clear booking steps.",
        "language": "en",
        "agent_type": "market",
    }
    code, body = _request("POST", "/api/v1/agent/chat/prepare", prepare_payload, token=token)
    if code != 200:
        issues.append(f"chat.prepare status={code}")
        return

    data = _json_dict(body)
    request_id = str(data.get("request_id") or "")
    partial = str(data.get("partial_response") or "").strip()
    if not request_id:
        issues.append("chat.prepare missing request_id")
        return
    if not partial:
        issues.append("chat.prepare empty partial_response")

    final_payload: dict[str, Any] = {}
    for _ in range(90):
        code_f, body_f = _request(
            "POST",
            "/api/v1/agent/chat/finalize",
            {"request_id": request_id, "timeout_seconds": 3},
            token=token,
        )
        if code_f != 200:
            issues.append(f"chat.finalize status={code_f}")
            return
        parsed = _json_dict(body_f)
        status = str(parsed.get("status") or "")
        if status == "completed":
            final_payload = parsed
            break
        if status == "failed":
            issues.append(f"chat.finalize failed error={parsed.get('error')}")
            return
        time.sleep(0.4)

    if not final_payload:
        issues.append("chat.finalize did not complete in polling window")
        return

    merged = str(final_payload.get("merged_response") or "").strip()
    live = str((final_payload.get("result") or {}).get("response") or "").strip()
    if not merged:
        issues.append("chat.finalize empty merged_response")
    if not live:
        issues.append("chat.finalize empty live response")


def main() -> int:
    issues: list[str] = []

    token, login_issues = _login()
    issues.extend(login_issues)
    if not token:
        for item in issues:
            print(f"ISSUE: {item}")
        print("FAIL")
        return 1

    issues.extend(_ensure_profile(token))

    _check_market_prices(token, issues)
    _check_mandis(token, issues)
    _check_equipment(token, issues)
    _check_weather_soil(token, issues)
    _check_chat_locality(token, issues)
    _check_two_part_chat(token, issues)

    if issues:
        for item in issues:
            print(f"ISSUE: {item}")
        print("FAIL")
        return 2

    print("PASS_ALL_LOCALITY_AND_CHAT_CHECKS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
