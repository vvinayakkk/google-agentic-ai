from services.embedding_service import EmbeddingService
from shared.core.constants import QdrantCollections
from shared.db.mongodb import get_db
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
import json
import re


SCHEME_ID_HINTS = {
    "pm-kisan": "pm_kisan",
    "pmfby": "pmfby",
    "pm-kusum": "pm_kusum",
    "kcc": "kcc",
    "enam": "enam",
}

EQUIPMENT_CATEGORY_HINTS = {
    "tractor": "tractor",
    "harvester": "harvester",
    "sprayer": "sprayer",
    "drone": "drone",
    "rotavator": "rotavator",
    "seed": "seed drill",
    "trolley": "trolley",
    "thresher": "thresher",
}


def _get_embedding_service() -> EmbeddingService:
    import main as m
    return m.embedding_service


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


@lru_cache(maxsize=1)
def _load_local_scheme_dataset() -> list[dict]:
    path = _repo_root() / "scripts" / "reports" / "scheme.json"
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    rows = raw.get("schemes") if isinstance(raw, dict) else raw
    if not isinstance(rows, list):
        return []
    return [r for r in rows if isinstance(r, dict)]


def _as_text_list(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        out = []
        for it in value:
            if isinstance(it, dict):
                step = str(it.get("step") or "").strip()
                action = str(it.get("action") or "").strip()
                details = str(it.get("details") or "").strip()
                url = str(it.get("url") or "").strip()
                line = " ".join(x for x in [f"Step {step}:" if step else "", action, details, f"({url})" if url else ""] if x).strip()
                if line:
                    out.append(line)
            else:
                s = str(it).strip()
                if s:
                    out.append(s)
        return out
    s = str(value).strip()
    if not s:
        return []
    parts = re.split(r"\n|;|\|", s)
    return [p.strip(" -") for p in parts if p.strip(" -")]


def _score_scheme_row(row: dict, query: str) -> int:
    q = (query or "").strip().lower()
    if not q:
        return 0
    title = str(row.get("scheme_name") or row.get("title") or "")
    summary = str(row.get("description") or row.get("summary") or "")
    tags = " ".join(_as_text_list(row.get("tags")))
    acronym = str(row.get("acronym") or "")
    hay = f"{title} {summary} {tags} {acronym}".lower()

    score = 0
    if q in hay:
        score += 5
    for tok in [t for t in q.split() if len(t) > 2][:10]:
        if tok in hay:
            score += 1
    return score


def _extract_scheme_id_hint(query: str) -> str:
    txt = (query or "").strip().lower()
    if not txt:
        return ""
    for marker, scheme_id in SCHEME_ID_HINTS.items():
        if marker in txt:
            return scheme_id
    return ""


def _extract_equipment_category_hint(query: str) -> str:
    txt = (query or "").strip().lower()
    if not txt:
        return ""
    for marker, category in EQUIPMENT_CATEGORY_HINTS.items():
        if marker in txt:
            return category
    return ""


def _map_local_scheme_row(row: dict) -> dict:
    links = []
    for c in [row.get("official_portal"), row.get("application_link")]:
        v = str(c or "").strip()
        if v and v not in links:
            links.append(v)

    contact = row.get("contact_info") if isinstance(row.get("contact_info"), dict) else {}
    contact_numbers = [str(contact.get(k)).strip() for k in ["helpline", "toll_free", "phone"] if str(contact.get(k) or "").strip()]

    state = row.get("state")
    states = [str(state).strip()] if state else ["All"]

    return {
        "scheme_id": str(row.get("scheme_id") or "").lower(),
        "title": str(row.get("scheme_name") or "").strip(),
        "ministry": str(row.get("ministry") or "").strip(),
        "beneficiary_state": states,
        "categories": _as_text_list(row.get("category")),
        "tags": _as_text_list(row.get("tags")),
        "summary": str(row.get("description") or row.get("objective") or "").strip(),
        "benefits": _as_text_list(row.get("benefits")),
        "where_to_apply": [
            f"Official portal: {links[0]}" if links else "Nearest CSC",
            "Nearest CSC",
            "District Agriculture Department Office",
        ],
        "application_process": _as_text_list(row.get("how_to_apply")),
        "how_to_apply": " -> ".join(_as_text_list(row.get("how_to_apply"))[:8]),
        "required_documents": _as_text_list(row.get("documents_required")),
        "eligibility": _as_text_list(row.get("eligibility_criteria")),
        "official_links": links,
        "contact_numbers": contact_numbers,
        "last_updated": str(row.get("last_updated") or ""),
    }


def _search_local_schemes(query: str, state: str = "") -> list[dict]:
    rows = _load_local_scheme_dataset()
    state_filter = (state or "").strip().lower()
    scored = []
    for row in rows:
        st = str(row.get("state") or "").strip().lower()
        if state_filter and st and st != state_filter:
            continue
        score = _score_scheme_row(row, query)
        if score > 0:
            scored.append((score, _map_local_scheme_row(row)))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [s[1] for s in scored[:8]]


def search_government_schemes(query: str, state: str = "") -> dict:
    """Search for government agricultural schemes, subsidies, and loan programs.
    Covers 30+ schemes including PM-KISAN, PMFBY, KCC, PM-KUSUM, SMAM, RKVY, MIDH, eNAM, and more."""
    q = (query or "").strip().lower()
    state_filter = (state or "").strip().lower()
    try:
        db = get_db()
        collection = db.collection("ref_farmer_schemes")
        state_raw = (state or "").strip()
        if state_raw:
            collection = collection.where("beneficiary_state", "array_contains", state_raw)

        scheme_id_hint = _extract_scheme_id_hint(query)
        if scheme_id_hint:
            collection = collection.where("scheme_id", "==", scheme_id_hint)

        docs = list(collection.limit(500).stream())
        if not docs and state_raw:
            # Relax state filter only when strict state query has no rows.
            collection = db.collection("ref_farmer_schemes")
            if scheme_id_hint:
                collection = collection.where("scheme_id", "==", scheme_id_hint)
            docs = list(collection.limit(500).stream())

        scored = []
        for d in docs:
            item = d.to_dict() or {}
            title = str(item.get("title", "") or "")
            summary = str(item.get("summary", "") or "")
            tags = " ".join(item.get("tags", []) if isinstance(item.get("tags", []), list) else [])
            states = item.get("beneficiary_state", []) if isinstance(item.get("beneficiary_state", []), list) else []

            if state_filter and states and all(str(s).lower() != state_filter for s in states):
                continue

            hay = f"{title} {summary} {tags}".lower()
            score = 0
            if q and q in hay:
                score += 4
            for token in [t for t in q.split() if len(t) > 2][:6]:
                if token in hay:
                    score += 1
            if score > 0:
                scored.append((score, {
                    "scheme_id": item.get("scheme_id", ""),
                    "title": title,
                    "ministry": item.get("ministry", ""),
                    "beneficiary_state": states,
                    "categories": item.get("categories", []),
                    "tags": item.get("tags", []),
                    "summary": summary,
                    "benefits": item.get("benefits", ""),
                    "where_to_apply": item.get("where_to_apply", ""),
                    "application_process": item.get("application_process", ""),
                    "how_to_apply": item.get("how_to_apply", ""),
                    "required_documents": item.get("required_documents", ""),
                    "eligibility": item.get("eligibility", ""),
                    "official_links": item.get("official_links", []),
                    "contact_numbers": item.get("contact_numbers", []),
                    "last_updated": item.get("_ingested_at", ""),
                }))

        scored.sort(key=lambda x: x[0], reverse=True)
        if scored:
            return {
                "found": True,
                "source": "ref_farmer_schemes",
                "results": [x[1] for x in scored[:6]],
            }
    except Exception:
        local = _search_local_schemes(query=query, state=state)
        if local:
            return {
                "found": True,
                "source": "scheme_json_local",
                "results": local[:6],
            }

    svc = _get_embedding_service()
    search_query = f"government scheme subsidy {query} {state} farmer"
    results = svc.search(QdrantCollections.SCHEME_KNOWLEDGE, search_query, top_k=5)
    if not results:
        return {
            "found": True,
            "source": "advisory_fallback",
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "results": [
                {
                    "title": "PM-KISAN",
                    "summary": "Income support to eligible farmer families; verify status on PM-KISAN portal and local CSC.",
                    "how_to_apply": "Carry Aadhaar, bank passbook, and land records to CSC/Krishi office for enrollment/update.",
                },
                {
                    "title": "KCC",
                    "summary": "Working capital support for crop expenses at lower interest rates for eligible farmers.",
                    "how_to_apply": "Apply through your bank branch with land and identity documents.",
                },
            ],
            "note": "Exact scheme match was limited; returned high-impact baseline options used across states.",
        }
    return {"found": True, "source": "qdrant_fallback", "results": [r["text"] for r in results]}


def check_scheme_eligibility(scheme_name: str, land_size: str = "", category: str = "") -> dict:
    """Check eligibility criteria for a specific government scheme."""
    name = (scheme_name or "").strip().lower()
    try:
        db = get_db()
        scheme_id_hint = _extract_scheme_id_hint(scheme_name)
        if scheme_id_hint:
            docs = list(
                db.collection("ref_farmer_schemes")
                .where("scheme_id", "==", scheme_id_hint)
                .limit(20)
                .stream()
            )
        else:
            docs = list(db.collection("ref_farmer_schemes").limit(500).stream())

        best = None
        best_score = -1
        for d in docs:
            item = d.to_dict() or {}
            title = str(item.get("title", "") or "")
            sid = str(item.get("scheme_id", "") or "")
            text = f"{title} {sid}".lower()
            score = 0
            if name and name in text:
                score += 3
            for tok in [t for t in name.split() if len(t) > 2][:5]:
                if tok in text:
                    score += 1
            if score > best_score:
                best_score = score
                best = item

        if best and best_score > 0:
            return {
                "found": True,
                "source": "ref_farmer_schemes",
                "scheme": best.get("title") or best.get("scheme_id") or scheme_name,
                "eligibility": best.get("eligibility", ""),
                "required_documents": best.get("required_documents", ""),
                "how_to_apply": best.get("how_to_apply", ""),
                "last_updated": best.get("_ingested_at", ""),
            }
    except Exception:
        local = _search_local_schemes(query=scheme_name, state="")
        if local:
            top = local[0]
            return {
                "found": True,
                "source": "scheme_json_local",
                "scheme": top.get("title") or scheme_name,
                "eligibility": top.get("eligibility", ""),
                "required_documents": top.get("required_documents", ""),
                "how_to_apply": top.get("how_to_apply", ""),
                "last_updated": top.get("last_updated", ""),
            }

    svc = _get_embedding_service()
    query = f"{scheme_name} eligibility criteria {land_size} {category} required documents"
    results = svc.search(QdrantCollections.SCHEME_KNOWLEDGE, query, top_k=3)
    if not results:
        return {
            "found": True,
            "source": "advisory_fallback",
            "scheme": scheme_name,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "eligibility": "Check land ownership/tenancy proofs, Aadhaar linkage, and bank account seeding at nearest CSC/agri office.",
            "required_documents": "Aadhaar, bank passbook, land record, mobile number, category certificate (if applicable).",
            "how_to_apply": "Submit at CSC/department portal and keep application ID for status tracking.",
            "note": "Exact eligibility row was limited; returned standard verification checklist for farmer action.",
        }
    return {"found": True, "source": "qdrant_fallback", "scheme": scheme_name, "info": [r["text"] for r in results]}


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
    q = (query or "").strip().lower()
    st = (state or "").strip().lower()
    try:
        db = get_db()
        category_hint = _extract_equipment_category_hint(query)
        collection = db.collection("ref_equipment_providers").where("is_active", "==", True)
        if st:
            collection = collection.where("state", "==", state.strip())
        if category_hint:
            collection = collection.where("category", "==", category_hint)

        docs = list(collection.limit(500).stream())
        if not docs and category_hint:
            # Relax category only; keep state filter when present.
            collection = db.collection("ref_equipment_providers").where("is_active", "==", True)
            if st:
                collection = collection.where("state", "==", state.strip())
            docs = list(collection.limit(500).stream())

        rows = []
        for d in docs:
            item = d.to_dict() or {}
            hay = f"{item.get('name','')} {item.get('category','')} {item.get('provider_name','')}".lower()
            if q and q not in hay and not any(t in hay for t in q.split() if len(t) > 2):
                continue
            rows.append(
                {
                    "equipment": item.get("name", ""),
                    "category": item.get("category", ""),
                    "provider": item.get("provider_name", ""),
                    "provider_id": item.get("provider_id", ""),
                    "state": item.get("state", ""),
                    "district": item.get("district", ""),
                    "city": item.get("city", ""),
                    "address": item.get("address", ""),
                    "pincode": item.get("pincode", ""),
                    "rate_hourly": item.get("rate_hourly"),
                    "rate_daily": item.get("rate_daily"),
                    "rate_per_acre": item.get("rate_per_acre"),
                    "rate_per_trip": item.get("rate_per_trip"),
                    "contact": item.get("provider_phone", ""),
                    "alternate_contact": item.get("alternate_phone", ""),
                    "whatsapp": item.get("whatsapp", ""),
                    "contact_person": item.get("contact_person", ""),
                    "eligibility": item.get("eligibility", []),
                    "documents_required": item.get("documents_required", []),
                    "source": item.get("source", ""),
                    "source_type": item.get("source_type", ""),
                    "source_url": item.get("source_url", ""),
                    "operator_included": item.get("operator_included"),
                    "fuel_extra": item.get("fuel_extra"),
                    "availability": item.get("availability", ""),
                    "last_updated": item.get("last_verified_at") or item.get("_ingested_at", ""),
                }
            )

        if rows:
            return {
                "found": True,
                "source": "ref_equipment_providers",
                "results": rows[:10],
                "total": len(rows),
            }
    except Exception:
        pass

    svc = _get_embedding_service()
    search_query = f"equipment rental hire {query} {state} farming machinery"
    results = svc.search(QdrantCollections.FARMING_GENERAL, search_query, top_k=5)
    if not results:
        return {
            "found": True,
            "source": "advisory_fallback",
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "results": [
                {
                    "equipment": "Tractor (General)",
                    "category": "land_preparation",
                    "provider": "Nearest Custom Hiring Centre",
                    "state": state,
                    "district": "",
                    "rate_hourly": None,
                    "rate_daily": None,
                    "contact": "CHC/Agri Dept Helpline",
                    "last_updated": datetime.now(timezone.utc).isoformat(),
                }
            ],
            "total": 1,
            "note": "Exact rental provider match was limited; use nearest CHC/private operator options and negotiate based on fuel + operator cost.",
        }
    return {"found": True, "source": "qdrant_fallback", "results": [r["text"] for r in results]}
