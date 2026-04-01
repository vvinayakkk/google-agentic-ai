"""Verify document-builder AppError path no longer crashes market-service.

Usage:
  python scripts/verify_market_document_builder_fix.py
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

API_BASE = os.getenv("API_BASE", "http://localhost:8000").rstrip("/")
TEST_PHONE = os.getenv("TEST_PHONE", "+919800000001")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "Farmer@123")


def _request(method: str, path: str, payload: dict | None = None, token: str | None = None):
    url = f"{API_BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return int(resp.status), body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return int(exc.code), body


def main() -> int:
    status, login_body = _request(
        "POST",
        "/api/v1/auth/login",
        {"phone": TEST_PHONE, "password": TEST_PASSWORD},
    )
    if status != 200:
        print(f"LOGIN_FAILED status={status} body={login_body[:500]}")
        return 1

    token = (json.loads(login_body).get("access_token") or json.loads(login_body).get("token") or "").strip()
    if not token:
        print("LOGIN_TOKEN_MISSING")
        return 2

    status, body = _request(
        "POST",
        "/api/v1/market/document-builder/download-scheme-docs/not-a-real-scheme",
        token=token,
    )

    print(f"DOC_ROUTE_STATUS={status}")
    print(body[:800])

    # Expected: clean 404/4xx AppError response, not 500 crash.
    if status >= 500:
        print("FAIL_SERVER_ERROR")
        return 3

    print("PASS_NO_SERVER_CRASH")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
