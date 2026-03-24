"""
Real-time Mandi Data Fetcher for KisanKiAwaaz.
Integrates with multiple government data sources:

1. data.gov.in API - Primary source for daily commodity prices (1000+ mandis)
2. Agmarknet API - APMC mandi prices (Agricultural Marketing Information Network)
3. eNAM API - Electronic National Agriculture Market

Fetches, normalizes, stores in MongoCollections, and embeds in Qdrant for the knowledge base.
"""

import os
import json
import uuid
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any

import httpx

logger = logging.getLogger(__name__)

# ── API Configuration ────────────────────────────────────────────

# data.gov.in API
DATA_GOV_API_KEY = os.getenv(
    "DATA_GOV_API_KEY",
    ""
)
DATA_GOV_BASE_URL = "https://api.data.gov.in/resource"

# Resource IDs for different data sets on data.gov.in
RESOURCES = {
    "daily_prices": "35985678-0d79-46b4-9ed6-6f13308a1d24",   # Daily market prices
    "wholesale_prices": "9ef84268-d588-465a-a308-a864a43d0070", # Wholesale prices  
    "mandi_list": "6f9273bb-d3d3-4d6f-9e34-e3e5be15c67e",      # Mandi directory
}

# All Indian States
INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
    "Jammu and Kashmir", "Ladakh",
]

# Major commodities for bulk fetching
MAJOR_COMMODITIES = [
    "Wheat", "Rice", "Maize", "Bajra", "Jowar", "Ragi",
    "Arhar (Tur)", "Moong", "Urad", "Masoor", "Gram",
    "Groundnut", "Mustard", "Soyabean", "Sunflower",
    "Cotton", "Jute", "Sugarcane",
    "Potato", "Onion", "Tomato", "Brinjal", "Cabbage", "Cauliflower",
    "Lady Finger", "Green Chilli", "Capsicum", "Cucumber", "Bitter Gourd",
    "Bottle Gourd", "Pumpkin", "Carrot", "Radish", "Beans",
    "Apple", "Banana", "Mango", "Orange", "Grapes", "Papaya",
    "Guava", "Pomegranate", "Watermelon", "Lemon",
    "Turmeric", "Ginger", "Garlic", "Coriander", "Cumin",
    "Black Pepper", "Cardamom", "Coconut",
    "Milk", "Ghee", "Curd",
]

# Crop name mapping for normalization
CROP_NAME_MAP = {
    "organic wheat": "Wheat", "wheat": "Wheat",
    "tomatoes": "Tomato", "tomato": "Tomato",
    "onion": "Onion", "onions": "Onion",
    "fresh milk": "Milk", "fresh onions": "Onion",
    "chickpeas": "Gram", "peas(dry)": "Gram",
    "potatoes": "Potato", "potato": "Potato",
    "rice": "Rice", "paddy": "Rice",
    "maize": "Maize", "corn": "Maize",
    "mustard oil": "Mustard", "sarson": "Mustard",
    "cotton": "Cotton", "kapas": "Cotton",
    "sugar cane": "Sugarcane", "ganna": "Sugarcane",
    "soybean": "Soyabean", "soyabean": "Soyabean",
    "tur": "Arhar (Tur)", "arhar": "Arhar (Tur)",
    "moong dal": "Moong", "urad dal": "Urad",
    "chana": "Gram", "chana dal": "Gram",
    "green chilli": "Green Chilli", "hari mirch": "Green Chilli",
    "shimla mirch": "Capsicum",
    "haldi": "Turmeric", "adrak": "Ginger",
    "lahsun": "Garlic", "jeera": "Cumin",
    "kali mirch": "Black Pepper",
}

