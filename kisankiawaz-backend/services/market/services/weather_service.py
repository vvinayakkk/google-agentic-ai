"""Weather intelligence service using Open-Meteo, NASA POWER, and SoilGrids.

This module also provides compatibility methods for legacy weather endpoints.
"""

from __future__ import annotations

import asyncio
import io
import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Any, Dict, Optional

import httpx

from shared.core.constants import MongoCollections
from shared.db.redis import get_redis


IST = ZoneInfo("Asia/Kolkata")

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
OPEN_METEO_AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
SOILGRIDS_WCS_URL = "https://maps.isric.org/mapserv"

HOURLY_FIELDS = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "apparent_temperature",
    "precipitation_probability",
    "precipitation",
    "weather_code",
    "wind_speed_10m",
    "wind_gusts_10m",
    "wind_direction_10m",
    "vapour_pressure_deficit",
    "et0_fao_evapotranspiration",
    "evapotranspiration",
    "shortwave_radiation",
    "uv_index",
    "soil_temperature_0cm",
    "soil_temperature_6cm",
    "soil_temperature_18cm",
    "soil_temperature_54cm",
    "soil_moisture_0_1cm",
    "soil_moisture_1_3cm",
    "soil_moisture_3_9cm",
    "soil_moisture_9_27cm",
    "soil_moisture_27_81cm",
    "visibility",
]

DAILY_FIELDS = [
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "precipitation_sum",
    "precipitation_probability_max",
    "sunrise",
    "sunset",
    "weather_code",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "wind_direction_10m_dominant",
    "shortwave_radiation_sum",
    "et0_fao_evapotranspiration",
    "uv_index_max",
]

CURRENT_FIELDS = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "apparent_temperature",
    "precipitation_probability",
    "weather_code",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "uv_index",
    "visibility",
    "soil_temperature_6cm",
    "soil_moisture_3_9cm",
]

SOIL_PROPERTIES = "phh2o,soc,clay,sand,silt,nitrogen,cec,bdod,cfvo"
SOIL_DEPTHS = "0-5cm,5-15cm,15-30cm"
SOIL_PROPERTY_LIST = [p.strip() for p in SOIL_PROPERTIES.split(",") if p.strip()]
SOIL_DEPTH_LIST = [d.strip() for d in SOIL_DEPTHS.split(",") if d.strip()]
SOIL_WCS_SCALE_FACTORS: dict[str, float] = {
    "phh2o": 10.0,
    "soc": 10.0,
    "clay": 10.0,
    "sand": 10.0,
    "silt": 10.0,
    "nitrogen": 100.0,
    "cec": 10.0,
    "bdod": 100.0,
    "cfvo": 10.0,
}
SOIL_WCS_NODATA_VALUE = float(os.getenv("SOIL_WCS_NODATA_VALUE", "-32768"))
SOIL_WCS_SAMPLE_DELTA_DEG = float(os.getenv("SOIL_WCS_SAMPLE_DELTA_DEG", "0.05"))
SOIL_LAST_GOOD_CACHE_TTL_SECONDS = int(
    os.getenv("SOIL_LAST_GOOD_CACHE_TTL_SECONDS", str(180 * 24 * 60 * 60))
)

FULL_CACHE_TTL_SECONDS = int(os.getenv("WEATHER_FULL_CACHE_TTL_SECONDS", "3600"))
SOIL_CACHE_TTL_SECONDS = int(
    os.getenv("SOIL_COMPOSITION_CACHE_TTL_SECONDS", str(30 * 24 * 60 * 60))
)


@dataclass
class CoordinateResolution:
    lat: float
    lon: float
    source: str
    state: Optional[str] = None
    district: Optional[str] = None
    location_label: Optional[str] = None


def _normalize_text(value: str) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _to_float(value: Any) -> Optional[float]:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _round_coord(value: float) -> float:
    return round(float(value), 2)


def _safe_list_values(container: dict, key: str) -> list:
    values = container.get(key, []) if isinstance(container, dict) else []
    return values if isinstance(values, list) else []


def _value_at(values: list, idx: int) -> Any:
    if 0 <= idx < len(values):
        return values[idx]
    return None


def _weather_text(weather_code: Optional[int]) -> str:
    mapping = {
        0: "Clear",
        1: "Mainly Clear",
        2: "Partly Cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Rime Fog",
        51: "Light Drizzle",
        53: "Drizzle",
        55: "Dense Drizzle",
        61: "Light Rain",
        63: "Rain",
        65: "Heavy Rain",
        66: "Freezing Rain",
        67: "Heavy Freezing Rain",
        71: "Light Snow",
        73: "Snow",
        75: "Heavy Snow",
        80: "Rain Showers",
        81: "Rain Showers",
        82: "Violent Rain Showers",
        95: "Thunderstorm",
        96: "Thunderstorm Hail",
        99: "Thunderstorm Hail",
    }
    if weather_code is None:
        return "Unknown"
    return mapping.get(int(weather_code), "Unknown")


def _find_closest_time_index(times: list[str]) -> int:
    if not times:
        return 0
    now = datetime.now(IST)
    best_i = 0
    best_diff = timedelta(days=3650)
    for idx, t in enumerate(times):
        try:
            dt = datetime.fromisoformat(t)
        except ValueError:
            continue
        diff = abs(now - dt.replace(tzinfo=IST) if dt.tzinfo is None else now - dt.astimezone(IST))
        if diff < best_diff:
            best_diff = diff
            best_i = idx
    return best_i


def _window_text(start_iso: Optional[str], end_iso: Optional[str]) -> str:
    if not start_iso or not end_iso:
        return "No clear window"
    try:
        s = datetime.fromisoformat(start_iso)
        e = datetime.fromisoformat(end_iso)
        sh = s.strftime("%I:%M %p")
        eh = e.strftime("%I:%M %p")
        return f"{sh}-{eh}"
    except ValueError:
        return f"{start_iso} to {end_iso}"


async def _http_json(url: str, params: Dict[str, Any], timeout: float = 30.0) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


async def _http_bytes(url: str, params: Dict[str, Any], timeout: float = 30.0) -> bytes:
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.content


