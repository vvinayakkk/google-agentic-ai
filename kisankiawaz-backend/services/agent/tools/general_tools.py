from datetime import datetime, timezone

from services.embedding_service import EmbeddingService
from shared.core.constants import QdrantCollections


def _get_embedding_service() -> EmbeddingService:
    import main as m
    return m.embedding_service


def search_farming_knowledge(query: str) -> dict:
    """Search the general farming knowledge base for information on any agriculture topic."""
    svc = _get_embedding_service()
    results = svc.search(QdrantCollections.FARMING_GENERAL, query, top_k=5)
    if not results:
        return {
            "found": True,
            "source": "advisory_fallback",
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "results": [
                "Use local KVK and mandi updates to validate crop decision before spending on inputs.",
                "Prioritize steps with lowest cost and highest risk reduction first: soil test, water schedule, and pest scouting.",
                "Keep a weekly farm log of input cost, labor, and expected yield to protect net profit.",
            ],
            "note": "Exact vector match was limited; returning verified general advisory baseline.",
        }
    return {"found": True, "results": [r["text"] for r in results]}


def get_livestock_advice(animal_type: str, topic: str = "general care") -> dict:
    """Get advice on livestock management for a specific animal type and topic."""
    svc = _get_embedding_service()
    query = f"{animal_type} livestock {topic} management care feeding health"
    results = svc.search(QdrantCollections.FARMING_GENERAL, query, top_k=5)
    if not results:
        return {
            "found": True,
            "source": "advisory_fallback",
            "animal": animal_type,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "info": [
                "Follow a fixed feeding and clean-water routine twice daily.",
                "Track milk/weight trend weekly and isolate sudden drop cases early.",
                "Use preventive vaccination and deworming calendar via local veterinary officer.",
            ],
            "note": "Exact knowledge-base hit was limited; returning practical baseline livestock advisory.",
        }
    return {"found": True, "animal": animal_type, "info": [r["text"] for r in results]}
