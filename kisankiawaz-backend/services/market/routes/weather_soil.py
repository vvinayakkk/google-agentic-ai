"""Weather and soil routes backed by OpenWeatherMap and data.gov.in."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from shared.auth.deps import get_current_user
from shared.errors import HttpStatus

from services.weather_service import (
    get_weather_by_city,
    get_weather_by_coords,
    get_forecast_by_city,
    get_forecast_by_coords,
)
from services.soil_service import get_soil_moisture_data


router = APIRouter(tags=["Weather & Soil"])


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