# MSP (Minimum Support Prices) 2024-25
MSP_PRICES = {
    "Paddy (Common)": 2300, "Paddy (Grade A)": 2320,
    "Wheat": 2275, "Barley": 1850, "Gram": 5440,
    "Masoor (Lentil)": 6425, "Arhar (Tur)": 7000,
    "Moong": 8682, "Urad": 6950,
    "Groundnut": 6377, "Sunflower": 6760,
    "Soyabean (Yellow)": 4892, "Mustard": 5650,
    "Cotton (Medium Staple)": 7121, "Cotton (Long Staple)": 7521,
    "Jute": 5335, "Sugarcane (FRP)": 340,
    "Copra (Milling)": 11160, "Copra (Ball)": 12100,
    "Jowar (Hybrid)": 3371, "Jowar (Maldandi)": 3421,
    "Bajra": 2625, "Ragi": 3846, "Maize": 2225,
    "Safflower": 5800, "Nigerseed": 7734,
    "Sesamum": 8635, "Toria": 5650,
}


class MandiDataFetcher:
    """Fetches and processes real-time mandi data from government APIs."""

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    # ── Fetch from data.gov.in ───────────────────────────────────

    async def fetch_daily_prices(
        self,
        state: str = None,
        commodity: str = None,
        district: str = None,
        limit: int = 500,
        offset: int = 0,
    ) -> List[Dict]:
        """Fetch daily commodity prices from data.gov.in API."""
        if not DATA_GOV_API_KEY:
            logger.error("DATA_GOV_API_KEY is not configured")
            return []
        
        # Normalize commodity name
        if commodity:
            commodity = CROP_NAME_MAP.get(commodity.lower().strip(), commodity.strip())
        
        params = {
            "api-key": DATA_GOV_API_KEY,
            "format": "json",
            "offset": str(offset),
            "limit": str(min(limit, 1000)),  # API max is 1000
        }
        
        if state:
            params["filters[State]"] = state.strip()
        if commodity:
            params["filters[Commodity]"] = commodity
        if district:
            params["filters[District]"] = district.strip()
        
        url = f"{DATA_GOV_BASE_URL}/{RESOURCES['daily_prices']}"
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            records = data.get("records", [])
            total = data.get("total", 0)
            
            # Normalize records
            normalized = []
            seen = set()
            
            for rec in records:
                market = rec.get("market") or rec.get("Market") or ""
                commodity_name = rec.get("commodity") or rec.get("Commodity") or ""
                variety = rec.get("variety") or rec.get("Variety") or ""
                arrival_date = rec.get("arrival_date") or rec.get("Arrival_Date") or ""
                state_name = rec.get("state") or rec.get("State") or ""
                district_name = rec.get("district") or rec.get("District") or ""
                min_price = rec.get("min_price") or rec.get("Min_Price") or "0"
                max_price = rec.get("max_price") or rec.get("Max_Price") or "0"
                modal_price = rec.get("modal_price") or rec.get("Modal_Price") or "0"
                
                key = (market, commodity_name, variety, arrival_date)
                if key in seen:
                    continue
                seen.add(key)
                
                try:
                    min_p = float(min_price) if min_price else 0
                    max_p = float(max_price) if max_price else 0
                    modal_p = float(modal_price) if modal_price else 0
                except (ValueError, TypeError):
                    min_p = max_p = modal_p = 0
                
                normalized.append({
                    "market": market,
                    "commodity": commodity_name,
                    "variety": variety,
                    "state": state_name,
                    "district": district_name,
                    "min_price": min_p,
                    "max_price": max_p,
                    "modal_price": modal_p,
                    "unit": "quintal",
                    "arrival_date": arrival_date,
                    "source": "data.gov.in",
                })
            
            return normalized
        
        except httpx.HTTPError as e:
            logger.error(f"data.gov.in API error: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching prices: {e}")
            return []

    async def fetch_bulk_prices(self, states: List[str] = None, limit_per_state: int = 200) -> List[Dict]:
        """Fetch prices for multiple states in parallel."""
        if not states:
            states = INDIAN_STATES[:15]  # Top 15 agricultural states
        
        tasks = []
        for state in states:
            tasks.append(self.fetch_daily_prices(state=state, limit=limit_per_state))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_prices = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error fetching for {states[i]}: {result}")
                continue
            all_prices.extend(result)
        
        return all_prices

    async def fetch_commodity_prices_all_india(self, commodity: str, limit: int = 500) -> List[Dict]:
        """Fetch prices for a specific commodity across all of India."""
        return await self.fetch_daily_prices(commodity=commodity, limit=limit)

    # ── Fetch Mandi Directory ────────────────────────────────────

    async def fetch_mandi_list(self, state: str = None, limit: int = 500) -> List[Dict]:
        """Fetch list of mandis from data.gov.in API."""
        if not DATA_GOV_API_KEY:
            logger.error("DATA_GOV_API_KEY is not configured")
            return []
        params = {
            "api-key": DATA_GOV_API_KEY,
            "format": "json",
            "offset": "0",
            "limit": str(min(limit, 1000)),
        }

        if state:
            params["filters[State]"] = state.strip()

        env_resource = (os.getenv("DATA_GOV_MANDI_RESOURCE_ID") or "").strip()
        candidates = [env_resource, RESOURCES.get("mandi_list", ""), RESOURCES["daily_prices"]]
        resource_ids = []
        for rid in candidates:
            if rid and rid not in resource_ids:
                resource_ids.append(rid)

        for rid in resource_ids:
            url = f"{DATA_GOV_BASE_URL}/{rid}"
            try:
                response = await self.client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                status = str(data.get("status", "")).lower()
                message = str(data.get("message", "")).lower()
                records = data.get("records", []) or []

                if status == "error" or "meta not found" in message:
                    logger.warning(
                        "Mandi resource %s returned error status='%s' message='%s'; trying next candidate",
                        rid,
                        status,
                        message,
                    )
                    continue

                mandis = {}
                for rec in records:
                    market = rec.get("market") or rec.get("Market") or ""
                    state_name = rec.get("state") or rec.get("State") or ""
                    district_name = rec.get("district") or rec.get("District") or ""

                    key = (market, state_name, district_name)
                    if key not in mandis and market:
                        mandis[key] = {
                            "name": market,
                            "state": state_name,
                            "district": district_name,
                            "source": "data.gov.in",
                        }

                if mandis:
                    return list(mandis.values())[:limit]

            except Exception as e:
                logger.warning("Mandi resource %s failed: %s", rid, e)

        # Real fallback: derive mandi directory from live daily price records.
        prices = await self.fetch_daily_prices(state=state, limit=min(max(limit, 300), 1000))
        if not prices:
            return []

        mandis = {}
        for price in prices:
            market = price.get("market", "")
            state_name = price.get("state", "")
            district_name = price.get("district", "")
            key = (market, state_name, district_name)
            if market and key not in mandis:
                mandis[key] = {
                    "name": market,
                    "state": state_name,
                    "district": district_name,
                    "source": "data.gov.in_daily_prices",
                }

        return list(mandis.values())[:limit]


