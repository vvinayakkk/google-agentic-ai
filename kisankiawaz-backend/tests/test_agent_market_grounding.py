"""Regression tests for agent market grounding and Qdrant fallback behavior."""

from __future__ import annotations

import importlib
import sys
import types
from dataclasses import dataclass
from typing import Any

import pytest

from shared.core.constants import QdrantCollections


class FakeDoc:
    def __init__(self, data: dict[str, Any]):
        self._data = data

    def to_dict(self) -> dict[str, Any]:
        return dict(self._data)


class FakeQuery:
    def __init__(self, rows: list[dict[str, Any]]):
        self._rows = rows
        self._filters: list[tuple[str, Any]] = []
        self._limit: int | None = None

    def where(self, field: str, op: str, value: Any) -> "FakeQuery":
        assert op == "=="
        self._filters.append((field, value))
        return self

    def limit(self, limit_count: int) -> "FakeQuery":
        self._limit = limit_count
        return self

    def stream(self):
        rows = self._rows
        for field, value in self._filters:
            rows = [row for row in rows if row.get(field) == value]
        if self._limit is not None:
            rows = rows[: self._limit]
        for row in rows:
            yield FakeDoc(row)


class FakeCollection:
    def __init__(self, rows: list[dict[str, Any]]):
        self._rows = rows

    def where(self, field: str, op: str, value: Any) -> FakeQuery:
        return FakeQuery(self._rows).where(field, op, value)

    def limit(self, limit_count: int) -> FakeQuery:
        return FakeQuery(self._rows).limit(limit_count)


class FakeDB:
    def __init__(self, by_collection: dict[str, list[dict[str, Any]]]):
        self._by_collection = by_collection

    def collection(self, name: str) -> FakeCollection:
        return FakeCollection(self._by_collection.get(name, []))


def _load_market_tools_module():
    if "services.embedding_service" not in sys.modules:
        stub = types.ModuleType("services.embedding_service")

        class DummyEmbeddingService:  # pragma: no cover - import wiring only
            pass

        stub.EmbeddingService = DummyEmbeddingService
        sys.modules["services.embedding_service"] = stub

    if "shared.db" not in sys.modules:
        shared_db_stub = types.ModuleType("shared.db")
        shared_db_stub.__path__ = []
        sys.modules["shared.db"] = shared_db_stub

    if "shared.db.mongodb" not in sys.modules:
        mongo_stub = types.ModuleType("shared.db.mongodb")

        def _placeholder_get_db():
            return None

        mongo_stub.get_db = _placeholder_get_db
        sys.modules["shared.db.mongodb"] = mongo_stub
        sys.modules["shared.db"].mongodb = mongo_stub

    module_name = "services.agent.tools.market_tools"
    if module_name in sys.modules:
        return importlib.reload(sys.modules[module_name])
    return importlib.import_module(module_name)


def test_get_live_mandi_prices_blocks_cross_state_fallback_when_state_known(monkeypatch):
    mt = _load_market_tools_module()
    fake_db = FakeDB(
        {
            "ref_mandi_prices": [
                {
                    "market": "Kolkata",
                    "state": "West Bengal",
                    "district": "Kolkata",
                    "commodity": "Tomato",
                    "arrival_date": "2025-01-15",
                    "modal_price": 2100,
                }
            ]
        }
    )
    monkeypatch.setattr(mt, "get_db", lambda: fake_db)
    monkeypatch.setenv("DATA_GOV_API_KEY", "")

    result = mt.get_live_mandi_prices(
        crop_name="Tomato",
        state="Maharashtra",
        district="Pune",
        limit=10,
        strict_locality=True,
    )

    assert result["found"] is False
    assert result["prices"] == []
    assert result["fallback_mode"] == "state_strict_no_match"
    assert result["requested_filters"]["state"] == "Maharashtra"


def test_get_live_mandi_prices_relaxes_district_within_same_state(monkeypatch):
    mt = _load_market_tools_module()
    fake_db = FakeDB(
        {
            "ref_mandi_prices": [
                {
                    "market": "Nashik",
                    "state": "Maharashtra",
                    "district": "Nashik",
                    "commodity": "Tomato",
                    "arrival_date": "2025-01-15",
                    "modal_price": 1900,
                }
            ]
        }
    )
    monkeypatch.setattr(mt, "get_db", lambda: fake_db)
    monkeypatch.setenv("DATA_GOV_API_KEY", "")

    result = mt.get_live_mandi_prices(
        crop_name="Tomato",
        state="Maharashtra",
        district="Pune",
        limit=10,
        strict_locality=True,
    )

    assert result["found"] is True
    assert result["fallback_mode"] == "district_relaxed_state_strict"
    assert all(str(r.get("state", "")).lower() == "maharashtra" for r in result["prices"])


def test_get_live_mandis_blocks_cross_state_fallback_when_state_known(monkeypatch):
    mt = _load_market_tools_module()
    fake_db = FakeDB(
        {
            "ref_mandi_directory": [
                {
                    "name": "Kolkata Mandi",
                    "state": "West Bengal",
                    "district": "Kolkata",
                }
            ]
        }
    )
    monkeypatch.setattr(mt, "get_db", lambda: fake_db)
    monkeypatch.setenv("DATA_GOV_API_KEY", "")

    result = mt.get_live_mandis(state="Maharashtra", limit=10, strict_locality=True)

    assert result["found"] is False
    assert result["mandis"] == []
    assert result["fallback_mode"] == "state_strict_no_match"


@dataclass
class FakeVector:
    values: list[float]

    def tolist(self) -> list[float]:
        return list(self.values)


class FakeModel:
    def embed(self, _texts):
        yield FakeVector([0.1, 0.2, 0.3])


@dataclass
class FakePoint:
    payload: dict[str, Any]
    score: float


@dataclass
class FakeResult:
    points: list[FakePoint]


class FakeQdrantClient:
    def __init__(self):
        self.calls: list[str] = []

    def query_points(self, collection_name: str, query: list[float], limit: int):
        self.calls.append(collection_name)
        assert query == [0.1, 0.2, 0.3]
        assert limit == 5
        if collection_name == QdrantCollections.MANDI_PRICE_INTELLIGENCE:
            return FakeResult(
                points=[
                    FakePoint(
                        payload={"text": "Tomato price in Maharashtra mandi", "state": "Maharashtra"},
                        score=0.92,
                    )
                ]
            )
        raise RuntimeError(f"Collection '{collection_name}' not found")


def test_embedding_search_uses_market_collection_alias_fallback():
    pytest.importorskip("qdrant_client")
    pytest.importorskip("fastembed")
    embedding_module = importlib.import_module("services.agent.services.embedding_service")
    EmbeddingService = embedding_module.EmbeddingService

    svc = EmbeddingService()
    svc.client = FakeQdrantClient()
    svc.model = FakeModel()

    results = svc.search(QdrantCollections.MARKET_KNOWLEDGE, "tomato mandi rate", top_k=5)

    assert svc.client.calls[0] == QdrantCollections.MANDI_PRICE_INTELLIGENCE
    assert results
    assert results[0]["text"].startswith("Tomato price")