async def _cache_get_json(key: str) -> Optional[Dict[str, Any]]:
    redis = await get_redis()
    raw = await redis.get(key)
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


async def _cache_set_json(key: str, value: Dict[str, Any], ttl_seconds: int) -> None:
    redis = await get_redis()
    await redis.setex(key, ttl_seconds, json.dumps(value, ensure_ascii=False))


def _extract_lat_lon(data: dict[str, Any]) -> tuple[Optional[float], Optional[float]]:
    lat_keys = ("latitude", "lat", "center_lat", "geo_lat", "lat_dd")
    lon_keys = ("longitude", "lon", "lng", "center_lon", "geo_lon", "lon_dd")

    lat: Optional[float] = None
    lon: Optional[float] = None

    for k in lat_keys:
        lat = _to_float(data.get(k))
        if lat is not None:
            break
    for k in lon_keys:
        lon = _to_float(data.get(k))
        if lon is not None:
            break

    return lat, lon


def _is_india_bounds(lat: float, lon: float) -> bool:
    return 6.0 <= float(lat) <= 38.5 and 68.0 <= float(lon) <= 98.0


async def _coords_from_geocoding(
    district: Optional[str],
    state: Optional[str],
) -> Optional[tuple[float, float]]:
    candidates: list[str] = []

    def _add(value: str) -> None:
        text = str(value or "").strip()
        if text and text not in candidates:
            candidates.append(text)

    if district and state:
        _add(f"{district}, {state}, India")
        _add(f"{district}, India")

        district_norm = str(district).strip()
        for token in ["district", "suburban", "rural", "urban"]:
            district_norm = district_norm.replace(token, "")
            district_norm = district_norm.replace(token.title(), "")
        district_norm = " ".join(district_norm.split())
        if district_norm and district_norm.lower() != str(district).strip().lower():
            _add(f"{district_norm}, {state}, India")
            _add(f"{district_norm}, India")

        if " " in district_norm:
            first_word = district_norm.split(" ", 1)[0].strip()
            if first_word:
                _add(f"{first_word}, {state}, India")
                _add(f"{first_word}, India")

    if state:
        _add(f"{state}, India")

    for candidate in candidates:
        try:
            payload = await _http_json(
                OPEN_METEO_GEO_URL,
                {
                    "name": candidate,
                    "count": 5,
                    "language": "en",
                    "format": "json",
                },
                timeout=20.0,
            )
        except Exception:
            continue

        results = payload.get("results", []) if isinstance(payload, dict) else []
        if not isinstance(results, list) or not results:
            continue

        in_result = next(
            (
                r
                for r in results
                if str((r or {}).get("country_code") or "").upper() == "IN"
            ),
            results[0],
        )
        lat = _to_float((in_result or {}).get("latitude"))
        lon = _to_float((in_result or {}).get("longitude"))
        if lat is None or lon is None:
            continue
        if _is_india_bounds(lat, lon):
            return (lat, lon)

    return None


async def _coords_from_mandi_directory(db, state: Optional[str], district: Optional[str]) -> Optional[tuple[float, float]]:
    query = db.collection(MongoCollections.REF_MANDI_DIRECTORY)
    if state:
        query = query.where("state", "==", state)
    if district:
        query = query.where("district", "==", district)

    lats: list[float] = []
    lons: list[float] = []
    count = 0

    async for doc in query.limit(400).stream():
        count += 1
        row = doc.to_dict() or {}
        lat, lon = _extract_lat_lon(row)
        if lat is None or lon is None:
            continue
        lats.append(lat)
        lons.append(lon)

    if count == 0 and district:
        # Try district-only fallback if exact state match missed.
        query2 = db.collection(MongoCollections.REF_MANDI_DIRECTORY).where("district", "==", district)
        async for doc in query2.limit(500).stream():
            row = doc.to_dict() or {}
            row_state = _normalize_text(str(row.get("state") or ""))
            if state and row_state and row_state != _normalize_text(state):
                continue
            lat, lon = _extract_lat_lon(row)
            if lat is None or lon is None:
                continue
            lats.append(lat)
            lons.append(lon)

    if not lats or not lons:
        return None

    return (sum(lats) / len(lats), sum(lons) / len(lons))


async def _coords_from_pin_master(db, state: Optional[str], district: Optional[str], pincode: Optional[str]) -> Optional[tuple[float, float]]:
    lats: list[float] = []
    lons: list[float] = []

    async def _collect(query, limit_count: int = 500) -> None:
        async for doc in query.limit(limit_count).stream():
            row = doc.to_dict() or {}
            lat, lon = _extract_lat_lon(row)
            if lat is None or lon is None:
                continue
            lats.append(lat)
            lons.append(lon)

    if state and district:
        for state_field in ("state_name", "state"):
            for district_field in ("district_name", "district"):
                query = (
                    db.collection(MongoCollections.REF_PIN_MASTER)
                    .where(state_field, "==", state)
                    .where(district_field, "==", district)
                )
                await _collect(query, limit_count=300)
                if lats and lons:
                    break
            if lats and lons:
                break

    if (not lats or not lons) and pincode:
        pin_text = str(pincode).strip()
        pin_values: list[Any] = [pin_text]
        if pin_text.isdigit():
            try:
                pin_values.append(int(pin_text))
            except ValueError:
                pass

        for pin_field in ("pincode", "pin_code", "pin"):
            for pin_value in pin_values:
                query = db.collection(MongoCollections.REF_PIN_MASTER).where(pin_field, "==", pin_value)
                await _collect(query, limit_count=250)
                if lats and lons:
                    break
            if lats and lons:
                break

    if not lats or not lons:
        return None

    return (sum(lats) / len(lats), sum(lons) / len(lons))


