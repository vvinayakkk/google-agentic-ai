"""Unit tests for market weather intelligence service edge cases."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Any

from shared.core.constants import MongoCollections
from services.market.services import weather_service as ws


class FakeDoc:
    def __init__(self, data: dict[str, Any]):
        self._data = data

    def to_dict(self) -> dict[str, Any]:
        return dict(self._data)


class FakeQuery:
    def __init__(self, rows: list[dict[str, Any]]):
        self._rows = rows
        self._filters: list[tuple[str, Any]] = []
        self._limit: int | None = None

    def where(self, field: str, op: str, value: Any) -> "FakeQuery":
        assert op == "=="
        self._filters.append((field, value))
        return self

    def limit(self, limit_count: int) -> "FakeQuery":
        self._limit = limit_count
        return self

    async def stream(self):
        rows = self._rows
        for field, value in self._filters:
            rows = [row for row in rows if row.get(field) == value]
        if self._limit is not None:
            rows = rows[: self._limit]
        for row in rows:
            yield FakeDoc(row)


class FakeCollection:
    def __init__(self, rows: list[dict[str, Any]]):
        self._rows = rows

    def where(self, field: str, op: str, value: Any) -> FakeQuery:
        return FakeQuery(self._rows).where(field, op, value)


class FakeDB:
    def __init__(self, by_collection: dict[str, list[dict[str, Any]]]):
        self._by_collection = by_collection

    def collection(self, name: str) -> FakeCollection:
        return FakeCollection(self._by_collection.get(name, []))


def _build_hourly(now: datetime, *, wind: float, precip_prob: float, temp: float, humidity: float, top_moisture: float, root_moisture: float, soil_temp6: float) -> dict[str, Any]:
    times = [(now + timedelta(hours=i)).isoformat() for i in range(72)]
    return {
        "time": times,
        "precipitation_probability": [precip_prob] * 72,
        "precipitation": [0.0] * 72,
        "wind_speed_10m": [wind] * 72,
        "temperature_2m": [temp] * 72,
        "relative_humidity_2m": [humidity] * 72,
        "soil_moisture_0_1cm": [top_moisture] * 72,
        "soil_moisture_3_9cm": [root_moisture] * 72,
        "soil_temperature_6cm": [soil_temp6] * 72,
    }


def _build_daily(now: datetime, *, et0_today: float, precip_today: float, tmax_today: float, min_week_temp: float) -> dict[str, Any]:
    dates = [(now.date() + timedelta(days=i)).isoformat() for i in range(16)]
    precip = [precip_today] + [0.0] * 15
    tmin = [min_week_temp] + [10.0] * 15
    return {
        "time": dates,
        "et0_fao_evapotranspiration": [et0_today] + [3.0] * 15,
        "precipitation_sum": precip,
        "temperature_2m_max": [tmax_today] + [30.0] * 15,
        "temperature_2m_min": tmin,
    }


def test_build_farm_decisions_favorable_conditions() -> None:
    now = datetime.now(ws.IST).replace(minute=0, second=0, microsecond=0)
    hourly = _build_hourly(
        now,
        wind=2.0,
        precip_prob=10.0,
        temp=28.0,
        humidity=60.0,
        top_moisture=0.25,
        root_moisture=0.22,
        soil_temp6=22.0,
    )
    daily = _build_daily(
        now,
        et0_today=6.0,
        precip_today=1.0,
        tmax_today=33.0,
        min_week_temp=8.0,
    )

    decisions = ws._build_farm_decisions(hourly=hourly, daily=daily, current={"wind_speed": 2.0})

    assert decisions["irrigate_today"]["needed"] is True
    assert decisions["irrigate_today"]["deficit_mm"] == 5.0
    assert decisions["spray_window"]["good_now"] is True
    assert decisions["field_entry"]["ok"] is True
    assert decisions["heat_stress"]["alert"] is False
    assert decisions["harvest_window"]["good_3day"] is True
    assert decisions["frost_risk"]["alert"] is False
    assert decisions["sowing_conditions"]["soil_temp_ok"] is True
    assert decisions["sowing_conditions"]["soil_moisture_ok"] is True


def test_build_farm_decisions_high_risk_conditions() -> None:
    now = datetime.now(ws.IST).replace(minute=0, second=0, microsecond=0)
    hourly = _build_hourly(
        now,
        wind=6.0,
        precip_prob=75.0,
        temp=37.0,
        humidity=88.0,
        top_moisture=0.48,
        root_moisture=0.10,
        soil_temp6=12.0,
    )
    daily = _build_daily(
        now,
        et0_today=2.0,
        precip_today=3.5,
        tmax_today=39.0,
        min_week_temp=9.0,
    )
    daily["precipitation_sum"][1] = 5.0
    daily["precipitation_sum"][2] = 4.0

    decisions = ws._build_farm_decisions(hourly=hourly, daily=daily, current={"wind_speed": 6.0})

    assert decisions["irrigate_today"]["needed"] is False
    assert decisions["spray_window"]["good_now"] is False
    assert decisions["field_entry"]["ok"] is False
    assert decisions["heat_stress"]["alert"] is True
    assert decisions["heat_stress"]["consecutive_hot_hours"] >= 20
    assert decisions["harvest_window"]["good_3day"] is False
    assert decisions["frost_risk"]["alert"] is False
    assert decisions["sowing_conditions"]["soil_temp_ok"] is False
    assert decisions["sowing_conditions"]["soil_moisture_ok"] is False


def test_texture_classifier_boundaries() -> None:
    assert ws._classify_texture(sand=75.0, silt=15.0, clay=10.0) == "Sandy"
    assert ws._classify_texture(sand=40.0, silt=35.0, clay=25.0) == "Clay Loam"
    assert ws._classify_texture(sand=30.0, silt=40.0, clay=18.0) == "Loam"
    assert ws._classify_texture(sand=30.0, silt=20.0, clay=50.0) == "Clay"


def test_resolve_coordinates_uses_query_params_when_provided() -> None:
    resolved = asyncio.run(ws.resolve_coordinates(db=None, user={"id": "u1"}, lat=12.9, lon=77.6))
    assert resolved.source == "query_params"
    assert resolved.lat == 12.9
    assert resolved.lon == 77.6


def test_resolve_coordinates_profile_mandi_lookup() -> None:
    db = FakeDB(
        {
            MongoCollections.FARMER_PROFILES: [
                {"user_id": "u1", "state": "Maharashtra", "district": "Pune"}
            ],
            MongoCollections.REF_MANDI_DIRECTORY: [
                {"state": "Maharashtra", "district": "Pune", "lat": 18.52, "lon": 73.85}
            ],
        }
    )

    resolved = asyncio.run(ws.resolve_coordinates(db=db, user={"id": "u1"}))

    assert resolved.source == "profile_district_mandi"
    assert round(resolved.lat, 2) == 18.52
    assert round(resolved.lon, 2) == 73.85
    assert resolved.location_label == "Pune, Maharashtra"


def test_resolve_coordinates_pin_master_fallback() -> None:
    db = FakeDB(
        {
            MongoCollections.FARMER_PROFILES: [
                {
                    "user_id": "u2",
                    "state": "Karnataka",
                    "district": "Mysuru",
                    "pincode": "570001",
                }
            ],
            MongoCollections.REF_MANDI_DIRECTORY: [],
            MongoCollections.REF_PIN_MASTER: [
                {
                    "state_name": "Karnataka",
                    "district_name": "Mysuru",
                    "latitude": 12.30,
                    "longitude": 76.64,
                }
            ],
        }
    )

    resolved = asyncio.run(ws.resolve_coordinates(db=db, user={"id": "u2"}))

    assert resolved.source == "profile_district_pin_master"
    assert round(resolved.lat, 2) == 12.30
    assert round(resolved.lon, 2) == 76.64


def test_soil_composition_graceful_fallback_when_provider_fails() -> None:
    old_cache_get = ws._cache_get_json
    old_cache_set = ws._cache_set_json
    old_http_json = ws._http_json
    old_wcs = ws._fetch_soilgrids_via_wcs

    async def fake_cache_get(_key: str):
        return None

    async def fake_cache_set(_key: str, _value: dict[str, Any], _ttl: int):
        return None

    async def fake_http_json(_url: str, _params: dict[str, Any], timeout: float = 30.0):
        raise RuntimeError("provider-down")

    async def fake_wcs(lat: float, lon: float):
        return {}

    ws._cache_get_json = fake_cache_get
    ws._cache_set_json = fake_cache_set
    ws._http_json = fake_http_json
    ws._fetch_soilgrids_via_wcs = fake_wcs

    try:
        result = asyncio.run(ws.get_soil_composition(lat=10.0, lon=20.0))
    finally:
        ws._cache_get_json = old_cache_get
        ws._cache_set_json = old_cache_set
        ws._http_json = old_http_json
        ws._fetch_soilgrids_via_wcs = old_wcs

    assert result["source"] == "soilgrids"
    assert result["available"] is False
    assert "temporarily unavailable" in result["message"].lower()


def test_soil_composition_uses_wcs_when_rest_provider_fails() -> None:
    old_cache_get = ws._cache_get_json
    old_cache_set = ws._cache_set_json
    old_http_json = ws._http_json
    old_wcs = ws._fetch_soilgrids_via_wcs

    async def fake_cache_get(_key: str):
        return None

    async def fake_cache_set(_key: str, _value: dict[str, Any], _ttl: int):
        return None

    async def fake_http_json(_url: str, _params: dict[str, Any], timeout: float = 30.0):
        raise RuntimeError("provider-down")

    async def fake_wcs(lat: float, lon: float):
        return {
            "phh2o": {"0-5cm": 6.8, "5-15cm": 6.9, "15-30cm": 7.0},
            "soc": {"0-5cm": 12.0, "5-15cm": 10.0, "15-30cm": 8.0},
            "clay": {"0-5cm": 32.0, "5-15cm": 30.0, "15-30cm": 28.0},
            "sand": {"0-5cm": 40.0, "5-15cm": 42.0, "15-30cm": 44.0},
            "silt": {"0-5cm": 28.0, "5-15cm": 28.0, "15-30cm": 28.0},
            "nitrogen": {"0-5cm": 60.0, "5-15cm": 58.0, "15-30cm": 55.0},
            "cec": {"0-5cm": 140.0, "5-15cm": 135.0, "15-30cm": 130.0},
            "bdod": {"0-5cm": 1.45, "5-15cm": 1.48, "15-30cm": 1.52},
            "cfvo": {"0-5cm": 12.0, "5-15cm": 10.0, "15-30cm": 9.0},
        }

    ws._cache_get_json = fake_cache_get
    ws._cache_set_json = fake_cache_set
    ws._http_json = fake_http_json
    ws._fetch_soilgrids_via_wcs = fake_wcs

    try:
        result = asyncio.run(ws.get_soil_composition(lat=10.0, lon=20.0))
    finally:
        ws._cache_get_json = old_cache_get
        ws._cache_set_json = old_cache_set
        ws._http_json = old_http_json
        ws._fetch_soilgrids_via_wcs = old_wcs

    assert result["source"] == "soilgrids"
    assert result["available"] is True
    assert result["provider"] == "soilgrids-wcs"
    assert result["metrics"]["sand"]["value"] is not None
