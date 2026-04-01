"""Manual probe for agent routes with staged chat and quality checks.

Usage:
  c:/Users/vinay/OneDrive/Desktop/google/google-agentic-ai/.venv/Scripts/python.exe scripts/manual_agent_routes_probe.py

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
import urllib.request
from typing import Any

API_BASE = os.getenv("API_BASE", "http://localhost:8000").rstrip("/")
DEFAULT_TEST_PHONE = os.getenv("TEST_PHONE", "+919800000001")
DEFAULT_TEST_PASSWORD = os.getenv("TEST_PASSWORD", "Farmer@123")


def _request(method: str, path: str, payload: dict[str, Any] | None = None, token: str | None = None) -> tuple[int, dict[str, Any]]:
    url = f"{API_BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method.upper(), headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            parsed = json.loads(body) if body else {}
            if not isinstance(parsed, dict):
                parsed = {"raw": parsed}
            return int(resp.status), parsed
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body) if body else {}
            if not isinstance(parsed, dict):
                parsed = {"raw": parsed}
        except Exception:
            parsed = {"raw": body}
        return int(exc.code), parsed


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
        "name": "Agent Route Probe",
        "role": "farmer",
        "language": "en",
    }
    code, _ = _request("POST", "/api/v1/auth/register", payload)
    return code in {200, 201, 409}


def _ensure_token() -> tuple[str, str]:
    for phone, password in [
        (DEFAULT_TEST_PHONE, DEFAULT_TEST_PASSWORD),
        ("+919876543211", "Test@1234"),
    ]:
        token = _try_login(phone, password)
        if token:
            return token, phone

    phone = f"+9199{random.randint(10000000, 99999999)}"
    password = "Farmer@123"
    if not _try_register(phone, password):
        raise RuntimeError("Could not register fallback user")

    token = _try_login(phone, password)
    if not token:
        raise RuntimeError("Could not login fallback user")
    return token, phone


def _has_low_quality(text: str) -> bool:
    t = (text or "").lower()
    markers = [
        "i cannot",
        "i can't",
        "unable to",
        "not found",
        "no data",
        "not available",
    ]
    return any(m in t for m in markers)


def _probe_staged_chat(token: str) -> tuple[list[str], str]:
    issues: list[str] = []
    last_session_id = ""

    queries = [
        {"id": "market", "message": "Tomato mandi price in Pune today with action", "agent_type": "market"},
        {"id": "weather", "message": "Will it rain tomorrow and is evening spray safe", "agent_type": "weather"},
        {"id": "scheme", "message": "PM-KISAN eligibility and documents for Maharashtra farmer", "agent_type": "scheme"},
        {"id": "equipment", "message": "Need tractor rental options in Pune district", "agent_type": "market"},
        {"id": "crop", "message": "Soybean sowing advisory for this week", "agent_type": "crop"},
        {"id": "livestock", "message": "Cow mastitis early signs and immediate steps", "agent_type": "cattle"},
    ]

    for item in queries:
        code, prepare = _request(
            "POST",
            "/api/v1/agent/chat/prepare",
            {
                "message": item["message"],
                "language": "en",
                "agent_type": item["agent_type"],
            },
            token,
        )
        if code != 200:
            issues.append(f"{item['id']}: prepare status {code}")
            continue

        request_id = str(prepare.get("request_id") or "")
        partial = str(prepare.get("partial_response") or "").strip()
        if not request_id:
            issues.append(f"{item['id']}: missing request_id")
            continue
        if not partial:
            issues.append(f"{item['id']}: empty partial_response")
        if not isinstance(prepare.get("source_provenance"), list):
            issues.append(f"{item['id']}: missing source_provenance block")

        final_payload: dict[str, Any] = {}
        for _ in range(80):
            code_f, fin = _request(
                "POST",
                "/api/v1/agent/chat/finalize",
                {"request_id": request_id, "timeout_seconds": 3},
                token,
            )
            if code_f != 200:
                issues.append(f"{item['id']}: finalize status {code_f}")
                break
            status = str(fin.get("status") or "")
            if status == "completed":
                final_payload = fin
                break
            if status == "failed":
                issues.append(f"{item['id']}: finalize failed {fin.get('error')}")
                break
            time.sleep(0.5)

        if not final_payload:
            issues.append(f"{item['id']}: finalize did not complete in polling window")
            continue

        merged = str(final_payload.get("merged_response") or "").strip()
        live = str((final_payload.get("result") or {}).get("response") or "").strip()
        prov = final_payload.get("source_provenance")
        if not merged:
            issues.append(f"{item['id']}: empty merged_response")
        if not live:
            issues.append(f"{item['id']}: empty live response")
        if not isinstance(prov, list) or not prov:
            issues.append(f"{item['id']}: empty source_provenance after finalize")
        if _has_low_quality(live):
            issues.append(f"{item['id']}: low-quality/refusal-style response")

        session_id = str(final_payload.get("session_id") or "")
        if session_id:
            last_session_id = session_id

    return issues, last_session_id


def _probe_agent_routes(token: str, session_id: str) -> list[str]:
    issues: list[str] = []

    code, sessions = _request("GET", "/api/v1/agent/sessions", token=token)
    if code != 200 or not isinstance(sessions.get("sessions"), list):
        issues.append(f"sessions list failed: {code}")

    if session_id:
        code, detail = _request("GET", f"/api/v1/agent/sessions/{session_id}", token=token)
        if code != 200 or not isinstance(detail.get("messages"), list):
            issues.append(f"session detail failed: {code}")

    code, search = _request(
        "POST",
        "/api/v1/agent/search",
        {
            "query": "tomato price trend",
            "collection": "mandi_price_intelligence",
            "top_k": 5,
        },
        token,
    )
    if code != 200 or not isinstance(search.get("results"), list):
        issues.append(f"agent search failed: {code}")

    code, convs = _request("GET", "/api/v1/agent/conversations/", token=token)
    if code != 200 or "conversations" not in convs:
        issues.append(f"conversations list failed: {code}")

    return issues


def run_probe() -> int:
    token, phone = _ensure_token()
    print(f"Using user: {phone}")
    print(f"API base: {API_BASE}")

    staged_issues, session_id = _probe_staged_chat(token)
    route_issues = _probe_agent_routes(token, session_id)
    issues = staged_issues + route_issues

    print("\n" + "-" * 88)
    if issues:
        print("Issues found:")
        for issue in issues:
            print(" -", issue)
        return 2

    print("No issues detected in staged chat and agent route probes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(run_probe())
