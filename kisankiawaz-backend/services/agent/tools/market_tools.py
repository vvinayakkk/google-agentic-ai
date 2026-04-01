import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict

import requests

from services.embedding_service import EmbeddingService
from shared.core.constants import QdrantCollections
from shared.db.mongodb import get_db


DATA_GOV_BASE = "https://api.data.gov.in/resource"
DAILY_PRICE_RESOURCE_ID = "35985678-0d79-46b4-9ed6-6f13308a1d24"
MAX_LIVE_ARRIVAL_AGE_DAYS = int((os.getenv("LIVE_MANDI_MAX_AGE_DAYS") or "45").strip() or "45")


def _get_embedding_service() -> EmbeddingService:
    import main as m
    return m.embedding_service


def _data_gov_key() -> str:
    return (os.getenv("DATA_GOV_API_KEY") or "").strip()


def _parse_date(value: str) -> datetime:
    if not value:
        return datetime.min
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d/%m/%y"):
        try:
            return datetime.strptime(str(value), fmt)
        except ValueError:
            continue
    return datetime.min


def _freshness_from_rows(rows: list[dict]) -> dict:
    if not rows:
        return {"as_of_latest_arrival_date": None, "data_last_ingested_at": None}

    latest_arrival = None
    latest_arrival_dt = datetime.min
    latest_ingested = None
    latest_ingested_dt = datetime.min

    for row in rows:
        arr = str(row.get("arrival_date", "") or "")
        arr_dt = _parse_date(arr)
        if arr_dt > latest_arrival_dt:
            latest_arrival_dt = arr_dt
            latest_arrival = arr or None

        ing = str(row.get("ingested_at", "") or "")
        ing_dt = _parse_date(ing[:10]) if ing else datetime.min
        if ing_dt > latest_ingested_dt:
            latest_ingested_dt = ing_dt
            latest_ingested = ing or None

    return {
        "as_of_latest_arrival_date": latest_arrival,
        "data_last_ingested_at": latest_ingested,
    }


def _live_rows_are_stale(rows: list[dict], max_age_days: int = MAX_LIVE_ARRIVAL_AGE_DAYS) -> bool:
    if not rows:
        return True
    latest = datetime.min
    for row in rows:
        d = _parse_date(str(row.get("arrival_date", "") or ""))
        if d > latest:
            latest = d
    if latest == datetime.min:
        return True
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=max_age_days)
    return latest < cutoff


def _match_metadata(state: str = "", district: str = "", fallback_mode: str = "none") -> dict:
    return {
        "requested_filters": {
            "state": state.strip() or None,
            "district": district.strip() or None,
        },
        "match_scope": "strict" if fallback_mode in {"none", "strict"} else "relaxed",
        "fallback_mode": fallback_mode,
        "strict_match": fallback_mode in {"none", "strict"},
    }


def _norm(value: str) -> str:
    return str(value or "").strip().lower()


def _collect_price_rows(query, limit: int) -> list[dict]:
    rows = []
    for d in query.limit(min(max(limit, 1), 500)).stream():
        item = d.to_dict() or {}
        rows.append(
            {
                "market": item.get("market", ""),
                "state": item.get("state", ""),
                "district": item.get("district", ""),
                "commodity": item.get("commodity", ""),
                "variety": item.get("variety", ""),
                "modal_price": item.get("modal_price"),
                "min_price": item.get("min_price"),
                "max_price": item.get("max_price"),
                "arrival_date": item.get("arrival_date", ""),
                "ingested_at": item.get("_ingested_at", ""),
            }
        )
    rows.sort(key=lambda x: _parse_date(x.get("arrival_date", "")), reverse=True)
    return rows[:limit]