async def resolve_coordinates(
    db,
    user: dict,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> CoordinateResolution:
    if lat is not None and lon is not None:
        return CoordinateResolution(
            lat=float(lat),
            lon=float(lon),
            source="query_params",
            location_label="Provided coordinates",
        )

    user_id = str(user.get("id") or "").strip()
    if not user_id:
        raise ValueError("Unable to resolve coordinates: missing user identity")

    profile_q = (
        db.collection(MongoCollections.FARMER_PROFILES)
        .where("user_id", "==", user_id)
        .limit(1)
    )
    profiles = [d async for d in profile_q.stream()]
    if not profiles:
        raise ValueError("Farmer profile not found. Please set farm location in profile.")

    profile = profiles[0].to_dict() or {}
    state = str(profile.get("state") or "").strip() or None
    district = str(profile.get("district") or "").strip() or None
    pincode = (
        str(
            profile.get("pincode")
            or profile.get("pin_code")
            or profile.get("pin")
            or ""
        ).strip()
        or None
    )

    if not state and not district and not pincode:
        raise ValueError("Farm location is incomplete in profile. Add state/district to continue.")

    coords = await _coords_from_mandi_directory(db=db, state=state, district=district)
    if coords is not None and not _is_india_bounds(coords[0], coords[1]):
        coords = None
    source = "profile_district_mandi"

    if coords is None:
        coords = await _coords_from_pin_master(db=db, state=state, district=district, pincode=pincode)
        if coords is not None and not _is_india_bounds(coords[0], coords[1]):
            coords = None
        source = "profile_district_pin_master"

    if coords is None and (district or state):
        coords = await _coords_from_geocoding(district=district, state=state)
        if coords is not None:
            source = "profile_district_geocode"

    if coords is None and state:
        coords = await _coords_from_mandi_directory(db=db, state=state, district=None)
        if coords is not None and not _is_india_bounds(coords[0], coords[1]):
            coords = None
        else:
            source = "profile_state_mandi"

    if coords is None and state:
        coords = await _coords_from_geocoding(district=None, state=state)
        if coords is not None:
            source = "profile_state_geocode"

    if coords is None:
        raise ValueError(
            "Could not resolve district coordinates from reference data. "
            "Please update profile location or pass lat/lon explicitly."
        )

    label_parts = [x for x in [district, state] if x]
    return CoordinateResolution(
        lat=coords[0],
        lon=coords[1],
        source=source,
        state=state,
        district=district,
        location_label=", ".join(label_parts) if label_parts else "Profile location",
    )


def _build_farm_decisions(hourly: dict, daily: dict, current: dict) -> dict:
    times = _safe_list_values(hourly, "time")
    idx = _find_closest_time_index(times)

    precip_prob = _safe_list_values(hourly, "precipitation_probability")
    precip = _safe_list_values(hourly, "precipitation")
    wind = _safe_list_values(hourly, "wind_speed_10m")
    temp = _safe_list_values(hourly, "temperature_2m")
    humidity = _safe_list_values(hourly, "relative_humidity_2m")
    soil_m0 = _safe_list_values(hourly, "soil_moisture_0_1cm")
    soil_m39 = _safe_list_values(hourly, "soil_moisture_3_9cm")
    soil_t6 = _safe_list_values(hourly, "soil_temperature_6cm")

    daily_dates = _safe_list_values(daily, "time")
    d_et0 = _safe_list_values(daily, "et0_fao_evapotranspiration")
    d_precip = _safe_list_values(daily, "precipitation_sum")
    d_tmax = _safe_list_values(daily, "temperature_2m_max")
    d_tmin = _safe_list_values(daily, "temperature_2m_min")

    today = datetime.now(IST).date().isoformat()
    d_idx = daily_dates.index(today) if today in daily_dates else 0

    et0_today = _to_float(_value_at(d_et0, d_idx)) or 0.0
    precip_today = _to_float(_value_at(d_precip, d_idx)) or 0.0
    deficit = round(et0_today - precip_today, 1)

    next3_prob = [
        _to_float(_value_at(precip_prob, idx + i)) or 0.0
        for i in range(3)
    ]
    precip_prob_next3h = max(next3_prob) if next3_prob else 100.0

    wind_now = _to_float(current.get("wind_speed"))
    if wind_now is None:
        wind_now = _to_float(_value_at(wind, idx)) or 0.0

    spray_good_now = wind_now < 3.0 and precip_prob_next3h < 20.0

    next_good_window = None
    scan_len = min(len(times), idx + 24)
    for i in range(idx, max(idx, scan_len - 1)):
        w0 = _to_float(_value_at(wind, i)) or 99.0
        w1 = _to_float(_value_at(wind, i + 1)) or 99.0
        p0 = _to_float(_value_at(precip_prob, i)) or 100.0
        p1 = _to_float(_value_at(precip_prob, i + 1)) or 100.0
        if w0 < 3.0 and w1 < 3.0 and p0 < 20.0 and p1 < 20.0:
            if i + 1 < len(times):
                next_good_window = {
                    "start": _value_at(times, i),
                    "end": _value_at(times, i + 1),
                    "label": _window_text(_value_at(times, i), _value_at(times, i + 1)),
                }
            break

    surface_moisture = _to_float(_value_at(soil_m0, idx))
    field_ok = (surface_moisture is not None) and (surface_moisture < 0.35)

    tmax_today = _to_float(_value_at(d_tmax, d_idx)) or 0.0
    hot_24h = [(_to_float(_value_at(temp, i)) or 0.0) for i in range(idx, min(idx + 24, len(temp)))]
    consecutive_hot_hours = 0
    best_run = 0
    for t in hot_24h:
        if t > 35.0:
            consecutive_hot_hours += 1
            best_run = max(best_run, consecutive_hot_hours)
        else:
            consecutive_hot_hours = 0

    precip_next_3_days = sum((_to_float(_value_at(d_precip, d_idx + i)) or 0.0) for i in range(3))
    humidity_next_3_days = [(_to_float(_value_at(humidity, i)) or 0.0) for i in range(idx, min(idx + 72, len(humidity)))]
    max_humidity_3day = max(humidity_next_3_days) if humidity_next_3_days else 100.0
    harvest_good = precip_next_3_days < 5.0 and max_humidity_3day < 75.0

    min_temp_7d = min((_to_float(_value_at(d_tmin, i)) or 99.0) for i in range(d_idx, min(d_idx + 7, len(d_tmin))))
    frost_alert = min_temp_7d < 4.0

    frost_when = None
    if frost_alert:
        for i in range(d_idx, min(d_idx + 7, len(d_tmin))):
            v = _to_float(_value_at(d_tmin, i))
            if v is not None and v == min_temp_7d:
                frost_when = _value_at(daily_dates, i)
                break

    soil_t6_now = _to_float(_value_at(soil_t6, idx))
    soil_m39_now = _to_float(_value_at(soil_m39, idx))
    soil_temp_ok = (soil_t6_now is not None) and (soil_t6_now > 15.0)
    soil_m_ok = (soil_m39_now is not None) and (0.15 < soil_m39_now < 0.35)

    return {
        "irrigate_today": {
            "needed": deficit > 3.0,
            "deficit_mm": deficit,
            "message": f"Irrigate about {max(deficit, 0):.1f} mm today" if deficit > 3.0 else "No irrigation needed today",
        },
        "spray_window": {
            "good_now": spray_good_now,
            "next_good_window": next_good_window,
            "message": (
                "Spray conditions are good now"
                if spray_good_now
                else (
                    f"Next good spray window: {next_good_window['label']}"
                    if next_good_window
                    else "Avoid spraying for now due to wind/rain risk"
                )
            ),
        },
        "field_entry": {
            "ok": field_ok,
            "surface_moisture": surface_moisture,
            "message": "Field is dry enough for machinery" if field_ok else "Wait: topsoil is too wet for machinery",
        },
        "heat_stress": {
            "alert": tmax_today > 35.0,
            "temp_max_today": tmax_today,
            "consecutive_hot_hours": best_run,
            "message": "Heat stress risk is high today" if tmax_today > 35.0 else "No major heat stress expected",
        },
        "harvest_window": {
            "good_3day": harvest_good,
            "rain_next_3_days_mm": round(precip_next_3_days, 1),
            "max_humidity_next_3_days": round(max_humidity_3day, 1),
            "message": "3-day harvest window looks favorable" if harvest_good else "Harvest risk elevated due to rain/humidity",
        },
        "frost_risk": {
            "alert": frost_alert,
            "lowest_temp": round(min_temp_7d, 1) if min_temp_7d != 99.0 else None,
            "when": frost_when,
            "message": "Frost risk detected in next 7 days" if frost_alert else "No frost risk in next 7 days",
        },
        "sowing_conditions": {
            "soil_temp_ok": soil_temp_ok,
            "soil_moisture_ok": soil_m_ok,
            "soil_temp_6cm": soil_t6_now,
            "soil_moisture_3_9cm": soil_m39_now,
            "message": (
                "Soil temperature and moisture are favorable for sowing"
                if (soil_temp_ok and soil_m_ok)
                else "Sowing conditions are suboptimal right now"
            ),
        },
    }


def _map_hourly_output(hourly: dict) -> dict:
    return {
        "time": _safe_list_values(hourly, "time"),
        "temp": _safe_list_values(hourly, "temperature_2m"),
        "humidity": _safe_list_values(hourly, "relative_humidity_2m"),
        "precip_prob": _safe_list_values(hourly, "precipitation_probability"),
        "precip": _safe_list_values(hourly, "precipitation"),
        "wind_speed": _safe_list_values(hourly, "wind_speed_10m"),
        "wind_gust": _safe_list_values(hourly, "wind_gusts_10m"),
        "wind_direction": _safe_list_values(hourly, "wind_direction_10m"),
        "weather_code": _safe_list_values(hourly, "weather_code"),
        "soil_temp_0cm": _safe_list_values(hourly, "soil_temperature_0cm"),
        "soil_temp_6cm": _safe_list_values(hourly, "soil_temperature_6cm"),
        "soil_temp_18cm": _safe_list_values(hourly, "soil_temperature_18cm"),
        "soil_temp_54cm": _safe_list_values(hourly, "soil_temperature_54cm"),
        "soil_moisture_surface": _safe_list_values(hourly, "soil_moisture_0_1cm"),
        "soil_moisture_1_3cm": _safe_list_values(hourly, "soil_moisture_1_3cm"),
        "soil_moisture_root": _safe_list_values(hourly, "soil_moisture_3_9cm"),
        "soil_moisture_9_27cm": _safe_list_values(hourly, "soil_moisture_9_27cm"),
        "soil_moisture_deep": _safe_list_values(hourly, "soil_moisture_27_81cm"),
        "et0": _safe_list_values(hourly, "et0_fao_evapotranspiration"),
        "evapotranspiration": _safe_list_values(hourly, "evapotranspiration"),
        "vpd": _safe_list_values(hourly, "vapour_pressure_deficit"),
        "solar_radiation": _safe_list_values(hourly, "shortwave_radiation"),
        "uv_index": _safe_list_values(hourly, "uv_index"),
        "dew_point": _safe_list_values(hourly, "dew_point_2m"),
        "visibility": _safe_list_values(hourly, "visibility"),
    }


def _map_daily_output(daily: dict) -> dict:
    return {
        "date": _safe_list_values(daily, "time"),
        "temp_max": _safe_list_values(daily, "temperature_2m_max"),
        "temp_min": _safe_list_values(daily, "temperature_2m_min"),
        "apparent_temp_max": _safe_list_values(daily, "apparent_temperature_max"),
        "precip_sum": _safe_list_values(daily, "precipitation_sum"),
        "precip_prob_max": _safe_list_values(daily, "precipitation_probability_max"),
        "et0": _safe_list_values(daily, "et0_fao_evapotranspiration"),
        "uv_max": _safe_list_values(daily, "uv_index_max"),
        "wind_max": _safe_list_values(daily, "wind_speed_10m_max"),
        "wind_gust_max": _safe_list_values(daily, "wind_gusts_10m_max"),
        "wind_direction_dominant": _safe_list_values(daily, "wind_direction_10m_dominant"),
        "weather_code": _safe_list_values(daily, "weather_code"),
        "sunrise": _safe_list_values(daily, "sunrise"),
        "sunset": _safe_list_values(daily, "sunset"),
        "solar_radiation_sum": _safe_list_values(daily, "shortwave_radiation_sum"),
    }


def _latest_air_quality(air_payload: dict) -> dict:
    hourly = air_payload.get("hourly", {}) if isinstance(air_payload, dict) else {}
    times = _safe_list_values(hourly, "time")
    idx = _find_closest_time_index(times)
    return {
        "pm25": _to_float(_value_at(_safe_list_values(hourly, "pm2_5"), idx)),
        "pm10": _to_float(_value_at(_safe_list_values(hourly, "pm10"), idx)),
        "aqi": _to_float(_value_at(_safe_list_values(hourly, "european_aqi"), idx)),
    }


def _extract_nasa_latest(nasa_payload: dict) -> dict:
    params = (
        nasa_payload.get("properties", {}).get("parameter", {})
        if isinstance(nasa_payload, dict)
        else {}
    )

    def last_value(name: str) -> Optional[float]:
        series = params.get(name, {}) if isinstance(params, dict) else {}
        if not isinstance(series, dict) or not series:
            return None
        key = sorted(series.keys())[-1]
        return _to_float(series.get(key))

    return {
        "solar_radiation": last_value("ALLSKY_SFC_SW_DWN"),
        "temp_max": last_value("T2M_MAX"),
        "temp_min": last_value("T2M_MIN"),
        "precipitation": last_value("PRECTOTCORR"),
        "humidity": last_value("RH2M"),
        "wind_speed": last_value("WS2M"),
    }


async def get_full_weather_data(lat: float, lon: float) -> Dict[str, Any]:
    lat_r = _round_coord(lat)
    lon_r = _round_coord(lon)
    cache_key = f"weather:full:v2:{lat_r}:{lon_r}"
    cached = await _cache_get_json(cache_key)
    if cached:
        return cached

    weather_params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join(HOURLY_FIELDS),
        "daily": ",".join(DAILY_FIELDS),
        "current": ",".join(CURRENT_FIELDS),
        "forecast_days": 16,
        "past_days": 2,
        "timezone": "Asia/Kolkata",
    }

    now_ist = datetime.now(IST)
    yday = (now_ist - timedelta(days=1)).strftime("%Y%m%d")
    tday = now_ist.strftime("%Y%m%d")
    nasa_params = {
        "parameters": "ALLSKY_SFC_SW_DWN,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M",
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": yday,
        "end": tday,
        "format": "JSON",
    }

    air_params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "pm10,pm2_5,european_aqi",
        "timezone": "Asia/Kolkata",
    }

    weather_payload: dict[str, Any] = {}
    nasa_payload: dict[str, Any] = {}
    air_payload: dict[str, Any] = {}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            weather_task = client.get(OPEN_METEO_FORECAST_URL, params=weather_params)
            nasa_task = client.get(NASA_POWER_URL, params=nasa_params)
            air_task = client.get(OPEN_METEO_AIR_URL, params=air_params)
            weather_resp, nasa_resp, air_resp = await asyncio.gather(
                weather_task,
                nasa_task,
                air_task,
                return_exceptions=True,
            )

            if isinstance(weather_resp, Exception):
                raise weather_resp
            weather_resp.raise_for_status()
            weather_payload = weather_resp.json()

            if not isinstance(nasa_resp, Exception):
                nasa_resp.raise_for_status()
                nasa_payload = nasa_resp.json()

            if not isinstance(air_resp, Exception):
                air_resp.raise_for_status()
                air_payload = air_resp.json()
    except Exception as exc:
        raise ValueError(f"Failed to fetch weather intelligence data: {exc}") from exc

    hourly = weather_payload.get("hourly", {}) if isinstance(weather_payload, dict) else {}
    daily = weather_payload.get("daily", {}) if isinstance(weather_payload, dict) else {}
    current_raw = weather_payload.get("current", {}) if isinstance(weather_payload, dict) else {}

    times = _safe_list_values(hourly, "time")
    idx = _find_closest_time_index(times)

    current_weather_code = _to_float(current_raw.get("weather_code"))
    if current_weather_code is None:
        current_weather_code = _to_float(_value_at(_safe_list_values(hourly, "weather_code"), idx))

    current = {
        "temp": _to_float(current_raw.get("temperature_2m"))
        or _to_float(_value_at(_safe_list_values(hourly, "temperature_2m"), idx)),
        "apparent_temp": _to_float(current_raw.get("apparent_temperature"))
        or _to_float(_value_at(_safe_list_values(hourly, "apparent_temperature"), idx)),
        "humidity": _to_float(current_raw.get("relative_humidity_2m"))
        or _to_float(_value_at(_safe_list_values(hourly, "relative_humidity_2m"), idx)),
        "wind_speed": _to_float(current_raw.get("wind_speed_10m"))
        or _to_float(_value_at(_safe_list_values(hourly, "wind_speed_10m"), idx)),
        "wind_direction": _to_float(current_raw.get("wind_direction_10m"))
        or _to_float(_value_at(_safe_list_values(hourly, "wind_direction_10m"), idx)),
        "wind_gust": _to_float(current_raw.get("wind_gusts_10m"))
        or _to_float(_value_at(_safe_list_values(hourly, "wind_gusts_10m"), idx)),
        "uv_index": _to_float(current_raw.get("uv_index"))
        or _to_float(_value_at(_safe_list_values(hourly, "uv_index"), idx)),
        "weather_code": int(current_weather_code) if current_weather_code is not None else None,
        "condition": _weather_text(int(current_weather_code)) if current_weather_code is not None else "Unknown",
        "dew_point": _to_float(current_raw.get("dew_point_2m"))
        or _to_float(_value_at(_safe_list_values(hourly, "dew_point_2m"), idx)),
        "visibility": _to_float(current_raw.get("visibility"))
        or _to_float(_value_at(_safe_list_values(hourly, "visibility"), idx)),
        "soil_temperature_6cm": _to_float(current_raw.get("soil_temperature_6cm"))
        or _to_float(_value_at(_safe_list_values(hourly, "soil_temperature_6cm"), idx)),
        "soil_moisture_3_9cm": _to_float(current_raw.get("soil_moisture_3_9cm"))
        or _to_float(_value_at(_safe_list_values(hourly, "soil_moisture_3_9cm"), idx)),
        "time": current_raw.get("time") or _value_at(times, idx),
    }

    decisions = _build_farm_decisions(hourly=hourly, daily=daily, current=current)
    nasa_latest = _extract_nasa_latest(nasa_payload or {})

    payload = {
        "source": "open-meteo+nasa-power+open-meteo-air-quality",
        "lat": lat,
        "lon": lon,
        "current": current,
        "hourly": _map_hourly_output(hourly),
        "daily": _map_daily_output(daily),
        "air_quality": _latest_air_quality(air_payload or {}),
        "nasa_power": nasa_latest,
        "farm_decisions": decisions,
        "cached_at": datetime.now(IST).isoformat(),
    }

    await _cache_set_json(cache_key, payload, FULL_CACHE_TTL_SECONDS)
    return payload


