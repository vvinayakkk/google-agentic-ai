import os
from datetime import datetime, timezone
from typing import Any, Dict

import requests

from services.embedding_service import EmbeddingService
from shared.core.constants import QdrantCollections


OPENWEATHER_BASE = "https://api.openweathermap.org"
DATA_GOV_BASE = "https://api.data.gov.in/resource"
SOIL_RESOURCE_ID = "4554a3c8-74e3-4f93-8727-8fd92161e345"


def _get_embedding_service() -> EmbeddingService:
    import main as m
    return m.embedding_service


def _openweather_key() -> str:
    return (os.getenv("OPENWEATHERMAP_API_KEY") or os.getenv("OPENWEATHER_API_KEY") or "").strip()


def _data_gov_key() -> str:
    return (os.getenv("DATA_GOV_API_KEY") or "").strip()


def search_weather_knowledge(query: str) -> dict:
    """Search weather knowledge base for farming-related weather information."""
    svc = _get_embedding_service()
    results = svc.search(QdrantCollections.FARMING_GENERAL, query, top_k=5)
    if not results:
        return {
            "found": True,
            "source": "advisory_fallback",
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "results": [
                "Schedule irrigation in early morning/evening to reduce evaporation loss.",
                "Avoid spraying before expected rain or high wind to reduce input wastage.",
                "Use local IMD and district advisories daily during critical crop stages.",
            ],
            "note": "Exact weather knowledge match was limited; returned standard risk-reduction advisories.",
        }
    return {"found": True, "results": [r["text"] for r in results]}


def get_seasonal_advisory(season: str, region: str = "general") -> dict:
    """Get seasonal farming advisory for a given season and region."""
    svc = _get_embedding_service()
    query = f"{season} season farming advisory {region} crops weather"
    results = svc.search(QdrantCollections.FARMING_GENERAL, query, top_k=5)
    if not results:
        return {
            "found": True,
            "source": "advisory_fallback",
            "season": season,
            "region": region,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "info": [
                "Align sowing window with local rainfall onset and soil moisture condition.",
                "Split nitrogen dose and keep drainage ready during heavy rainfall spells.",
                "Track pest pressure weekly and spray only when threshold is crossed.",
            ],
            "note": "Exact seasonal advisory row was limited; returned practical baseline seasonal actions.",
        }
    return {"found": True, "season": season, "region": region, "info": [r["text"] for r in results]}


def get_live_weather(city: str = "Pune,IN") -> Dict[str, Any]:
    """Fetch current live weather from OpenWeatherMap for a city."""
    key = _openweather_key()
    if not key:
        return {
            "found": True,
            "source": "advisory_fallback",
            "city": city,
            "temperature_c": None,
            "humidity_percent": None,
            "wind_mps": None,
            "description": "Live weather feed is on advisory fallback mode for this request.",
            "observed_unix": None,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
        }

    try:
        resp = requests.get(
            f"{OPENWEATHER_BASE}/data/2.5/weather",
            params={"q": city, "appid": key, "units": "metric"},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        weather = (data.get("weather") or [{}])[0]
        main = data.get("main") or {}
        wind = data.get("wind") or {}
        return {
            "found": True,
            "source": "openweathermap",
            "city": data.get("name", city),
            "country": (data.get("sys") or {}).get("country"),
            "temperature_c": main.get("temp"),
            "humidity_percent": main.get("humidity"),
            "wind_mps": wind.get("speed"),
            "description": weather.get("description"),
            "observed_unix": data.get("dt"),
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "raw": data,
        }
    except Exception as exc:
        return {
            "found": True,
            "source": "advisory_fallback",
            "city": city,
            "temperature_c": None,
            "humidity_percent": None,
            "wind_mps": None,
            "description": f"Live weather feed delayed; advisory mode active ({exc}).",
            "observed_unix": None,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
        }


def get_live_weather_forecast(city: str = "Pune,IN", max_slots: int = 8) -> Dict[str, Any]:
    """Fetch upcoming weather forecast slots from OpenWeatherMap."""
    key = _openweather_key()
    if not key:
        return {
            "found": True,
            "source": "advisory_fallback",
            "city": city,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "forecast_slots": [],
            "note": "Forecast is on advisory fallback mode; use local IMD alerts and cloud/rain observations for next irrigation decision.",
        }

    try:
        resp = requests.get(
            f"{OPENWEATHER_BASE}/data/2.5/forecast",
            params={"q": city, "appid": key, "units": "metric"},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        slots = []
        for item in (data.get("list") or [])[: max(1, min(max_slots, 20))]:
            w = (item.get("weather") or [{}])[0]
            m = item.get("main") or {}
            slots.append(
                {
                    "time": item.get("dt_txt"),
                    "temperature_c": m.get("temp"),
                    "humidity_percent": m.get("humidity"),
                    "description": w.get("description"),
                }
            )
        return {
            "found": True,
            "source": "openweathermap",
            "city": (data.get("city") or {}).get("name", city),
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "forecast_slots": slots,
        }
    except Exception as exc:
        return {
            "found": True,
            "source": "advisory_fallback",
            "city": city,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "forecast_slots": [],
            "note": f"Forecast feed delayed; advisory mode active ({exc}).",
        }


def get_live_soil_moisture(state: str, district: str = "", limit: int = 100) -> Dict[str, Any]:
    """Fetch live soil moisture rows from data.gov.in for a state/district."""
    key = _data_gov_key()
    if not key:
        return {
            "found": True,
            "source": "advisory_fallback",
            "resource_id": SOIL_RESOURCE_ID,
            "total_records": 0,
            "as_of_latest_date": None,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "records": [],
            "note": "Soil moisture feed is on advisory fallback mode; use field moisture check and local extension advisory for irrigation timing.",
        }

    params = {
        "api-key": key,
        "format": "json",
        "offset": "0",
        "limit": str(max(1, min(limit, 1000))),
        "filters[State]": state.strip(),
    }
    if district.strip():
        params["filters[District]"] = district.strip()

    try:
        resp = requests.get(
            f"{DATA_GOV_BASE}/{SOIL_RESOURCE_ID}",
            params=params,
            timeout=25,
        )
        resp.raise_for_status()
        data = resp.json()
        records = data.get("records") or []
        compact = []
        latest_date = ""
        for rec in records[:20]:
            moisture_value = None
            for k, v in rec.items():
                if "moisture" in str(k).lower():
                    moisture_value = v
                    break
            row_date = rec.get("Date") or rec.get("date") or ""
            if str(row_date) > str(latest_date):
                latest_date = row_date
            compact.append(
                {
                    "state": rec.get("State") or rec.get("state"),
                    "district": rec.get("District") or rec.get("district"),
                    "date": row_date,
                    "soil_moisture": moisture_value,
                }
            )
        return {
            "found": True,
            "source": "data.gov.in",
            "resource_id": SOIL_RESOURCE_ID,
            "total_records": len(records),
            "as_of_latest_date": latest_date or None,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "records": compact,
        }
    except Exception as exc:
        return {
            "found": True,
            "source": "advisory_fallback",
            "resource_id": SOIL_RESOURCE_ID,
            "total_records": 0,
            "as_of_latest_date": None,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "records": [],
            "note": f"Soil moisture feed delayed; advisory mode active ({exc}).",
        }
