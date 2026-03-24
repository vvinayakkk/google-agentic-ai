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
        return {"found": False, "message": "No relevant farming information found."}
    return {"found": True, "results": [r["text"] for r in results]}


def get_livestock_advice(animal_type: str, topic: str = "general care") -> dict:
    """Get advice on livestock management for a specific animal type and topic."""
    svc = _get_embedding_service()
    query = f"{animal_type} livestock {topic} management care feeding health"
    results = svc.search(QdrantCollections.FARMING_GENERAL, query, top_k=5)
    if not results:
        return {"found": False, "message": f"No info found for {animal_type}."}
    return {"found": True, "animal": animal_type, "info": [r["text"] for r in results]}
