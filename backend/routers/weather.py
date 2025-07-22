from fastapi import APIRouter, Query, HTTPException
from services.weather import (
    get_weather_by_city, get_weather_by_coords,
    get_forecast_by_city, get_forecast_by_coords,
    get_air_quality,
    geocode_city, reverse_geocode, get_weather_tile_url
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

@router.get("/weather/air_quality")
def air_quality(lat: float = Query(...), lon: float = Query(...)):
    try:
        data = get_air_quality(lat, lon)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/weather/geocode")
def geocode(city: str = Query(None), lat: float = Query(None), lon: float = Query(None)):
    try:
        if city:
            data = geocode_city(city)
            return data
        elif lat is not None and lon is not None:
            data = reverse_geocode(lat, lon)
            return data
        else:
            raise HTTPException(status_code=400, detail="Provide either city or both lat and lon.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/weather/map_tile_url")
def map_tile_url(layer: str = Query(...), z: int = Query(...), x: int = Query(...), y: int = Query(...)):
    try:
        url = get_weather_tile_url(layer, z, x, y)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 