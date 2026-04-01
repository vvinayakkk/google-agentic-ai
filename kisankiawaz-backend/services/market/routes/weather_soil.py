"""Weather and soil routes backed by Open-Meteo, NASA POWER, and SoilGrids.

Legacy OpenWeather-style response routes are retained for compatibility.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from shared.auth.deps import get_current_user
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus

from services.weather_service import (
    get_weather_by_city,
    get_weather_by_coords,
    get_forecast_by_city,
    get_forecast_by_coords,
    get_full_weather_data,
    get_soil_composition,
    resolve_coordinates,
)
from services.soil_service import get_soil_moisture_data


router = APIRouter(tags=["Weather & Soil"])


@router.get("/weather/full", status_code=HttpStatus.OK)
async def weather_full(
    lat: Optional[float] = Query(default=None),
    lon: Optional[float] = Query(default=None),
    user: dict = Depends(get_current_user),
):
    if (lat is None) ^ (lon is None):
        raise HTTPException(status_code=400, detail="Provide both lat and lon, or neither.")

    try:
        db = get_async_db()
        resolved = await resolve_coordinates(db=db, user=user, lat=lat, lon=lon)
        payload = await get_full_weather_data(lat=resolved.lat, lon=resolved.lon)
        payload["location"] = {
            "lat": resolved.lat,
            "lon": resolved.lon,
            "source": resolved.source,
            "state": resolved.state,
            "district": resolved.district,
            "label": resolved.location_label,
        }
        return payload
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/weather/soil-composition", status_code=HttpStatus.OK)
async def weather_soil_composition(
    lat: Optional[float] = Query(default=None),
    lon: Optional[float] = Query(default=None),
    user: dict = Depends(get_current_user),
):
    if (lat is None) ^ (lon is None):
        raise HTTPException(status_code=400, detail="Provide both lat and lon, or neither.")

    try:
        db = get_async_db()
        resolved = await resolve_coordinates(db=db, user=user, lat=lat, lon=lon)
        payload = await get_soil_composition(lat=resolved.lat, lon=resolved.lon)
        payload["location"] = {
            "lat": resolved.lat,
            "lon": resolved.lon,
            "source": resolved.source,
            "state": resolved.state,
            "district": resolved.district,
            "label": resolved.location_label,
        }
        return payload
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/weather/city", status_code=HttpStatus.OK)
async def weather_by_city(
    city: str = Query(..., description="City name, e.g. Pune,IN"),
    user: dict = Depends(get_current_user),
):
    try:
        return await get_weather_by_city(city)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/weather/coords", status_code=HttpStatus.OK)
async def weather_by_coords(
    lat: float = Query(...),
    lon: float = Query(...),
    user: dict = Depends(get_current_user),
):
    try:
        return await get_weather_by_coords(lat, lon)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/weather/forecast/city", status_code=HttpStatus.OK)
async def forecast_by_city(
    city: str = Query(..., description="City name, e.g. Pune,IN"),
    user: dict = Depends(get_current_user),
):
    try:
        return await get_forecast_by_city(city)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/weather/forecast/coords", status_code=HttpStatus.OK)
async def forecast_by_coords(
    lat: float = Query(...),
    lon: float = Query(...),
    user: dict = Depends(get_current_user),
):
    try:
        return await get_forecast_by_coords(lat, lon)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/soil-moisture", status_code=HttpStatus.OK)
async def soil_moisture(
    state: str = Query(..., description="State name"),
    district: Optional[str] = Query(default=None),
    year: Optional[str] = Query(default=None),
    month: Optional[str] = Query(default=None),
    limit: int = Query(default=1000, ge=1, le=1000),
    user: dict = Depends(get_current_user),
):
    try:
        return await get_soil_moisture_data(
            state=state,
            district=district,
            year=year,
            month=month,
            limit=limit,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
