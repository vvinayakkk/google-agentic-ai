import os
from typing import Any, Dict

import requests

from services.embedding_service import EmbeddingService
from shared.core.constants import QdrantCollections
from shared.db.firebase import get_db


DATA_GOV_BASE = "https://api.data.gov.in/resource"
DAILY_PRICE_RESOURCE_ID = "35985678-0d79-46b4-9ed6-6f13308a1d24"


def _get_embedding_service() -> EmbeddingService:
    import main as m
    return m.embedding_service


def _data_gov_key() -> str:
    return (os.getenv("DATA_GOV_API_KEY") or "").strip()


def search_market_prices(crop_name: str, state: str = "") -> dict:
    """Search for current market prices of a crop, optionally filtered by state."""
    svc = _get_embedding_service()
    query = f"{crop_name} market price mandi rate {state}"
    results = svc.search(QdrantCollections.MARKET_KNOWLEDGE, query, top_k=5)
    if not results:
        return {"found": False, "message": f"No price data found for {crop_name}."}
    return {"found": True, "results": [r["text"] for r in results]}


def get_nearby_mandis(state: str, district: str = "") -> dict:
    """Get nearby mandi information from Firestore index with embedding fallback."""
    st = (state or "").strip()
    dist = (district or "").strip()
    if not st:
        return {"found": False, "message": "State is required to find nearby mandis."}

    try:
        db = get_db()
        query = db.collection("mandis").where("state", "==", st).limit(100)
        docs = list(query.stream())

        rows = []
        for d in docs:
            item = d.to_dict() or {}
            if dist and (item.get("district", "").strip().lower() != dist.lower()):
                continue
            rows.append(
                {
                    "name": item.get("name", ""),
                    "state": item.get("state", ""),
                    "district": item.get("district", ""),
                    "source": item.get("source", "firestore"),
                }
            )

        if rows:
            return {
                "found": True,
                "source": "firestore_mandi_index",
                "count": len(rows),
                "mandis": rows[:20],
            }
    except Exception:
        # Fall back to vector search below.
        pass

    svc = _get_embedding_service()
    query = f"mandi market {st} {dist} location address"
    results = svc.search(QdrantCollections.MARKET_KNOWLEDGE, query, top_k=5)
    if not results:
        return {"found": False, "message": f"No mandi info found for {st}."}
    return {
        "found": True,
        "source": "qdrant_fallback",
        "results": [r["text"] for r in results],
    }


def get_price_trends(crop_name: str, period: str = "monthly") -> dict:
    """Get price trend information for a crop over a specified period."""
    svc = _get_embedding_service()
    query = f"{crop_name} price trend {period} historical rate change"
    results = svc.search(QdrantCollections.MARKET_KNOWLEDGE, query, top_k=5)
    if not results:
        return {"found": False, "message": f"No trend data found for {crop_name}."}
    return {"found": True, "results": [r["text"] for r in results]}


def get_live_mandi_prices(crop_name: str, state: str = "", district: str = "", limit: int = 20) -> Dict[str, Any]:
    """Fetch live mandi prices from data.gov.in daily price resource."""
    key = _data_gov_key()
    if not key:
        return {"found": False, "message": "DATA_GOV_API_KEY is missing."}

    params = {
        "api-key": key,
        "format": "json",
        "offset": "0",
        "limit": str(max(1, min(limit, 100))),
        "filters[Commodity]": crop_name.strip(),
    }
    if state.strip():
        params["filters[State]"] = state.strip()
    if district.strip():
        params["filters[District]"] = district.strip()

    try:
        resp = requests.get(
            f"{DATA_GOV_BASE}/{DAILY_PRICE_RESOURCE_ID}",
            params=params,
            timeout=25,
        )
        resp.raise_for_status()
        data = resp.json()
        records = data.get("records") or []
        compact = []
        for rec in records[:20]:
            compact.append(
                {
                    "market": rec.get("market") or rec.get("Market"),
                    "state": rec.get("state") or rec.get("State"),
                    "district": rec.get("district") or rec.get("District"),
                    "commodity": rec.get("commodity") or rec.get("Commodity"),
                    "modal_price": rec.get("modal_price") or rec.get("Modal_Price"),
                    "min_price": rec.get("min_price") or rec.get("Min_Price"),
                    "max_price": rec.get("max_price") or rec.get("Max_Price"),
                    "arrival_date": rec.get("arrival_date") or rec.get("Arrival_Date"),
                }
            )
        return {
            "found": True,
            "source": "data.gov.in",
            "resource_id": DAILY_PRICE_RESOURCE_ID,
            "total_records": len(records),
            "prices": compact,
        }
    except Exception as exc:
        return {"found": False, "message": f"Failed to fetch live mandi prices: {exc}"}


def get_live_mandis(state: str = "", limit: int = 50) -> Dict[str, Any]:
    """Build live mandi directory by de-duplicating daily price records."""
    key = _data_gov_key()
    if not key:
        return {"found": False, "message": "DATA_GOV_API_KEY is missing."}

    params = {
        "api-key": key,
        "format": "json",
        "offset": "0",
        "limit": str(max(1, min(limit * 5, 1000))),
    }
    if state.strip():
        params["filters[State]"] = state.strip()

    try:
        resp = requests.get(
            f"{DATA_GOV_BASE}/{DAILY_PRICE_RESOURCE_ID}",
            params=params,
            timeout=25,
        )
        resp.raise_for_status()
        data = resp.json()
        records = data.get("records") or []

        unique = {}
        for rec in records:
            market = rec.get("market") or rec.get("Market") or ""
            st = rec.get("state") or rec.get("State") or ""
            dist = rec.get("district") or rec.get("District") or ""
            key_t = (market, st, dist)
            if market and key_t not in unique:
                unique[key_t] = {
                    "name": market,
                    "state": st,
                    "district": dist,
                }

        mandis = list(unique.values())[:limit]
        return {
            "found": True,
            "source": "data.gov.in_daily_prices",
            "resource_id": DAILY_PRICE_RESOURCE_ID,
            "total_records": len(records),
            "mandis": mandis,
        }
    except Exception as exc:
        return {"found": False, "message": f"Failed to fetch live mandis: {exc}"}
