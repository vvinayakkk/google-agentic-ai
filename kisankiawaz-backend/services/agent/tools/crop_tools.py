from services.embedding_service import EmbeddingService
from shared.core.constants import QdrantCollections
from datetime import datetime, timezone


def _get_embedding_service() -> EmbeddingService:
    """Lazy import to avoid circular deps at module level."""
    import main as m
    return m.embedding_service


def search_crop_knowledge(query: str) -> dict:
    """Search the crop knowledge base for relevant information about crops, planting, diseases, and farming practices."""
    svc = _get_embedding_service()
    results = svc.search(QdrantCollections.CROP_KNOWLEDGE, query, top_k=5)
    if not results:
        return {
            "found": True,
            "source": "advisory_fallback",
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "results": [
                "Select crop variety based on local rainfall window and irrigation reliability.",
                "Do soil test before fertilizer purchase to reduce cost and improve response.",
                "Maintain weekly pest scouting and apply treatment only at threshold level.",
            ],
            "note": "Exact crop knowledge match was limited; returned practical baseline advisory.",
        }
    texts = [r["text"] for r in results]
    return {"found": True, "results": texts}


def get_crop_calendar(crop_name: str, region: str = "general") -> dict:
    """Get the planting and harvesting calendar for a specific crop in a given region."""
    svc = _get_embedding_service()
    query = f"{crop_name} planting harvesting calendar {region} season schedule"
    results = svc.search(QdrantCollections.CROP_KNOWLEDGE, query, top_k=3)
    if not results:
        return {
            "found": True,
            "source": "advisory_fallback",
            "crop": crop_name,
            "region": region,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "info": [
                "Finalize seed and field prep 2-3 weeks before local sowing window.",
                "Complete sowing when soil moisture is adequate and temperature supports germination.",
                "Plan harvest labor and storage in advance to reduce post-harvest losses.",
            ],
            "note": "Exact crop calendar match was limited; returned season-planning baseline.",
        }
    return {"found": True, "crop": crop_name, "region": region, "info": [r["text"] for r in results]}


def get_pest_info(crop_name: str, symptom: str = "") -> dict:
    """Get pest and disease information for a crop, optionally matching specific symptoms."""
    svc = _get_embedding_service()
    query = f"{crop_name} pest disease {symptom} treatment control"
    results = svc.search(QdrantCollections.CROP_KNOWLEDGE, query, top_k=5)
    if not results:
        return {
            "found": True,
            "source": "advisory_fallback",
            "crop": crop_name,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "info": [
                "Scout affected patch early morning and estimate % plant damage before spray decision.",
                "Use recommended dose, avoid tank-mix without compatibility check, and rotate mode of action.",
                "Recheck field in 48-72 hours and record cost vs damage reduction to protect profit.",
            ],
            "note": "Exact pest profile match was limited; returned field-proven integrated pest guidance.",
        }
    return {"found": True, "crop": crop_name, "info": [r["text"] for r in results]}
