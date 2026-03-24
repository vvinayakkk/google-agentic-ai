from services.embedding_service import EmbeddingService
from shared.core.constants import QdrantCollections


def _get_embedding_service() -> EmbeddingService:
    """Lazy import to avoid circular deps at module level."""
    import main as m
    return m.embedding_service


def search_crop_knowledge(query: str) -> dict:
    """Search the crop knowledge base for relevant information about crops, planting, diseases, and farming practices."""
    svc = _get_embedding_service()
    results = svc.search(QdrantCollections.CROP_KNOWLEDGE, query, top_k=5)
    if not results:
        return {"found": False, "message": "No relevant crop information found."}
    texts = [r["text"] for r in results]
    return {"found": True, "results": texts}


def get_crop_calendar(crop_name: str, region: str = "general") -> dict:
    """Get the planting and harvesting calendar for a specific crop in a given region."""
    svc = _get_embedding_service()
    query = f"{crop_name} planting harvesting calendar {region} season schedule"
    results = svc.search(QdrantCollections.CROP_KNOWLEDGE, query, top_k=3)
    if not results:
        return {"found": False, "message": f"No calendar info found for {crop_name}."}
    return {"found": True, "crop": crop_name, "region": region, "info": [r["text"] for r in results]}


def get_pest_info(crop_name: str, symptom: str = "") -> dict:
    """Get pest and disease information for a crop, optionally matching specific symptoms."""
    svc = _get_embedding_service()
    query = f"{crop_name} pest disease {symptom} treatment control"
    results = svc.search(QdrantCollections.CROP_KNOWLEDGE, query, top_k=5)
    if not results:
        return {"found": False, "message": f"No pest info found for {crop_name}."}
    return {"found": True, "crop": crop_name, "info": [r["text"] for r in results]}