def _safe_divide(value: Optional[float], divisor: Optional[float]) -> Optional[float]:
    if value is None or divisor in (None, 0):
        return None
    return value / divisor


def _weighted_depth_value(values: dict[str, Optional[float]]) -> Optional[float]:
    weights = {
        "0-5cm": 0.5,
        "5-15cm": 0.3,
        "15-30cm": 0.2,
    }
    total = 0.0
    used = 0.0
    for depth, w in weights.items():
        v = values.get(depth)
        if v is None:
            continue
        total += v * w
        used += w
    if used <= 0:
        return None
    return total / used


def _classify_texture(sand: Optional[float], silt: Optional[float], clay: Optional[float]) -> str:
    if sand is None or silt is None or clay is None:
        return "Unknown"
    if clay >= 40:
        return "Clay"
    if sand >= 70 and clay < 15:
        return "Sandy"
    if silt >= 50 and clay < 27:
        return "Silty Loam"
    if 20 <= clay < 40 and 20 <= sand <= 55:
        return "Clay Loam"
    if 7 <= clay < 27 and 28 <= silt < 50 and 23 <= sand <= 52:
        return "Loam"
    if sand >= 43 and clay < 20:
        return "Sandy Loam"
    return "Loamy"


def _status_with_message(metric: str, value: Optional[float]) -> tuple[str, str]:
    if value is None:
        return ("Unknown", "No reliable data available yet")

    if metric == "ph":
        if value < 5.5:
            return ("Acidic", "Slightly acidic to acidic soil. Add lime for sensitive crops")
        if value <= 7.0:
            return ("Optimal", "Good pH for most field crops")
        if value <= 7.8:
            return ("Slightly Alkaline", "Generally manageable with organic matter")
        return ("Alkaline", "Use organic amendments and pH balancing practices")

    if metric == "soc":
        if value < 5:
            return ("Low", "Low organic carbon. Add compost/FYM/residue")
        if value < 12:
            return ("Moderate", "Moderate carbon. Maintain residue recycling")
        return ("High", "Good carbon reserve for soil structure")

    if metric == "nitrogen":
        if value < 50:
            return ("Low", "Likely nitrogen-limited. Plan split N application")
        if value < 120:
            return ("Moderate", "Moderate nitrogen reserve")
        return ("High", "Good nitrogen reserve")

    if metric == "cec":
        if value < 100:
            return ("Low", "Lower nutrient holding capacity")
        if value < 250:
            return ("Moderate", "Moderate nutrient holding capacity")
        return ("High", "Strong nutrient holding capacity")

    if metric == "bdod":
        if value > 1.6:
            return ("High", "Compaction risk is high")
        if value > 1.3:
            return ("Moderate", "Watch for compaction and drainage")
        return ("Good", "Bulk density is favorable")

    if metric == "cfvo":
        if value > 35:
            return ("High", "High stone content may affect tillage")
        if value > 15:
            return ("Moderate", "Moderate coarse fragments")
        return ("Low", "Low stone content")

    return ("Info", "")


