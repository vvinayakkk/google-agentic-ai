from fastapi import APIRouter, Query, HTTPException
from services.firebase import db

router = APIRouter()

@router.get("/market/prices")
def get_prices(
    commodity: str = Query(None, description="Commodity to search for, e.g., 'Wheat'"),
):
    """
    Endpoint to get market prices for a given commodity (from Firestore, not API).
    """
    try:
        doc_ref = db.collection('market_data').document('latest')
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="No market data found.")
        data = doc.to_dict().get('data', [])
        if commodity:
            filtered = [item for item in data if (item.get('commodity') or item.get('Commodity', '')).lower() == commodity.lower()]
            return filtered
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}") 