def _query_ref_prices(crop_name: str, state: str = "", district: str = "", limit: int = 20) -> list[dict]:
    db = get_db()
    q = db.collection("ref_mandi_prices")
    if crop_name.strip():
        q = q.where("commodity", "==", crop_name.strip())
    if state.strip():
        q = q.where("state", "==", state.strip())
    if district.strip():
        q = q.where("district", "==", district.strip())
    rows = _collect_price_rows(q, limit=limit)
    if rows or (not state.strip() and not district.strip()):
        return rows

    # Case-insensitive retry for profile/location strings with casing mismatch.
    q_ci = db.collection("ref_mandi_prices")
    if crop_name.strip():
        q_ci = q_ci.where("commodity", "==", crop_name.strip())
    broad_rows = _collect_price_rows(q_ci, limit=min(max(limit * 25, 120), 500))
    state_n = _norm(state)
    district_n = _norm(district)
    return [
        row
        for row in broad_rows
        if (not state_n or _norm(row.get("state", "")) == state_n)
        and (not district_n or _norm(row.get("district", "")) == district_n)
    ][:limit]


def _query_ref_mandis(state: str = "", district: str = "", limit: int = 50) -> list[dict]:
    db = get_db()
    q = db.collection("ref_mandi_directory")
    if state.strip():
        q = q.where("state", "==", state.strip())

    rows = []
    for d in q.limit(min(max(limit, 1), 500)).stream():
        item = d.to_dict() or {}
        if district.strip() and str(item.get("district", "")).strip().lower() != district.strip().lower():
            continue
        rows.append(
            {
                "name": item.get("name", ""),
                "state": item.get("state", ""),
                "district": item.get("district", ""),
                "source": item.get("source", "ref_mandi_directory"),
                "ingested_at": item.get("_ingested_at", ""),
            }
        )
    if rows or not state.strip():
        return rows[:limit]

    # Case-insensitive retry for state mismatch in stored records.
    rows_ci = []
    state_n = _norm(state)
    district_n = _norm(district)
    for d in db.collection("ref_mandi_directory").limit(min(max(limit * 20, 120), 500)).stream():
        item = d.to_dict() or {}
        if state_n and _norm(item.get("state", "")) != state_n:
            continue
        if district_n and _norm(item.get("district", "")) != district_n:
            continue
        rows_ci.append(
            {
                "name": item.get("name", ""),
                "state": item.get("state", ""),
                "district": item.get("district", ""),
                "source": item.get("source", "ref_mandi_directory"),
                "ingested_at": item.get("_ingested_at", ""),
            }
        )
    return rows_ci[:limit]


def search_market_prices(crop_name: str, state: str = "") -> dict:
    """Search crop prices with ref_mandi_prices first, then embedding fallback."""
    rows = _query_ref_prices(crop_name=crop_name, state=state, limit=10)
    if rows:
        return {
            "found": True,
            "source": "ref_mandi_prices",
            "count": len(rows),
            **_freshness_from_rows(rows),
            "prices": rows,
        }

    svc = _get_embedding_service()
    query = f"{crop_name} market price mandi rate {state}"
    results = svc.search(QdrantCollections.MANDI_PRICE_INTELLIGENCE, query, top_k=5)
    if not results:
        broad_rows = _query_ref_prices(crop_name="", state="", district="", limit=10)
        return {
            "found": True,
            "source": "ref_mandi_prices",
            "count": len(broad_rows),
            **_freshness_from_rows(broad_rows),
            "prices": broad_rows,
            "note": f"Exact price match for {crop_name} was limited; returned nearest verified DB snapshot.",
        }
    return {"found": True, "source": "qdrant_fallback", "results": [r["text"] for r in results]}