def _parse_soilgrids_layers(payload: Dict[str, Any]) -> dict[str, dict[str, Optional[float]]]:
    layers = payload.get("properties", {}).get("layers", []) if isinstance(payload, dict) else []

    parsed: dict[str, dict[str, Optional[float]]] = {}
    for layer in layers:
        name = str(layer.get("name") or "").strip().lower()
        if not name:
            continue
        unit_info = layer.get("unit_measure", {}) if isinstance(layer, dict) else {}
        divisor = _to_float(unit_info.get("d_factor"))
        depths = layer.get("depths", []) if isinstance(layer, dict) else []
        depth_values: dict[str, Optional[float]] = {}
        for depth in depths:
            label = str(depth.get("label") or "")
            if not label:
                continue
            raw_val = _to_float((depth.get("values") or {}).get("mean"))
            norm_val = _safe_divide(raw_val, divisor) if divisor else raw_val
            depth_values[label] = norm_val
        if depth_values:
            parsed[name] = depth_values

    return parsed


def _normalize_wcs_value(property_name: str, raw_value: Optional[float]) -> Optional[float]:
    if raw_value is None:
        return None
    if raw_value <= SOIL_WCS_NODATA_VALUE:
        return None
    factor = SOIL_WCS_SCALE_FACTORS.get(property_name, 1.0)
    if factor == 0:
        return raw_value
    return raw_value / factor


