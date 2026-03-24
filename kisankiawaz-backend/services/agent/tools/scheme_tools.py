from services.embedding_service import EmbeddingService
from shared.core.constants import QdrantCollections


def _get_embedding_service() -> EmbeddingService:
    import main as m
    return m.embedding_service


def search_government_schemes(query: str, state: str = "") -> dict:
    """Search for government agricultural schemes, subsidies, and loan programs.
    Covers 30+ schemes including PM-KISAN, PMFBY, KCC, PM-KUSUM, SMAM, RKVY, MIDH, eNAM, and more."""
    svc = _get_embedding_service()
    search_query = f"government scheme subsidy {query} {state} farmer"
    results = svc.search(QdrantCollections.SCHEME_KNOWLEDGE, search_query, top_k=5)
    if not results:
        return {"found": False, "message": "No relevant schemes found."}
    return {"found": True, "results": [r["text"] for r in results]}


def check_scheme_eligibility(scheme_name: str, land_size: str = "", category: str = "") -> dict:
    """Check eligibility criteria for a specific government scheme."""
    svc = _get_embedding_service()
    query = f"{scheme_name} eligibility criteria {land_size} {category} required documents"
    results = svc.search(QdrantCollections.SCHEME_KNOWLEDGE, query, top_k=3)
    if not results:
        return {"found": False, "message": f"No eligibility info for {scheme_name}."}
    return {"found": True, "scheme": scheme_name, "info": [r["text"] for r in results]}


def search_document_builder(query: str) -> dict:
    """Search for document builder features - auto-fill scheme applications from Aadhaar, land records, bank passbook using LangExtract OCR."""
    svc = _get_embedding_service()
    search_query = f"document builder form application OCR extract {query}"
    results = svc.search(QdrantCollections.SCHEME_KNOWLEDGE, search_query, top_k=3)
    if not results:
        return {
            "found": True,
            "message": "Document Builder helps you auto-fill government scheme application forms. Upload Aadhaar, land record, or bank passbook - LangExtract OCR will extract your details and pre-fill the form for you.",
        }
    return {"found": True, "results": [r["text"] for r in results]}


def search_equipment_rentals(query: str, state: str = "") -> dict:
    """Search for agricultural equipment rentals - tractors, harvesters, drones, sprayers, and more across 10 categories."""
    svc = _get_embedding_service()
    search_query = f"equipment rental hire {query} {state} farming machinery"
    results = svc.search(QdrantCollections.FARMING_GENERAL, search_query, top_k=5)
    if not results:
        return {"found": False, "message": "No equipment rental info found."}
    return {"found": True, "results": [r["text"] for r in results]}
