from google.adk.agents import Agent
from tools.market_tools import (
    search_market_prices,
    get_nearby_mandis,
    get_price_trends,
    get_live_mandi_prices,
    get_live_mandis,
)


def build_market_agent() -> Agent:
    return Agent(
        name="MarketAgent",
        model="gemini-2.5-flash",
        description="Handles market-related queries: prices, mandis, selling strategies, trends",
        instruction="""You are MarketAgent, specialized in agricultural market intelligence.
    For current mandi price and mandi directory queries, ALWAYS call live tools first.
    Use vector search as supplemental context for interpretation and trends.
    Help farmers get the best prices with practical next steps.
    Always respond in the current user's requested language; if unclear, use English.
    Cover: current prices, nearby mandis, price trends, selling timing.
    In every price/mandi answer, explicitly mention source and freshness fields such as as_of_latest_arrival_date/data_last_ingested_at when available.
    If tool output indicates fallback_mode=relaxed, explicitly state that values are broader fallback results and may not match the exact requested district/state.""",
        tools=[
            get_live_mandi_prices,
            get_live_mandis,
            search_market_prices,
            get_nearby_mandis,
            get_price_trends,
        ],
    )
