"""Probe all service routes discovered from OpenAPI documents.

This script treats non-2xx responses as valid when they are expected API-level
outcomes (401/403/404/405/409/422), and flags server-side failures (5xx).

Usage:
  python scripts/probe_all_routes.py
"""

from __future__ import annotations

import json
import os
import random
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

SERVICE_BASES = {
    "auth": os.getenv("AUTH_BASE", "http://localhost:8001"),
    "farmer": os.getenv("FARMER_BASE", "http://localhost:8002"),
    "crop": os.getenv("CROP_BASE", "http://localhost:8003"),
    "market": os.getenv("MARKET_BASE", "http://localhost:8004"),
    "equipment": os.getenv("EQUIPMENT_BASE", "http://localhost:8005"),
    "agent": os.getenv("AGENT_BASE", "http://localhost:8006"),
    "voice": os.getenv("VOICE_BASE", "http://localhost:8007"),
    "notification": os.getenv("NOTIFICATION_BASE", "http://localhost:8008"),
    "schemes": os.getenv("SCHEMES_BASE", "http://localhost:8009"),
    "geo": os.getenv("GEO_BASE", "http://localhost:8010"),
    "admin": os.getenv("ADMIN_BASE", "http://localhost:8011"),
    "analytics": os.getenv("ANALYTICS_BASE", "http://localhost:8012"),
}

TEST_PHONE = os.getenv("TEST_PHONE", "+919800000001")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "Farmer@123")

ACCEPTABLE_NON_2XX = {400, 401, 403, 404, 405, 409, 422}


@dataclass
class ProbeResult:
    service: str
    method: str
    path: str
    status: int
    ok: bool
    reason: str


def _http_request(
    method: str,
    url: str,
    payload: dict[str, Any] | None = None,
    token: str | None = None,
    timeout_seconds: int = 45,
) -> tuple[int, dict[str, Any] | list[Any] | str]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method.upper(), headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            if not raw:
                return int(resp.status), {}
            try:
                return int(resp.status), json.loads(raw)
            except Exception:
                return int(resp.status), raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            return int(exc.code), json.loads(raw) if raw else {}
        except Exception:
            return int(exc.code), raw


def _fetch_openapi(base: str) -> dict[str, Any]:
    last_code = 0
    last_error = "unknown"
    for timeout_seconds in [45, 90, 150]:
        try:
            code, payload = _http_request(
                "GET",
                f"{base.rstrip('/')}/openapi.json",
                timeout_seconds=timeout_seconds,
            )
            last_code = code
            if code == 200 and isinstance(payload, dict):
                return payload
            last_error = f"status={code}"
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
    raise RuntimeError(f"openapi fetch failed: {base} -> {last_error} (last_status={last_code})")


def _ensure_token() -> str:
    auth_base = SERVICE_BASES["auth"].rstrip("/")

    code, payload = _http_request(
        "POST",
        f"{auth_base}/api/v1/auth/login",
        {"phone": TEST_PHONE, "password": TEST_PASSWORD},
    )
    if code == 200 and isinstance(payload, dict):
        token = payload.get("access_token") or payload.get("token")
        if token:
            return str(token)

    fallback_phone = f"+9199{random.randint(10000000, 99999999)}"
    _http_request(
        "POST",
        f"{auth_base}/api/v1/auth/register",
        {
            "phone": fallback_phone,
            "password": TEST_PASSWORD,
            "name": "All Routes Probe",
            "role": "farmer",
            "language": "en",
        },
    )
    code, payload = _http_request(
        "POST",
        f"{auth_base}/api/v1/auth/login",
        {"phone": fallback_phone, "password": TEST_PASSWORD},
    )
    if code == 200 and isinstance(payload, dict):
        token = payload.get("access_token") or payload.get("token")
        if token:
            return str(token)
    raise RuntimeError("unable to authenticate test user")


def _replace_path_params(path: str, known: dict[str, str]) -> str:
    out = path
    for name, value in known.items():
        out = out.replace("{" + name + "}", urllib.parse.quote(str(value)))

    unresolved = re.findall(r"\{([^{}]+)\}", out)
    for name in unresolved:
        out = out.replace("{" + name + "}", "sample-id")
    return out


def _build_query_params(params: list[dict[str, Any]] | None) -> dict[str, str]:
    out: dict[str, str] = {}
    if not params:
        return out

    for p in params:
        if str(p.get("in")) != "query":
            continue
        name = str(p.get("name") or "")
        if not name:
            continue

        schema = p.get("schema") or {}
        default = schema.get("default")
        p_type = schema.get("type")
        if default is not None:
            out[name] = str(default)
        elif p_type == "integer":
            out[name] = "1"
        elif p_type == "number":
            out[name] = "1"
        elif p_type == "boolean":
            out[name] = "true"
        else:
            out[name] = "sample"
    return out


