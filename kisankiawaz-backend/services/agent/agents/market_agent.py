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
Respond in the user's language (Hindi default).
Cover: current prices, nearby mandis, price trends, selling timing.""",
        tools=[
            get_live_mandi_prices,
            get_live_mandis,
            search_market_prices,
            get_nearby_mandis,
            get_price_trends,
        ],
    )