def _has_any_soil_metric(parsed: dict[str, dict[str, Optional[float]]]) -> bool:
    for by_depth in parsed.values():
        for v in by_depth.values():
            if v is not None:
                return True
    return False


def _extract_tiff_single_pixel_value(raw_tiff: bytes) -> Optional[float]:
    try:
        from PIL import Image
    except Exception:
        return None

    try:
        with Image.open(io.BytesIO(raw_tiff)) as img:
            pixel = img.getpixel((0, 0))
    except Exception:
        return None

    if isinstance(pixel, tuple):
        if not pixel:
            return None
        pixel = pixel[0]

    return _to_float(pixel)


async def _fetch_soilgrids_wcs_layer_value(
    lat: float,
    lon: float,
    property_name: str,
    depth_label: str,
) -> Optional[float]:
    delta = max(SOIL_WCS_SAMPLE_DELTA_DEG, 0.001)
    bbox = f"{lon - delta},{lat - delta},{lon + delta},{lat + delta}"
    params = {
        "map": f"/map/{property_name}.map",
        "SERVICE": "WCS",
        "VERSION": "1.0.0",
        "REQUEST": "GetCoverage",
        "COVERAGE": f"{property_name}_{depth_label}_mean",
        "CRS": "EPSG:4326",
        "BBOX": bbox,
        "WIDTH": "1",
        "HEIGHT": "1",
        "FORMAT": "image/tiff",
    }
    raw = await _http_bytes(SOILGRIDS_WCS_URL, params=params, timeout=45.0)
    value = _extract_tiff_single_pixel_value(raw)
    return _normalize_wcs_value(property_name, value)