class MandiDataSyncService:
    """Syncs real-time mandi data to MongoCollections and Qdrant."""

    def __init__(self):
        self.fetcher = MandiDataFetcher()

    async def close(self):
        await self.fetcher.close()

    # ── Sync Prices to MongoCollections ─────────────────────────────────

    async def sync_prices_to_mongo(
        self, db, states: List[str] = None, commodity: str = None
    ) -> dict:
        """Fetch real-time prices and store in MongoCollections."""
        
        if commodity:
            prices = await self.fetcher.fetch_commodity_prices_all_india(commodity)
        else:
            prices = await self.fetcher.fetch_bulk_prices(states=states)
        
        if not prices:
            return {"synced": 0, "message": "No prices fetched from API"}
        
        batch_size = 400  # MongoCollections batch limit is 500
        synced = 0
        now = datetime.now(timezone.utc).isoformat()
        
        for i in range(0, len(prices), batch_size):
            chunk = prices[i:i + batch_size]
            batch = db.batch()
            
            for price in chunk:
                price_id = uuid.uuid4().hex
                doc_ref = db.collection("market_prices").document(price_id)
                
                batch.set(doc_ref, {
                    "crop_name": price["commodity"],
                    "variety": price.get("variety", ""),
                    "mandi_name": price["market"],
                    "state": price["state"],
                    "district": price.get("district", ""),
                    "min_price": price["min_price"],
                    "max_price": price["max_price"],
                    "modal_price": price["modal_price"],
                    "unit": "quintal",
                    "date": price.get("arrival_date", now[:10]),
                    "source": price.get("source", "data.gov.in"),
                    "created_at": now,
                })
                synced += 1
            
            await batch.commit()
        
        logger.info(f"Synced {synced} market prices to MongoCollections")
        return {"synced": synced, "source": "data.gov.in", "timestamp": now}

    # ── Sync Mandis to MongoCollections ─────────────────────────────────

    async def sync_mandis_to_mongo(self, db, states: List[str] = None) -> dict:
        """Fetch and sync mandi directory to MongoCollections."""
        
        if not states:
            states = INDIAN_STATES
        
        all_mandis = []
        for state in states:
            mandis = await self.fetcher.fetch_mandi_list(state=state, limit=500)
            all_mandis.extend(mandis)
            await asyncio.sleep(0.1)  # Rate limiting
        
        # Deduplicate
        seen = set()
        unique_mandis = []
        for m in all_mandis:
            key = (m["name"], m["state"], m["district"])
            if key not in seen:
                seen.add(key)
                unique_mandis.append(m)
        
        now = datetime.now(timezone.utc).isoformat()
        synced = 0
        batch_size = 400
        
        for i in range(0, len(unique_mandis), batch_size):
            chunk = unique_mandis[i:i + batch_size]
            batch = db.batch()
            
            for mandi in chunk:
                mandi_id = uuid.uuid4().hex
                doc_ref = db.collection("mandis").document(mandi_id)
                
                batch.set(doc_ref, {
                    "name": mandi["name"],
                    "state": mandi["state"],
                    "district": mandi.get("district", ""),
                    "source": mandi.get("source", "data.gov.in"),
                    "created_at": now,
                    "updated_at": now,
                })
                synced += 1
            
            await batch.commit()
        
        logger.info(f"Synced {synced} mandis to MongoCollections")
        return {"synced": synced, "total_fetched": len(all_mandis), "unique": len(unique_mandis)}

    # ── Embed Prices into Qdrant ─────────────────────────────────

    async def embed_prices_to_qdrant(self, prices: List[Dict] = None) -> dict:
        """Convert market prices to embeddings and store in Qdrant for knowledge base."""
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.models import PointStruct, Distance, VectorParams
            from fastembed import TextEmbedding
            from shared.core.config import get_settings
            from shared.core.constants import Qdrant, EMBEDDING_DIM
            
            settings = get_settings()
            client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
            model = TextEmbedding(model_name="sentence-transformers/paraphrase-multilingual-mpnet-base-v2")
            
            # Ensure collection exists
            existing = [c.name for c in client.get_collections().collections]
            if Qdrant.MARKET_KNOWLEDGE not in existing:
                client.create_collection(
                    collection_name=Qdrant.MARKET_KNOWLEDGE,
                    vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
                )
            
            if not prices:
                return {"embedded": 0, "message": "No prices to embed"}
            
            # Group by commodity for summary embeddings
            commodity_summaries = {}
            for p in prices:
                crop = p.get("commodity", p.get("crop_name", ""))
                if crop not in commodity_summaries:
                    commodity_summaries[crop] = {
                        "prices": [],
                        "states": set(),
                        "mandis": set(),
                    }
                commodity_summaries[crop]["prices"].append(p.get("modal_price", 0))
                commodity_summaries[crop]["states"].add(p.get("state", ""))
                commodity_summaries[crop]["mandis"].add(p.get("market", p.get("mandi_name", "")))
            
            points = []
            for crop, data in commodity_summaries.items():
                if not crop or not data["prices"]:
                    continue
                    
                avg_price = sum(data["prices"]) / len(data["prices"])
                min_price = min(data["prices"])
                max_price = max(data["prices"])
                
                text = (
                    f"{crop} market price: Average ₹{avg_price:.0f}/quintal, "
                    f"Range ₹{min_price:.0f}-₹{max_price:.0f}/quintal. "
                    f"Available in {len(data['mandis'])} mandis across {len(data['states'])} states: "
                    f"{', '.join(list(data['states'])[:5])}."
                )
                
                text_hi = (
                    f"{crop} का मंडी भाव: औसत ₹{avg_price:.0f}/क्विंटल, "
                    f"₹{min_price:.0f}-₹{max_price:.0f}/क्विंटल. "
                    f"{len(data['mandis'])} मंडियों में उपलब्ध।"
                )
                
                vector = next(model.embed([text])).tolist()
                points.append(PointStruct(
                    id=uuid.uuid4().hex,
                    vector=vector,
                    payload={
                        "text": text,
                        "text_hi": text_hi,
                        "commodity": crop,
                        "avg_price": avg_price,
                        "min_price": min_price,
                        "max_price": max_price,
                        "mandi_count": len(data["mandis"]),
                        "state_count": len(data["states"]),
                        "type": "market_price",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                ))
            
            if points:
                client.upsert(collection_name=Qdrant.MARKET_KNOWLEDGE, points=points)
            
            # Also embed MSP knowledge
            msp_points = []
            for crop, msp in MSP_PRICES.items():
                text = f"MSP (Minimum Support Price) of {crop} for 2024-25 is ₹{msp}/quintal. Government guarantees this price."
                text_hi = f"{crop} का MSP (न्यूनतम समर्थन मूल्य) 2024-25 के लिए ₹{msp}/क्विंटल है। सरकार यह मूल्य गारंटी करती है।"
                
                vector = next(model.embed([text])).tolist()
                msp_points.append(PointStruct(
                    id=uuid.uuid4().hex,
                    vector=vector,
                    payload={
                        "text": text,
                        "text_hi": text_hi,
                        "commodity": crop,
                        "msp_price": msp,
                        "type": "msp_price",
                        "season": "2024-25",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                ))
            
            if msp_points:
                client.upsert(collection_name=Qdrant.MARKET_KNOWLEDGE, points=msp_points)
            
            total = len(points) + len(msp_points)
            logger.info(f"Embedded {total} market knowledge points to Qdrant")
            return {"embedded": total, "commodity_summaries": len(points), "msp_entries": len(msp_points)}
        
        except ImportError as e:
            logger.warning(f"Qdrant/SentenceTransformer not available: {e}")
            return {"embedded": 0, "message": f"Dependencies not available: {e}"}
        except Exception as e:
            logger.error(f"Error embedding prices: {e}")
            return {"embedded": 0, "error": str(e)}

    # ── Full Sync Pipeline ───────────────────────────────────────

    async def full_sync(self, db, states: List[str] = None) -> dict:
        """Complete sync: Fetch → Store in MongoCollections → Embed in Qdrant."""
        
        price_result = await self.sync_prices_to_mongo(db, states=states)
        mandi_result = await self.sync_mandis_to_mongo(db, states=states)
        
        # Now embed to Qdrant
        # Re-fetch from MongoCollections for embedding
        prices_for_embed = []
        docs = [d async for d in db.collection("market_prices").limit(2000).stream()]
        for doc in docs:
            prices_for_embed.append(doc.to_dict())
        
        embed_result = await self.embed_prices_to_qdrant(prices_for_embed)
        
        return {
            "prices": price_result,
            "mandis": mandi_result,
            "embeddings": embed_result,
            "synced_at": datetime.now(timezone.utc).isoformat(),
        }


def get_msp_price(commodity: str) -> Optional[float]:
    """Get MSP for a commodity."""
    commodity = commodity.strip()
    for crop, price in MSP_PRICES.items():
        if commodity.lower() in crop.lower() or crop.lower() in commodity.lower():
            return price
    return None


def get_all_msp_prices() -> dict:
    """Get all MSP prices."""
    return MSP_PRICES

