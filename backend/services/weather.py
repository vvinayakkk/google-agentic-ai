import requests
import os

OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '0a2d0746df030311d5eeed1aea9faa05')
BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'
FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast'
ONECALL_URL = 'https://api.openweathermap.org/data/3.0/onecall'

# Example: get_weather_by_city('Pune,IN')
def get_weather_by_city(city: str):
    params = {
        'q': city,
        'appid': OPENWEATHER_API_KEY,
        'units': 'metric',
    }
    response = requests.get(BASE_URL, params=params)
    response.raise_for_status()
    return response.json()

# Example: get_weather_by_coords(lat, lon)
def get_weather_by_coords(lat: float, lon: float):
    params = {
        'lat': lat,
        'lon': lon,
        'appid': OPENWEATHER_API_KEY,
        'units': 'metric',
    }
    response = requests.get(BASE_URL, params=params)
    response.raise_for_status()
    return response.json()

# 5-day/3-hour forecast by city name
def get_forecast_by_city(city: str):
    params = {
        'q': city,
        'appid': OPENWEATHER_API_KEY,
        'units': 'metric',
    }
    response = requests.get(FORECAST_URL, params=params)
    response.raise_for_status()
    return response.json()

# 5-day/3-hour forecast by coordinates
def get_forecast_by_coords(lat: float, lon: float):
    params = {
        'lat': lat,
        'lon': lon,
        'appid': OPENWEATHER_API_KEY,
        'units': 'metric',
    }
    response = requests.get(FORECAST_URL, params=params)
    response.raise_for_status()
    return response.json()

# Current weather alerts (One Call API, needs lat/lon)
def get_weather_alerts(lat: float, lon: float):
    params = {
        'lat': lat,
        'lon': lon,
        'appid': OPENWEATHER_API_KEY,
        'units': 'metric',
        'exclude': 'minutely,hourly,daily',
    }
    response = requests.get(ONECALL_URL, params=params)
    response.raise_for_status()
    return response.json().get('alerts', []) 