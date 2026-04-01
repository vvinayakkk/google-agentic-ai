"""Live gateway E2E tests for weather and soil endpoints.

These tests run against the API gateway (default: http://localhost:8000)
and validate both new aggregated routes and legacy compatibility routes.
"""

from __future__ import annotations

import os
import random
import time
from typing import Any

import requests

BASE = os.getenv("API_BASE", "http://localhost:8000")

AUTH_TOKEN: str | None = None


def _auth_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
    return headers


def _try_login(phone: str, password: str) -> str | None:
    try:
        resp = requests.post(
            f"{BASE}/api/v1/auth/login",
            json={"phone": phone, "password": password},
            timeout=30,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        token = data.get("access_token") or data.get("token")
        return token if isinstance(token, str) and token else None
    except Exception:
        return None


def _try_register(phone: str, password: str) -> bool:
    payload = {
        "phone": phone,
        "password": password,
        "name": "Weather Soil E2E",
        "role": "farmer",
        "language": "en",
    }
    try:
        resp = requests.post(
            f"{BASE}/api/v1/auth/register",
            json=payload,
            timeout=30,
        )
        return resp.status_code in (200, 201, 409)
    except Exception:
        return False


def _ensure_login() -> None:
    global AUTH_TOKEN
    if AUTH_TOKEN:
        return

    candidates = [
        (os.getenv("TEST_PHONE", "+919800000001"), os.getenv("TEST_PASSWORD", "Farmer@123")),
        ("+919876543211", "Test@1234"),
    ]
    for phone, password in candidates:
        token = _try_login(phone, password)
        if token:
            AUTH_TOKEN = token
            return

    # Fall back to creating a dedicated test farmer user.
    phone = f"+9199{random.randint(10000000, 99999999)}"
    password = "Farmer@123"
    if not _try_register(phone, password):
        raise AssertionError("Could not register fallback test user for E2E checks")

    token = _try_login(phone, password)
    if not token:
        raise AssertionError("Could not login with fallback test user for E2E checks")
    AUTH_TOKEN = token


def _ensure_profile() -> None:
    _ensure_login()

    me_url = f"{BASE}/api/v1/farmers/me/profile"
    resp = requests.get(me_url, headers=_auth_headers(), timeout=30)
    if resp.status_code == 200:
        return

    # Create profile used by district-based weather fallback routes.
    create_payload = {
        "village": "Andheri East",
        "district": "Mumbai Suburban",
        "state": "Maharashtra",
        "pin_code": "400069",
        "land_size_acres": 2.5,
        "soil_type": "Loamy",
        "irrigation_type": "Drip",
        "language": "en",
    }
    create = requests.post(
        me_url,
        headers=_auth_headers(),
        json=create_payload,
        timeout=30,
    )
    if create.status_code not in (200, 201):
        raise AssertionError(f"Failed to create profile: {create.status_code} {create.text[:240]}")


def _get(path: str, params: dict[str, Any] | None = None, expect: int = 200) -> dict[str, Any]:
    _ensure_login()
    resp = requests.get(
        f"{BASE}{path}",
        headers=_auth_headers(),
        params=params,
        timeout=70,
    )
    assert resp.status_code == expect, f"GET {path} -> {resp.status_code}: {resp.text[:320]}"
    assert resp.headers.get("content-type", "").startswith("application/json")
    return resp.json()


def setup_module(_module) -> None:
    # One-time setup for all tests in this module.
    _ensure_profile()


def test_weather_full_with_explicit_coordinates() -> None:
    data = _get("/api/v1/market/weather/full", params={"lat": 19.076, "lon": 72.8777})
    assert "current" in data
    assert "hourly" in data
    assert "daily" in data
    assert "farm_decisions" in data
    assert "location" in data


def test_soil_composition_with_explicit_coordinates() -> None:
    data = _get(
        "/api/v1/market/weather/soil-composition",
        params={"lat": 19.076, "lon": 72.8777},
    )
    assert data.get("source") == "soilgrids"
    assert "available" in data
    assert "location" in data


def test_weather_full_profile_fallback() -> None:
    data = _get("/api/v1/market/weather/full")
    assert "location" in data
    assert data["location"].get("source") in {
        "query_params",
        "profile_district_mandi",
        "profile_district_pin_master",
        "profile_district_geocode",
        "profile_state_mandi",
        "profile_state_geocode",
    }


def test_soil_composition_profile_fallback() -> None:
    data = _get("/api/v1/market/weather/soil-composition")
    assert "location" in data
    assert "available" in data


def test_legacy_weather_city_and_coords() -> None:
    city_data = _get("/api/v1/market/weather/city", params={"city": "Mumbai,IN"})
    assert "main" in city_data
    assert "weather" in city_data

    coords_data = _get(
        "/api/v1/market/weather/coords",
        params={"lat": 19.076, "lon": 72.8777},
    )
    assert "main" in coords_data
    assert "weather" in coords_data


def test_legacy_forecast_city_and_coords() -> None:
    city_data = _get("/api/v1/market/weather/forecast/city", params={"city": "Mumbai,IN"})
    assert "list" in city_data

    coords_data = _get(
        "/api/v1/market/weather/forecast/coords",
        params={"lat": 19.076, "lon": 72.8777},
    )
    assert "list" in coords_data


def test_soil_moisture_endpoint() -> None:
    # Keep this state-level to avoid false negatives from district data sparsity.
    data = _get(
        "/api/v1/market/soil-moisture",
        params={"state": "Maharashtra", "limit": 1},
    )
    assert "total_records" in data
    assert "latest_records" in data


def test_weather_routes_stability_under_repeated_calls() -> None:
    # Quick repeated calls to ensure no transient 5xx after restart.
    for _ in range(3):
        data = _get("/api/v1/market/weather/full", params={"lat": 19.076, "lon": 72.8777})
        assert "current" in data
        time.sleep(0.2)