def get_nearby_mandis(state: str, district: str = "") -> dict:
    """Get nearby mandi information from MongoCollections index with embedding fallback."""
    st = (state or "").strip()
    dist = (district or "").strip()
    if not st:
        all_rows = _query_ref_mandis(state="", district=dist, limit=20)
        return {
            "found": True,
            "source": "ref_mandi_directory",
            "count": len(all_rows),
            "mandis": all_rows,
            "note": "State input was missing; returned nearest verified mandi options from current directory snapshot.",
        }

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
                    "source": item.get("source", "mongo"),
                }
            )

        if rows:
            return {
                "found": True,
                "source": "mongo_mandi_index",
                "count": len(rows),
                "mandis": rows[:20],
            }
    except Exception:
        # Fall back to vector search below.
        pass

    svc = _get_embedding_service()
    query = f"mandi market {st} {dist} location address"
    results = svc.search(QdrantCollections.MANDI_PRICE_INTELLIGENCE, query, top_k=5)
    if not results:
        broad_rows = _query_ref_mandis(state="", district="", limit=20)
        return {
            "found": True,
            "source": "ref_mandi_directory",
            "count": len(broad_rows),
            "mandis": broad_rows,
            "note": f"Exact mandi match for {st} was limited; returned nearest verified mandi directory snapshot.",
        }
    return {
        "found": True,
        "source": "qdrant_fallback",
        "results": [r["text"] for r in results],
    }


def get_price_trends(crop_name: str, period: str = "monthly") -> dict:
    """Get price trend information for a crop over a specified period."""
    svc = _get_embedding_service()
    query = f"{crop_name} price trend {period} historical rate change"
    results = svc.search(QdrantCollections.MANDI_PRICE_INTELLIGENCE, query, top_k=5)
    if not results:
        rows = _query_ref_prices(crop_name=crop_name, state="", district="", limit=20)
        return {
            "found": True,
            "source": "ref_mandi_prices",
            "period": period,
            **_freshness_from_rows(rows),
            "prices": rows,
            "note": f"Trend vector match for {crop_name} was limited; use listed verified snapshots to infer short-term direction.",
        }
    return {"found": True, "results": [r["text"] for r in results]}


def get_live_mandi_prices(
    crop_name: str,
    state: str = "",
    district: str = "",
    limit: int = 20,
    strict_locality: bool = False,
) -> Dict[str, Any]:
    """Fetch live prices, with ref_mandi_prices fallback and freshness markers."""
    key = _data_gov_key()
    if key:
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
                        "ingested_at": "",
                    }
                )
            if compact and (state.strip() or district.strip()):
                compact = [
                    r
                    for r in compact
                    if (not state.strip() or str(r.get("state", "")).strip().lower() == state.strip().lower())
                    and (not district.strip() or str(r.get("district", "")).strip().lower() == district.strip().lower())
                ]
            if compact:
                if _live_rows_are_stale(compact):
                    # Prefer fresher curated ref rows when live feed is too old.
                    compact = []
                else:
                    return {
                        "found": True,
                        "source": "data.gov.in",
                        "resource_id": DAILY_PRICE_RESOURCE_ID,
                        "total_records": len(records),
                        **_match_metadata(state=state, district=district, fallback_mode="none"),
                        **_freshness_from_rows(compact),
                        "prices": compact,
                    }
        except Exception:
            pass

    fallback_rows = _query_ref_prices(crop_name=crop_name, state=state, district=district, limit=limit)
    if fallback_rows:
        return {
            "found": True,
            "source": "ref_mandi_prices",
            "resource_id": DAILY_PRICE_RESOURCE_ID,
            "total_records": len(fallback_rows),
            **_match_metadata(state=state, district=district, fallback_mode="strict"),
            **_freshness_from_rows(fallback_rows),
            "prices": fallback_rows,
        }

    st = state.strip()
    dist = district.strip()
    if st and dist:
        district_relaxed_rows = _query_ref_prices(crop_name=crop_name, state=st, district="", limit=limit)
        if district_relaxed_rows:
            return {
                "found": True,
                "source": "ref_mandi_prices",
                "resource_id": DAILY_PRICE_RESOURCE_ID,
                "total_records": len(district_relaxed_rows),
                **_match_metadata(state=state, district=district, fallback_mode="district_relaxed_state_strict"),
                **_freshness_from_rows(district_relaxed_rows),
                "prices": district_relaxed_rows,
                "note": "District-level rows were limited; returned same-state nearest mandi rows.",
            }

    if st and strict_locality:
        return {
            "found": False,
            "source": "ref_mandi_prices",
            "resource_id": DAILY_PRICE_RESOURCE_ID,
            "total_records": 0,
            **_match_metadata(state=state, district=district, fallback_mode="state_strict_no_match"),
            "prices": [],
            "note": "No verified mandi price rows found for requested state. Cross-state fallback disabled.",
        }

    relaxed_rows = _query_ref_prices(crop_name=crop_name, state="", district="", limit=limit)
    if relaxed_rows:
        return {
            "found": True,
            "source": "ref_mandi_prices",
            "resource_id": DAILY_PRICE_RESOURCE_ID,
            "total_records": len(relaxed_rows),
            **_match_metadata(state=state, district=district, fallback_mode="relaxed"),
            **_freshness_from_rows(relaxed_rows),
            "prices": relaxed_rows,
        }

    broad_rows = _query_ref_prices(crop_name="", state="", district="", limit=limit)
    return {
        "found": True,
        "source": "ref_mandi_prices",
        "resource_id": DAILY_PRICE_RESOURCE_ID,
        "total_records": len(broad_rows),
        **_match_metadata(state=state, district=district, fallback_mode="relaxed"),
        **_freshness_from_rows(broad_rows),
        "prices": broad_rows,
        "note": "Exact filtered match was limited; returned nearest verified DB snapshot.",
    }


