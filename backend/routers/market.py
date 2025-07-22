from fastapi import APIRouter, Query, HTTPException
from services.market import get_market_prices

router = APIRouter()

@router.get("/market/prices")
def get_prices(
    state: str = Query(..., description="State to search for, e.g., 'Maharashtra'"),
    commodity: str = Query(..., description="Commodity to search for, e.g., 'Wheat'"),
    district: str = Query(None, description="Optional: District to filter by, e.g., 'Pune'")
):
    """
    Endpoint to get variety-wise market prices for a given state, commodity, and optional district.
    """
    try:
        prices = get_market_prices(state, commodity, district)
        print(prices)
        if isinstance(prices, dict) and "error" in prices:
            raise HTTPException(status_code=500, detail=prices["error"])
        return prices
    except Exception as e:
        # This will catch exceptions from get_market_prices and any other unforeseen errors
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}") 