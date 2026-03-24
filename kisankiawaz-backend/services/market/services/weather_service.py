"""OpenWeatherMap integration utilities for market/weather endpoints."""

from __future__ import annotations

import os
from typing import Any, Dict

import httpx


OPENWEATHER_BASE = "https://api.openweathermap.org"


def _get_api_key() -> str:
    key = (os.getenv("OPENWEATHERMAP_API_KEY") or os.getenv("OPENWEATHER_API_KEY") or "").strip()
    if not key:
        raise ValueError("OpenWeather API key is not configured")
    return key


async def _call_openweather(path: str, params: Dict[str, Any]) -> Dict[str, Any]:
    key = _get_api_key()
    final_params = {**params, "appid": key}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{OPENWEATHER_BASE}{path}", params=final_params)
        response.raise_for_status()
        return response.json()


async def get_weather_by_city(city: str) -> Dict[str, Any]:
    return await _call_openweather(
        "/data/2.5/weather",
        {"q": city, "units": "metric"},
    )


async def get_weather_by_coords(lat: float, lon: float) -> Dict[str, Any]:
    return await _call_openweather(
        "/data/2.5/weather",
        {"lat": lat, "lon": lon, "units": "metric"},
    )


async def get_forecast_by_city(city: str) -> Dict[str, Any]:
    return await _call_openweather(
        "/data/2.5/forecast",
        {"q": city, "units": "metric"},
    )


async def get_forecast_by_coords(lat: float, lon: float) -> Dict[str, Any]:
    return await _call_openweather(
        "/data/2.5/forecast",
        {"lat": lat, "lon": lon, "units": "metric"},
    )
