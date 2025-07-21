from fastapi import APIRouter, Query, HTTPException
from services.weather import (
    get_weather_by_city, get_weather_by_coords,
    get_forecast_by_city, get_forecast_by_coords,
    get_weather_alerts
)

router = APIRouter()

@router.get("/weather/city")
def weather_by_city(city: str = Query(..., description="City name, e.g. Pune,IN")):
    try:
        data = get_weather_by_city(city)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/weather/coords")
def weather_by_coords(lat: float = Query(...), lon: float = Query(...)):
    try:
        data = get_weather_by_coords(lat, lon)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/weather/forecast/city")
def forecast_by_city(city: str = Query(..., description="City name, e.g. Pune,IN")):
    try:
        data = get_forecast_by_city(city)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/weather/forecast/coords")
def forecast_by_coords(lat: float = Query(...), lon: float = Query(...)):
    try:
        data = get_forecast_by_coords(lat, lon)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/weather/alerts")
def weather_alerts(lat: float = Query(...), lon: float = Query(...)):
    try:
        data = get_weather_alerts(lat, lon)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 