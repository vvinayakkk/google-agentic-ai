"""Manual functional probe for agent chat across major intents.

Usage:
  c:/Users/vinay/OneDrive/Desktop/google/google-agentic-ai/.venv/Scripts/python.exe scripts/manual_chat_functional_probe.py

Optional env vars:
  API_BASE=http://localhost:8000
  TEST_PHONE=+919800000001
  TEST_PASSWORD=Farmer@123
"""

from __future__ import annotations

import json
import os
import random
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

API_BASE = os.getenv("API_BASE", "http://localhost:8000").rstrip("/")
DEFAULT_TEST_PHONE = os.getenv("TEST_PHONE", "+919800000001")
DEFAULT_TEST_PASSWORD = os.getenv("TEST_PASSWORD", "Farmer@123")
REQUEST_TIMEOUT_SECONDS = max(
    15.0, float(os.getenv("CHAT_PROBE_TIMEOUT_SECONDS", "90"))
)


def _request(method: str, path: str, payload: dict[str, Any] | None = None, token: str | None = None) -> tuple[int, dict[str, Any]]:
    url = f"{API_BASE}{path}"
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url, data=data, method=method.upper(), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            parsed = json.loads(body) if body else {}
            return int(resp.status), parsed if isinstance(parsed, dict) else {"raw": parsed}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body) if body else {}
            if not isinstance(parsed, dict):
                parsed = {"raw": parsed}
        except Exception:
            parsed = {"raw": body}
        return int(exc.code), parsed
    except TimeoutError:
        return 598, {
            "error": "request_timeout",
            "message": f"Request timed out after {REQUEST_TIMEOUT_SECONDS:.0f}s",
        }
    except urllib.error.URLError as exc:
        return 599, {
            "error": "network_error",
            "message": str(exc),
        }


def _try_login(phone: str, password: str) -> str | None:
    code, data = _request("POST", "/api/v1/auth/login", {"phone": phone, "password": password})
    if code != 200:
        return None
    token = data.get("access_token") or data.get("token")
    return str(token) if token else None


def _try_register(phone: str, password: str) -> bool:
    payload = {
        "phone": phone,
        "password": password,
        "name": "Chat Functional Probe",
        "role": "farmer",
        "language": "en",
    }
    code, _ = _request("POST", "/api/v1/auth/register", payload)
    return code in {200, 201, 409}


def _ensure_token() -> tuple[str, str, str]:
    candidates = [
        (DEFAULT_TEST_PHONE, DEFAULT_TEST_PASSWORD),
        ("+919876543211", "Test@1234"),
    ]

    for phone, password in candidates:
        token = _try_login(phone, password)
        if token:
            return token, phone, password

    phone = f"+9199{random.randint(10000000, 99999999)}"
    password = "Farmer@123"
    if not _try_register(phone, password):
        raise RuntimeError("Could not register fallback user")

    token = _try_login(phone, password)
    if not token:
        raise RuntimeError("Could not login fallback user")
    return token, phone, password


def _ensure_profile(token: str) -> None:
    code, profile = _request("GET", "/api/v1/farmers/me/profile", token=token)
    desired = {
        "village": "Shirur",
        "district": "Pune",
        "state": "Maharashtra",
        "pin_code": "412210",
        "land_size_acres": 3.2,
        "soil_type": "Loamy",
        "irrigation_type": "Drip",
        "language": "en",
    }

    if code == 200:
        # Ensure strict location context for this probe.
        _request("PUT", "/api/v1/farmers/me/profile", payload=desired, token=token)
        return

    create_code, create_data = _request("POST", "/api/v1/farmers/me/profile", payload=desired, token=token)
    if create_code not in {200, 201}:
        raise RuntimeError(f"Failed to create profile: {create_code} {create_data}")


def _is_bad_market_drift(text: str) -> bool:
    t = text.lower()
    return "west bengal" in t and "maharashtra" not in t


def _has_refusal_style(text: str) -> bool:
    t = text.lower()
    markers = [
        "i could not",
        "i can't",
        "i cannot",
        "unable to",
        "not found",
        "not available",
        "no data",
        "cannot fetch",
    ]
    return any(m in t for m in markers)


def _probe_queries() -> list[dict[str, str]]:
    return [
        {
            "id": "market_price_local",
            "agent_type": "market",
            "language": "en",
            "message": "What is today's tomato mandi price in Pune, Maharashtra? Give nearest mandi and action.",
        },
        {
            "id": "market_sell_timing",
            "agent_type": "market",
            "language": "en",
            "message": "Should I sell tomato today or wait 3 days in Pune district?",
        },
        {
            "id": "weather_spray",
            "agent_type": "weather",
            "language": "en",
            "message": "Will it rain tomorrow in my area and is evening spray safe?",
        },
        {
            "id": "scheme_pm_kisan",
            "agent_type": "scheme",
            "language": "en",
            "message": "PM-KISAN eligibility, required documents, and exact apply process for a Maharashtra farmer.",
        },
        {
            "id": "equipment_rental",
            "agent_type": "market",
            "language": "en",
            "message": "Need tractor rental options near Pune with practical booking steps.",
        },
        {
            "id": "crop_advisory",
            "agent_type": "crop",
            "language": "en",
            "message": "Give soybean sowing advisory for this week in Maharashtra with risk tips.",
        },
        {
            "id": "cattle_health",
            "agent_type": "cattle",
            "language": "en",
            "message": "Cow mastitis early signs and immediate low-cost steps for farmers.",
        },
        {
            "id": "memory_followup",
            "agent_type": "market",
            "language": "en",
            "message": "Based on your previous tomato advice, give me a 3-step plan for the next 48 hours.",
        },
        {
            "id": "hinglish_weather",
            "agent_type": "weather",
            "language": "hinglish",
            "message": "Kal baarish chance kitna hai aur spraying kab karu?",
        },
    ]


def run_probe() -> int:
    token, phone, _ = _ensure_token()
    _ensure_profile(token)

    print(f"Using user: {phone}")
    print(f"API base: {API_BASE}")

    session_id = ""
    issues: list[str] = []

    for q in _probe_queries():
        payload = {
            "message": q["message"],
            "language": q["language"],
            "agent_type": q["agent_type"],
            "allow_fallback": True,
        }
        if session_id:
            payload["session_id"] = session_id

        start = time.time()
        code, data = _request("POST", "/api/v1/agent/chat", payload=payload, token=token)
        elapsed_ms = int((time.time() - start) * 1000)

        response = str(data.get("response") or "").strip()
        session_id = str(data.get("session_id") or session_id)
        agent_used = str(data.get("agent_used") or "")

        print("\n" + "=" * 88)
        print(f"[{q['id']}] status={code} agent={agent_used} latency={elapsed_ms}ms")
        print(f"Q: {q['message']}")
        print("A:", response[:900].replace("\n", " "))

        if code != 200:
            issues.append(f"{q['id']}: non-200 status {code}")
            continue
        if not response:
            issues.append(f"{q['id']}: empty response")
            continue
        if _has_refusal_style(response):
            issues.append(f"{q['id']}: refusal-style text present")
        if q["id"].startswith("market") and _is_bad_market_drift(response):
            issues.append(f"{q['id']}: cross-state drift (mentions West Bengal)")

    print("\n" + "-" * 88)
    if issues:
        print("Issues found:")
        for item in issues:
            print(" -", item)
        return 2

    print("No probe issues detected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(run_probe())