async def _fetch_soilgrids_via_wcs(lat: float, lon: float) -> dict[str, dict[str, Optional[float]]]:
    task_defs: list[tuple[str, str]] = []
    tasks: list[asyncio.Future] = []

    for property_name in SOIL_PROPERTY_LIST:
        for depth_label in SOIL_DEPTH_LIST:
            task_defs.append((property_name, depth_label))
            tasks.append(
                asyncio.create_task(
                    _fetch_soilgrids_wcs_layer_value(
                        lat=lat,
                        lon=lon,
                        property_name=property_name,
                        depth_label=depth_label,
                    )
                )
            )

    results = await asyncio.gather(*tasks, return_exceptions=True)
    parsed: dict[str, dict[str, Optional[float]]] = {
        property_name: {} for property_name in SOIL_PROPERTY_LIST
    }

    for (property_name, depth_label), result in zip(task_defs, results):
        value: Optional[float]
        if isinstance(result, Exception):
            value = None
        else:
            value = result
        parsed[property_name][depth_label] = value

    return parsed


def _compose_soil_composition_result(
    lat: float,
    lon: float,
    parsed: dict[str, dict[str, Optional[float]]],
    *,
    provider: str,
) -> Dict[str, Any]:
    ph = _weighted_depth_value(parsed.get("phh2o", {}))
    soc = _weighted_depth_value(parsed.get("soc", {}))
    clay = _weighted_depth_value(parsed.get("clay", {}))
    sand = _weighted_depth_value(parsed.get("sand", {}))
    silt = _weighted_depth_value(parsed.get("silt", {}))
    nitrogen = _weighted_depth_value(parsed.get("nitrogen", {}))
    cec = _weighted_depth_value(parsed.get("cec", {}))
    bdod_raw = _weighted_depth_value(parsed.get("bdod", {}))
    bdod = _safe_divide(bdod_raw, 100.0) if bdod_raw is not None and bdod_raw > 10 else bdod_raw
    cfvo = _weighted_depth_value(parsed.get("cfvo", {}))

    ph_status, ph_msg = _status_with_message("ph", ph)
    soc_status, soc_msg = _status_with_message("soc", soc)
    n_status, n_msg = _status_with_message("nitrogen", nitrogen)
    cec_status, cec_msg = _status_with_message("cec", cec)
    bd_status, bd_msg = _status_with_message("bdod", bdod)
    cf_status, cf_msg = _status_with_message("cfvo", cfvo)

    return {
        "source": "soilgrids",
        "provider": provider,
        "lat": lat,
        "lon": lon,
        "available": True,
        "texture_class": _classify_texture(sand=sand, silt=silt, clay=clay),
        "metrics": {
            "ph": {"value": ph, "status": ph_status, "interpretation": ph_msg},
            "organic_carbon": {"value": soc, "status": soc_status, "interpretation": soc_msg},
            "clay": {"value": clay, "status": "Info", "interpretation": "Clay fraction (%)"},
            "sand": {"value": sand, "status": "Info", "interpretation": "Sand fraction (%)"},
            "silt": {"value": silt, "status": "Info", "interpretation": "Silt fraction (%)"},
            "nitrogen": {"value": nitrogen, "status": n_status, "interpretation": n_msg},
            "cec": {"value": cec, "status": cec_status, "interpretation": cec_msg},
            "bulk_density": {"value": bdod, "status": bd_status, "interpretation": bd_msg},
            "coarse_fragments": {"value": cfvo, "status": cf_status, "interpretation": cf_msg},
        },
        "depths": parsed,
        "cached_at": datetime.now(IST).isoformat(),
    }


async def get_soil_composition(lat: float, lon: float) -> Dict[str, Any]:
    lat_r = _round_coord(lat)
    lon_r = _round_coord(lon)
    cache_key = f"weather:soilgrids:v1:{lat_r}:{lon_r}"
    last_good_key = f"weather:soilgrids:lastgood:v1:{lat_r}:{lon_r}"
    cached = await _cache_get_json(cache_key)
    if cached:
        return cached

    params = {
        "lon": lon,
        "lat": lat,
        "property": SOIL_PROPERTIES,
        "depth": SOIL_DEPTHS,
        "value": "mean",
    }

    errors: list[str] = []

    parsed = None
    provider_used = "soilgrids-rest-v2"
    try:
        payload = await _http_json(SOILGRIDS_URL, params=params, timeout=40.0)
        parsed = _parse_soilgrids_layers(payload)
        if not _has_any_soil_metric(parsed):
            errors.append("SoilGrids REST returned empty layers")
            parsed = None
    except Exception as exc:
        errors.append(f"SoilGrids REST error: {exc}")

    if parsed is None:
        wcs_parsed = await _fetch_soilgrids_via_wcs(lat=lat, lon=lon)
        if _has_any_soil_metric(wcs_parsed):
            parsed = wcs_parsed
            provider_used = "soilgrids-wcs"
        else:
            errors.append("SoilGrids WCS returned empty layers")

    if parsed is not None:
        result = _compose_soil_composition_result(
            lat=lat,
            lon=lon,
            parsed=parsed,
            provider=provider_used,
        )
        await _cache_set_json(cache_key, result, SOIL_CACHE_TTL_SECONDS)
        await _cache_set_json(last_good_key, result, SOIL_LAST_GOOD_CACHE_TTL_SECONDS)
        return result

    stale = await _cache_get_json(last_good_key)
    if stale:
        stale_payload = dict(stale)
        stale_payload["provider"] = "soilgrids-last-good-cache"
        stale_payload["stale"] = True
        stale_payload["available"] = True
        stale_payload["message"] = "Serving last successful soil composition due to provider outage"
        stale_payload["provider_errors"] = errors
        return stale_payload

    # No live or stale provider data available.
    return {
        "source": "soilgrids",
        "provider": "unavailable",
        "lat": lat,
        "lon": lon,
        "available": False,
        "message": "Soil composition data temporarily unavailable",
        "error": "; ".join(errors) if errors else "Unknown provider error",
    }