def _sample_payload(path: str, method: str) -> dict[str, Any] | None:
    key = f"{method.upper()} {path}"
    known_payloads: dict[str, dict[str, Any]] = {
        "POST /api/v1/agent/chat": {
            "message": "Tomato mandi price in Pune today and decision",
            "language": "en",
            "agent_type": "market",
        },
        "POST /api/v1/agent/chat/prepare": {
            "message": "Will it rain tomorrow and spray timing advice",
            "language": "en",
            "agent_type": "weather",
        },
        "POST /api/v1/agent/chat/finalize": {
            "request_id": "invalid-request-id",
            "timeout_seconds": 0,
        },
        "POST /api/v1/agent/search": {
            "query": "tomato price trend",
            "collection": "mandi_price_intelligence",
            "top_k": 3,
        },
        "POST /api/v1/auth/login": {
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD,
        },
        "POST /api/v1/auth/register": {
            "phone": f"+9198{random.randint(10000000, 99999999)}",
            "password": TEST_PASSWORD,
            "name": "Probe User",
            "role": "farmer",
            "language": "en",
        },
    }
    if key in known_payloads:
        return known_payloads[key]

    if method.upper() in {"POST", "PUT", "PATCH"}:
        return {}
    return None


def _is_auth_required(op: dict[str, Any], api: dict[str, Any]) -> bool:
    if "security" in op:
        return bool(op.get("security"))
    return bool(api.get("security"))


def _probe_service(
    service: str,
    base: str,
    token: str,
    known_params: dict[str, str],
) -> tuple[list[ProbeResult], dict[str, str]]:
    api = _fetch_openapi(base)
    results: list[ProbeResult] = []

    for path, methods in (api.get("paths") or {}).items():
        if not isinstance(methods, dict):
            continue

        for method, op in methods.items():
            method_l = method.lower()
            if method_l not in {"get", "post", "put", "patch", "delete"}:
                continue

            op = op or {}
            substituted = _replace_path_params(path, known_params)
            params = _build_query_params(op.get("parameters"))
            query_suffix = ""
            if params:
                query_suffix = "?" + urllib.parse.urlencode(params)

            url = f"{base.rstrip('/')}{substituted}{query_suffix}"
            body = _sample_payload(path, method_l)
            auth_required = _is_auth_required(op, api)
            call_token = token if auth_required else None

            status, payload = _http_request(method_l.upper(), url, body, call_token)
            is_ok = status < 500 and (status < 400 or status in ACCEPTABLE_NON_2XX)
            reason = "ok"
            if not is_ok:
                reason = "server_error_or_unexpected_status"

            results.append(
                ProbeResult(
                    service=service,
                    method=method_l.upper(),
                    path=path,
                    status=status,
                    ok=is_ok,
                    reason=reason,
                )
            )

            # Save discovered ids for follow-up parameterized routes.
            if isinstance(payload, dict):
                if "session_id" in payload and payload.get("session_id"):
                    known_params.setdefault("session_id", str(payload["session_id"]))
                if "request_id" in payload and payload.get("request_id"):
                    known_params.setdefault("request_id", str(payload["request_id"]))

            # keep requests paced to avoid accidental bursts
            time.sleep(0.05)

    return results, known_params


def main() -> int:
    token = _ensure_token()

    all_results: list[ProbeResult] = []
    known_params = {
        "session_id": "sample-session",
        "request_id": "sample-request",
        "id": "sample-id",
        "farmer_id": "sample-farmer-id",
    }

    for service, base in SERVICE_BASES.items():
        try:
            results, known_params = _probe_service(service, base, token, known_params)
            all_results.extend(results)
        except Exception as exc:  # noqa: BLE001
            all_results.append(
                ProbeResult(
                    service=service,
                    method="OPENAPI",
                    path="/openapi.json",
                    status=0,
                    ok=False,
                    reason=f"openapi_fetch_failed: {exc}",
                )
            )

    failures = [r for r in all_results if not r.ok]
    by_service: dict[str, dict[str, int]] = {}
    for r in all_results:
        bucket = by_service.setdefault(r.service, {"total": 0, "failed": 0})
        bucket["total"] += 1
        if not r.ok:
            bucket["failed"] += 1

    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_probes": len(all_results),
            "failed_probes": len(failures),
        },
        "by_service": by_service,
        "failures": [
            {
                "service": r.service,
                "method": r.method,
                "path": r.path,
                "status": r.status,
                "reason": r.reason,
            }
            for r in failures
        ],
    }

    out_path = os.path.join(os.path.dirname(__file__), "route_probe_report.json")
    with open(out_path, "w", encoding="utf-8") as fp:
        json.dump(report, fp, ensure_ascii=True, indent=2)

    print(json.dumps(report, ensure_ascii=True, indent=2))
    print(f"Report written to {out_path}")
    return 0 if not failures else 2


if __name__ == "__main__":
    raise SystemExit(main())
