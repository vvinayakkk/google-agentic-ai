from google.adk.agents import Agent
from tools.weather_tools import (
    search_weather_knowledge,
    get_seasonal_advisory,
    get_live_weather,
    get_live_weather_forecast,
    get_live_soil_moisture,
)


def build_weather_agent() -> Agent:
    return Agent(
        name="WeatherAgent",
        model="gemini-2.5-flash",
        description="Handles weather-related queries: forecasts, seasonal advice, climate impact on farming",
        instruction="""You are WeatherAgent, specialized in weather and climate for Indian farming.
    For current weather/forecast/soil moisture queries, ALWAYS call live tools first.
    Use knowledge-base search as supplementary context, not as a substitute for live values.
    Always respond in the current user's requested language; if unclear, use English.
    Cover: seasonal predictions, weather impact on crops, irrigation scheduling based on weather.
    Always include freshness context in output (observed/retrieved timestamp or latest available date) when tool output provides it.""",
        tools=[
            get_live_weather,
            get_live_weather_forecast,
            get_live_soil_moisture,
            search_weather_knowledge,
            get_seasonal_advisory,
        ],
    )