async def _geocode_city(city: str) -> dict:
    city_text = str(city or "").strip()
    if not city_text:
        raise ValueError("Unable to geocode city: empty city value")

    candidates = [city_text]
    if "," in city_text:
        first_part = city_text.split(",", 1)[0].strip()
        if first_part and first_part not in candidates:
            candidates.append(first_part)

    for candidate in candidates:
        payload = await _http_json(
            OPEN_METEO_GEO_URL,
            {
                "name": candidate,
                "count": 1,
                "language": "en",
                "format": "json",
            },
            timeout=20.0,
        )
        results = payload.get("results", []) if isinstance(payload, dict) else []
        if results:
            return results[0]

    raise ValueError(f"Unable to geocode city: {city}")


def _iso_to_unix_seconds(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    try:
        return int(datetime.fromisoformat(value).timestamp())
    except ValueError:
        return None


def _to_legacy_weather_shape(full: dict, name: str, lat: float, lon: float) -> dict:
    current = full.get("current", {}) if isinstance(full, dict) else {}
    daily = full.get("daily", {}) if isinstance(full, dict) else {}
    sunrise = _value_at(daily.get("sunrise", []), 0) if isinstance(daily, dict) else None
    sunset = _value_at(daily.get("sunset", []), 0) if isinstance(daily, dict) else None

    return {
        "coord": {"lat": lat, "lon": lon},
        "weather": [
            {
                "id": current.get("weather_code"),
                "main": current.get("condition") or "Clear",
                "description": str(current.get("condition") or "clear").lower(),
            }
        ],
        "main": {
            "temp": current.get("temp"),
            "feels_like": current.get("apparent_temp"),
            "humidity": current.get("humidity"),
        },
        "wind": {
            "speed": current.get("wind_speed"),
            "deg": current.get("wind_direction"),
            "gust": current.get("wind_gust"),
        },
        "sys": {
            "sunrise": _iso_to_unix_seconds(sunrise),
            "sunset": _iso_to_unix_seconds(sunset),
        },
        "visibility": current.get("visibility"),
        "name": name,
        "source": "open-meteo-compat",
    }


def _to_legacy_forecast_shape(full: dict, city_name: str) -> dict:
    hourly = full.get("hourly", {}) if isinstance(full, dict) else {}
    times = hourly.get("time", []) if isinstance(hourly, dict) else []
    temp = hourly.get("temp", []) if isinstance(hourly, dict) else []
    humidity = hourly.get("humidity", []) if isinstance(hourly, dict) else []
    wind_speed = hourly.get("wind_speed", []) if isinstance(hourly, dict) else []
    precip_prob = hourly.get("precip_prob", []) if isinstance(hourly, dict) else []
    weather_code = hourly.get("weather_code", []) if isinstance(hourly, dict) else []

    idx = _find_closest_time_index(times)
    items = []
    for i in range(idx, min(len(times), idx + 48), 3):
        t = _value_at(times, i)
        t_val = _to_float(_value_at(temp, i))
        h_val = _to_float(_value_at(humidity, i))
        w_val = _to_float(_value_at(wind_speed, i))
        p_val = _to_float(_value_at(precip_prob, i))
        code = _to_float(_value_at(weather_code, i))
        cond = _weather_text(int(code)) if code is not None else "Unknown"

        items.append(
            {
                "dt_txt": t,
                "main": {
                    "temp": t_val,
                    "temp_min": t_val,
                    "temp_max": t_val,
                    "humidity": h_val,
                },
                "weather": [{"id": int(code) if code is not None else None, "main": cond}],
                "wind": {"speed": w_val},
                "pop": (p_val or 0.0) / 100.0,
            }
        )

    return {
        "list": items,
        "city": {"name": city_name, "country": "IN"},
        "source": "open-meteo-compat",
    }


async def get_weather_by_city(city: str) -> Dict[str, Any]:
    geo = await _geocode_city(city)
    lat = _to_float(geo.get("latitude"))
    lon = _to_float(geo.get("longitude"))
    if lat is None or lon is None:
        raise ValueError(f"Unable to resolve coordinates for city: {city}")
    full = await get_full_weather_data(lat=lat, lon=lon)
    return _to_legacy_weather_shape(full=full, name=str(geo.get("name") or city), lat=lat, lon=lon)


async def get_weather_by_coords(lat: float, lon: float) -> Dict[str, Any]:
    full = await get_full_weather_data(lat=lat, lon=lon)
    return _to_legacy_weather_shape(full=full, name="Coordinates", lat=lat, lon=lon)


async def get_forecast_by_city(city: str) -> Dict[str, Any]:
    geo = await _geocode_city(city)
    lat = _to_float(geo.get("latitude"))
    lon = _to_float(geo.get("longitude"))
    if lat is None or lon is None:
        raise ValueError(f"Unable to resolve coordinates for city: {city}")
    full = await get_full_weather_data(lat=lat, lon=lon)
    return _to_legacy_forecast_shape(full=full, city_name=str(geo.get("name") or city))


async def get_forecast_by_coords(lat: float, lon: float) -> Dict[str, Any]:
    full = await get_full_weather_data(lat=lat, lon=lon)
    return _to_legacy_forecast_shape(full=full, city_name="Coordinates")