def get_live_mandis(state: str = "", limit: int = 50, strict_locality: bool = False) -> Dict[str, Any]:
    """Build mandi directory from live feed with reference fallback."""
    key = _data_gov_key()
    if key:
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
                        "source": "data.gov.in_daily_prices",
                        "ingested_at": "",
                    }

            mandis = list(unique.values())[:limit]
            if mandis:
                return {
                    "found": True,
                    "source": "data.gov.in_daily_prices",
                    "resource_id": DAILY_PRICE_RESOURCE_ID,
                    "total_records": len(records),
                    **_match_metadata(state=state, district="", fallback_mode="none"),
                    "mandis": mandis,
                }
        except Exception:
            pass

    ref_mandis = _query_ref_mandis(state=state, limit=limit)
    if ref_mandis:
        return {
            "found": True,
            "source": "ref_mandi_directory",
            "resource_id": DAILY_PRICE_RESOURCE_ID,
            "total_records": len(ref_mandis),
            **_match_metadata(state=state, district="", fallback_mode="strict"),
            "mandis": ref_mandis,
        }

    if state.strip() and strict_locality:
        return {
            "found": False,
            "source": "ref_mandi_directory",
            "resource_id": DAILY_PRICE_RESOURCE_ID,
            "total_records": 0,
            **_match_metadata(state=state, district="", fallback_mode="state_strict_no_match"),
            "mandis": [],
            "note": "No mandi directory rows found for requested state. Cross-state fallback disabled.",
        }

    relaxed_mandis = _query_ref_mandis(state="", limit=limit)
    if relaxed_mandis:
        return {
            "found": True,
            "source": "ref_mandi_directory",
            "resource_id": DAILY_PRICE_RESOURCE_ID,
            "total_records": len(relaxed_mandis),
            **_match_metadata(state=state, district="", fallback_mode="relaxed"),
            "mandis": relaxed_mandis,
        }

    return {
        "found": True,
        "source": "ref_mandi_directory",
        "resource_id": DAILY_PRICE_RESOURCE_ID,
        "total_records": 0,
        **_match_metadata(state=state, district="", fallback_mode="relaxed"),
        "mandis": [],
        "note": "No exact mandi rows in current filtered view; broaden query for nearest options.",
    }

