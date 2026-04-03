"""Soil moisture integration using data.gov.in APIs."""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx


SOIL_RESOURCE_ID = "4554a3c8-74e3-4f93-8727-8fd92161e345"
DATA_GOV_BASE_URL = "https://api.data.gov.in/resource"
logger = logging.getLogger(__name__)


def _parse_date(value: str) -> datetime:
    if not value:
        return datetime.min

    for fmt in (
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%Y/%m/%d",
    ):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue

    return datetime.min


def _find_moisture_value(record: Dict[str, Any]) -> Optional[Any]:
    for key, value in record.items():
        k = key.lower()
        if "moisture" in k:
            return value
    return None


def _extract_key_metrics(record: Dict[str, Any]) -> Dict[str, Any]:
    aliases = {
        "soil_moisture": ["moisture"],
        "ph": ["ph", "ph_level"],
        "nitrogen": ["nitrogen", "\bn\b"],
        "phosphorus": ["phosphorus", "phosphate", "\bp\b", "p2o5"],
        "potassium": ["potassium", "\bk\b", "k2o"],
        "electrical_conductivity": ["electrical_conductivity", "ec"],
        "organic_carbon": ["organic_carbon", "organic matter", "oc"],
        "soil_temperature": ["soil_temperature", "soil temp", "temperature"],
    }

    out: Dict[str, Any] = {}
    lowered_items = [(str(k).lower(), v) for k, v in record.items()]

    for metric, keys in aliases.items():
        for key, value in lowered_items:
            matched = False
            for token in keys:
                if token.startswith("\\b"):
                    if re.search(token, key):
                        matched = True
                        break
                elif token in key:
                    matched = True
                    break
            if matched:
                out[metric] = value
                break

    return out


async def get_soil_moisture_data(
    state: str,
    district: Optional[str] = None,
    year: Optional[str] = None,
    month: Optional[str] = None,
    limit: int = 1000,
) -> Dict[str, Any]:
    def _empty_response(note: str) -> Dict[str, Any]:
        return {
            "source": "data.gov.in",
            "resource_id": SOIL_RESOURCE_ID,
            "total_records": 0,
            "latest_records": [],
            "count": 0,
            "note": note,
        }

    async def _fetch(params: Dict[str, str]) -> Dict[str, Any]:
        url = f"{DATA_GOV_BASE_URL}/{SOIL_RESOURCE_ID}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            payload_local = response.json()
        if str(payload_local.get("status", "")).lower() == "error":
            raise ValueError(payload_local.get("message", "data.gov.in returned error"))
        return payload_local

    api_key = (os.getenv("DATA_GOV_API_KEY") or "").strip()
    if not api_key:
        return _empty_response("DATA_GOV_API_KEY is not configured")

    params_base = {
        "api-key": api_key,
        "format": "json",
        "offset": "0",
        "limit": str(min(max(limit, 1), 1000)),
        "filters[State]": state.strip(),
    }

    params = dict(params_base)
    if district and district.strip():
        params["filters[District]"] = district.strip()
    if year and year.strip():
        params["filters[Year]"] = year.strip()
    if month and month.strip():
        params["filters[Month]"] = month.strip().capitalize()

    # First try: state + district (if provided). On bad-request / API errors,
    # gracefully retry with state-only instead of failing the whole flow.
    try:
        payload = await _fetch(params)
    except Exception as exc:  # noqa: BLE001
        if district and district.strip():
            try:
                logger.warning(
                    "Soil moisture fetch failed for state=%s district=%s; retrying state-only. error=%r",
                    state,
                    district,
                    exc,
                )
                fallback_params = dict(params_base)
                if year and year.strip():
                    fallback_params["filters[Year]"] = year.strip()
                if month and month.strip():
                    fallback_params["filters[Month]"] = month.strip().capitalize()
                payload = await _fetch(fallback_params)
            except Exception as fallback_exc:  # noqa: BLE001
                logger.error(
                    "Soil moisture fallback failed for state=%s. error=%r",
                    state,
                    fallback_exc,
                )
                return _empty_response(
                    f"Unable to fetch soil moisture for district '{district}'."
                )
        else:
            logger.error("Soil moisture fetch failed for state=%s. error=%r", state, exc)
            return _empty_response("Unable to fetch soil moisture right now")

    raw_records = payload.get("records", []) or []

    # If a district was provided but returned no rows, retry state-level once.
    if not raw_records and district and district.strip():
        try:
            fallback_params = dict(params_base)
            if year and year.strip():
                fallback_params["filters[Year]"] = year.strip()
            if month and month.strip():
                fallback_params["filters[Month]"] = month.strip().capitalize()
            payload = await _fetch(fallback_params)
            raw_records = payload.get("records", []) or []
        except Exception as fallback_exc:  # noqa: BLE001
            logger.warning(
                "Soil moisture state-level fallback after empty district result failed. state=%s district=%s error=%r",
                state,
                district,
                fallback_exc,
            )

    latest_by_region: Dict[Tuple[str, str], Dict[str, Any]] = {}

    for record in raw_records:
        state_name = (record.get("State") or record.get("state") or "").strip()
        district_name = (record.get("District") or record.get("district") or "").strip()
        date_value = str(record.get("Date") or record.get("date") or "")
        key = (state_name, district_name)

        current = latest_by_region.get(key)
        if not current:
            latest_by_region[key] = record
            continue

        if _parse_date(date_value) > _parse_date(str(current.get("Date") or current.get("date") or "")):
            latest_by_region[key] = record

    latest_records: List[Dict[str, Any]] = []
    for rec in latest_by_region.values():
        parsed_metrics = _extract_key_metrics(rec)
        latest_records.append(
            {
                "state": rec.get("State") or rec.get("state"),
                "district": rec.get("District") or rec.get("district"),
                "date": rec.get("Date") or rec.get("date"),
                "soil_moisture": _find_moisture_value(rec),
                "metrics": parsed_metrics,
                "raw": rec,
            }
        )

    latest_records.sort(key=lambda x: _parse_date(str(x.get("date") or "")), reverse=True)

    return {
        "source": "data.gov.in",
        "resource_id": SOIL_RESOURCE_ID,
        "total_records": len(raw_records),
        "latest_records": latest_records,
        "count": len(latest_records),
    }
