"""
Document Builder routes for KisanKiAwaaz Market Service.
Interactive form-filling system that guides farmers to complete government scheme applications.
"""

import base64
import asyncio
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from shared.auth.deps import get_current_user
from shared.core.constants import MongoCollections
from shared.db.mongodb import get_async_db
from shared.errors import AppError, ErrorCode, HttpStatus

from services.document_builder_service import DocumentBuilderService
from services.government_schemes_data import get_all_schemes, get_scheme_by_name, get_schemes_by_category
from services.scheme_document_downloader import SchemeDocumentDownloader

router = APIRouter(prefix="/document-builder", tags=["Document Builder"])
service = DocumentBuilderService()


async def _load_db_schemes(db) -> list[dict]:
    """Load all schemes from Mongo with id normalization."""
    docs = [d async for d in db.collection(MongoCollections.GOVERNMENT_SCHEMES).stream()]
    items: list[dict] = []
    for doc in docs:
        item = doc.to_dict() or {}
        item["id"] = doc.id
        item.setdefault("scheme_id", doc.id)
        items.append(item)
    return items


async def _resolve_scheme(db, key: str) -> dict | None:
    """Resolve a scheme by id, scheme_id, short_name, or name."""
    token = (key or "").strip().lower()
    if not token:
        return None

    doc = await db.collection(MongoCollections.GOVERNMENT_SCHEMES).document(key).get()
    if doc.exists:
        data = doc.to_dict() or {}
        data["id"] = doc.id
        data.setdefault("scheme_id", doc.id)
        return data

    all_items = await _load_db_schemes(db)
    for item in all_items:
        if token in {
            str(item.get("id", "")).lower(),
            str(item.get("scheme_id", "")).lower(),
            str(item.get("short_name", "")).lower(),
            str(item.get("name", "")).lower(),
        }:
            return item

    # Fallback to built-in static dataset.
    static = get_scheme_by_name(key)
    if static:
        return {
            **static,
            "id": static.get("id") or static.get("short_name") or static.get("name", ""),
            "scheme_id": static.get("scheme_id") or static.get("short_name") or static.get("name", ""),
        }

    return None


# ── Request / Response Models ────────────────────────────────────

class StartSessionRequest(BaseModel):
    scheme_name: Optional[str] = Field(default=None, description="Name or short_name of the scheme")
    scheme_id: Optional[str] = Field(default=None, description="Internal scheme id/slug")
    preferred_format: str = Field(default="html", description="Preferred output format (html/pdf)")


class GenerateDocumentRequest(BaseModel):
    format: str = Field(default="html", description="Requested output format (html/pdf)")
    source_document_name: Optional[str] = None

class SubmitAnswerRequest(BaseModel):
    answers: dict = Field(..., description="Dict of field_name → value for the answered questions")

class ExtractRequest(BaseModel):
    file_content: str = Field(..., description="Base64-encoded file content")
    filename: str = Field(..., description="Original filename with extension")


class ExtractTextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=12000)
    document_type: str = Field(default="auto", max_length=50)
    target_fields: list[str] | None = None


# ── Scheme Discovery ─────────────────────────────────────────────

@router.get("/schemes", status_code=HttpStatus.OK)
async def list_available_schemes(
    category: Optional[str] = Query(default=None, description="Filter by category"),
    state: Optional[str] = Query(default=None, description="Filter by state"),
    user: dict = Depends(get_current_user),
):
    """List all government schemes with their form fields and required documents."""
    db = get_async_db()
    schemes = await _load_db_schemes(db)

    if not schemes:
        builtins = get_all_schemes()
        schemes = [
            {
                **s,
                "id": s.get("id") or s.get("short_name") or s.get("name", ""),
                "scheme_id": s.get("scheme_id") or s.get("short_name") or s.get("name", ""),
            }
            for s in builtins
        ]

    if category:
        schemes = [s for s in schemes if s.get("category", "").lower() == category.lower()]

    if state:
        state_lower = state.lower()
        schemes = [
            s for s in schemes
            if s.get("state", "").lower() in ("all", state_lower, "")
            or state_lower in s.get("state", "").lower()
        ]

    # Return enriched listing payload (not only summary), so UI can render complete data.
    summaries = []
    for s in schemes:
        display_name = s.get("name") or s.get("scheme_name") or s.get("short_name") or "Untitled Scheme"
        summaries.append({
            "id": s.get("id") or s.get("scheme_id") or s.get("short_name") or s.get("name", ""),
            "scheme_id": s.get("scheme_id") or s.get("id") or s.get("short_name") or s.get("name", ""),
            "name": display_name,
            "short_name": s.get("short_name", ""),
            "description": s.get("description", ""),
            "category": s.get("category", ""),
            "state": s.get("state", "All"),
            "benefits": s.get("benefits", []),
            "eligibility": s.get("eligibility", []),
            "required_documents": s.get("required_documents", []),
            "application_process": s.get("application_process", []),
            "application_url": s.get("application_url", ""),
            "form_download_urls": s.get("form_download_urls", []),
            "form_fields": s.get("form_fields", []),
            "ministry": s.get("ministry", ""),
            "launched_year": s.get("launched_year", s.get("launch_year", "")),
            "helpline": s.get("helpline", ""),
            "amount_range": s.get("amount_range", ""),
            "is_active": s.get("is_active", True),
            "form_field_count": len(s.get("form_fields", [])),
        })

    summaries.sort(key=lambda x: (x.get("name") or "").lower())

    return {"schemes": summaries, "total": len(summaries)}


@router.get("/schemes/{scheme_name}", status_code=HttpStatus.OK)
async def get_scheme_detail(
    scheme_name: str,
    user: dict = Depends(get_current_user),
):
    """Get full details of a scheme including form fields."""
    db = get_async_db()
    scheme = await _resolve_scheme(db, scheme_name)
    if not scheme:
        raise AppError(
            HttpStatus.NOT_FOUND,
            ErrorCode.SCHEME_NOT_FOUND,
            f"Scheme '{scheme_name}' not found",
        )
    return {"scheme": scheme}


# ── Session Management ───────────────────────────────────────────

@router.post("/sessions/start", status_code=HttpStatus.CREATED)
async def start_session(
    body: StartSessionRequest,
    user: dict = Depends(get_current_user),
):
    """
    Start a new document builder session for a government scheme.
    Pre-fills available data from farmer profile and returns first batch of questions.
    """
    db = get_async_db()
    farmer_id = user.get("id") or user.get("uid") or user.get("user_id")

    requested_name = (body.scheme_name or "").strip()
    requested_id = (body.scheme_id or "").strip()

    if not requested_name and not requested_id:
        raise AppError(
            HttpStatus.BAD_REQUEST,
            ErrorCode.MISSING_FIELD,
            "Either scheme_name or scheme_id is required",
        )

    scheme = await _resolve_scheme(db, requested_id or requested_name)
    if not scheme:
        raise AppError(
            HttpStatus.NOT_FOUND,
            ErrorCode.SCHEME_NOT_FOUND,
            f"Scheme '{requested_name or requested_id}' not found",
        )

    result = await service.start_session(
        db=db,
        farmer_id=farmer_id,
        scheme_id=scheme.get("id") or scheme.get("scheme_id") or scheme.get("short_name", scheme["name"]),
        scheme_name=scheme["name"],
        preferred_format=(body.preferred_format or "html").lower(),
    )
    return result


@router.post("/sessions/{session_id}/generate", status_code=HttpStatus.OK)
async def generate_document(
    session_id: str,
    body: GenerateDocumentRequest,
    user: dict = Depends(get_current_user),
):
    """Generate output document for the given session in preferred format."""
    db = get_async_db()
    result = await service.generate_document(
        db=db,
        session_id=session_id,
        preferred_format=(body.format or "html").lower(),
        preferred_document_name=body.source_document_name,
    )
    return result


@router.post("/sessions/{session_id}/answer", status_code=HttpStatus.OK)
async def submit_answers(
    session_id: str,
    body: SubmitAnswerRequest,
    user: dict = Depends(get_current_user),
):
    """
    Submit answers for the current batch of questions.
    Returns next batch or marks session complete.
    """
    db = get_async_db()
    result = await service.submit_answers(
        db=db,
        session_id=session_id,
        answers=body.answers,
    )
    return result


@router.post("/sessions/{session_id}/extract", status_code=HttpStatus.OK)
async def extract_from_base64(
    session_id: str,
    body: ExtractRequest,
    user: dict = Depends(get_current_user),
):
    """Extract fields from a base64-encoded document (alternative to file upload)."""
    db = get_async_db()

    try:
        file_bytes = base64.b64decode(body.file_content, validate=True)
    except Exception as exc:
        raise AppError(
            HttpStatus.BAD_REQUEST,
            ErrorCode.INVALID_FORMAT,
            "Invalid base64 document payload",
        ) from exc

    if not file_bytes:
        raise AppError(
            HttpStatus.BAD_REQUEST,
            ErrorCode.MISSING_FIELD,
            "Empty file content",
        )

    result = await service.extract_from_document(
        db=db,
        session_id=session_id,
        file_content=file_bytes,
        filename=body.filename,
    )
    return result


@router.get("/sessions/{session_id}", status_code=HttpStatus.OK)
async def get_session(
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """Get session details including all filled fields and progress."""
    db = get_async_db()
    result = await service.get_session(db=db, session_id=session_id)
    if not result:
        raise AppError(
            HttpStatus.NOT_FOUND,
            ErrorCode.RESOURCE_NOT_FOUND,
            "Session not found",
        )
    return result


@router.get("/sessions", status_code=HttpStatus.OK)
async def list_sessions(
    status: Optional[str] = Query(default=None, description="Filter by status"),
    user: dict = Depends(get_current_user),
):
    """List all document builder sessions for the current farmer."""
    db = get_async_db()
    farmer_id = user.get("id") or user.get("uid") or user.get("user_id")
    result = await service.list_sessions(db=db, farmer_id=farmer_id, status=status)
    return result


@router.get("/sessions/{session_id}/download", status_code=HttpStatus.OK)
async def download_document(
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """Download the generated application form for a completed session."""
    db = get_async_db()
    result = await service.get_document_file(db=db, session_id=session_id)
    if not result:
        raise AppError(
            HttpStatus.NOT_FOUND,
            ErrorCode.RESOURCE_NOT_FOUND,
            "Document not ready. Complete all required fields first.",
        )
    return FileResponse(
        path=result["filepath"],
        filename=result.get("filename") or f"application_{session_id}.html",
        media_type="text/html",
    )


# ── Bulk Scheme Seed ─────────────────────────────────────────────

@router.post("/seed-schemes", status_code=HttpStatus.CREATED)
async def seed_schemes_to_mongo(
    user: dict = Depends(get_current_user),
):
    """Seed all government schemes from the built-in database into MongoDB."""
    db = get_async_db()
    schemes = get_all_schemes()

    batch = db.batch()
    count = 0
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()

    for scheme in schemes:
        doc_ref = db.collection("government_schemes").document(
            scheme.get("short_name", scheme["name"]).lower().replace(" ", "_")
        )
        batch.set(doc_ref, {
            **scheme,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        })
        count += 1

        # Keep write batches below hard limits.
        if count % 400 == 0:
            await batch.commit()
            batch = db.batch()

    if count % 400 != 0:
        await batch.commit()

    return {"seeded": count, "message": f"Seeded {count} government schemes to MongoDB"}


# ── Scheme Document Downloads ────────────────────────────────────

downloader = SchemeDocumentDownloader()
_download_all_task: Optional[asyncio.Task] = None
_download_all_status: dict = {
    "state": "idle",
    "started_at": None,
    "finished_at": None,
    "summary": None,
    "error": None,
}


async def _execute_download_all(force: bool, reset_existing: bool) -> dict:
    db = get_async_db()
    schemes = await _load_db_schemes(db)
    source = "db"

    if not schemes:
        schemes = get_all_schemes()
        source = "builtin_fallback"

    reset_info = None
    if reset_existing:
        reset_info = downloader.reset_storage()

    result = await downloader.download_all_schemes(force=force, schemes=schemes)
    result["scheme_source"] = source
    result["input_scheme_count"] = len(schemes)
    if reset_info is not None:
        result["reset"] = reset_info
    return result


async def _run_download_all_in_background(force: bool, reset_existing: bool) -> None:
    global _download_all_status
    _download_all_status = {
        "state": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "finished_at": None,
        "summary": None,
        "error": None,
    }
    try:
        result = await _execute_download_all(force=force, reset_existing=reset_existing)
        _download_all_status = {
            "state": "completed",
            "started_at": _download_all_status.get("started_at"),
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "summary": result,
            "error": None,
        }
    except Exception as exc:
        _download_all_status = {
            "state": "failed",
            "started_at": _download_all_status.get("started_at"),
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "summary": None,
            "error": str(exc),
        }


@router.post("/download-scheme-docs/{scheme_name}", status_code=HttpStatus.OK)
async def download_scheme_documents(
    scheme_name: str,
    user: dict = Depends(get_current_user),
):
    """Download all available PDF forms and documents for a specific scheme."""
    db = get_async_db()
    scheme = await _resolve_scheme(db, scheme_name)
    if not scheme:
        raise AppError(
            HttpStatus.NOT_FOUND,
            ErrorCode.SCHEME_NOT_FOUND,
            f"Scheme '{scheme_name}' not found",
        )
    result = await downloader.download_scheme_documents(scheme)
    return result


@router.post("/download-all-scheme-docs", status_code=HttpStatus.OK)
async def download_all_scheme_documents(
    force: bool = Query(default=False, description="Force re-download even if cached"),
    reset_existing: bool = Query(default=False, description="Delete existing stored docs before downloading"),
    wait: bool = Query(default=False, description="If false, start in background and return immediately"),
    user: dict = Depends(get_current_user),
):
    """Download documents for all DB schemes (built-in list used only as fallback)."""
    global _download_all_task

    if wait:
        result = await _execute_download_all(force=force, reset_existing=reset_existing)
        return result

    if _download_all_task is not None and not _download_all_task.done():
        return {
            "state": "running",
            "message": "Bulk sync already running",
            "status": _download_all_status,
        }

    _download_all_task = asyncio.create_task(
        _run_download_all_in_background(force=force, reset_existing=reset_existing)
    )
    return {
        "state": "started",
        "message": "Bulk sync started in background",
        "status": _download_all_status,
    }


@router.get("/download-all-scheme-docs/status", status_code=HttpStatus.OK)
async def get_download_all_status(
    user: dict = Depends(get_current_user),
):
    """Get status/result for background bulk scheme document sync."""
    global _download_all_task
    running = _download_all_task is not None and not _download_all_task.done()
    return {
        "running": running,
        "status": _download_all_status,
    }


@router.get("/scheme-docs/{scheme_name}", status_code=HttpStatus.OK)
async def list_scheme_documents(
    scheme_name: str,
    user: dict = Depends(get_current_user),
):
    """List all downloaded documents for a scheme."""
    db = get_async_db()
    scheme = await _resolve_scheme(db, scheme_name)
    canonical = scheme.get("short_name") or scheme.get("name") if scheme else scheme_name
    docs = downloader.get_scheme_documents(canonical)
    if not docs and canonical != scheme_name:
        docs = downloader.get_scheme_documents(scheme_name)
    return {
        "scheme": canonical,
        "requested_scheme": scheme_name,
        "documents": docs,
        "count": len(docs),
    }


@router.get("/scheme-docs", status_code=HttpStatus.OK)
async def list_all_downloaded_documents(
    user: dict = Depends(get_current_user),
):
    """Get summary of all downloaded scheme documents."""
    return downloader.get_all_downloaded()


@router.get("/scheme-docs/{scheme_name}/file/{doc_name}", status_code=HttpStatus.OK)
async def serve_scheme_document(
    scheme_name: str,
    doc_name: str,
    user: dict = Depends(get_current_user),
):
    """Serve a downloaded scheme document file to the farmer."""
    import os
    import mimetypes
    db = get_async_db()
    scheme = await _resolve_scheme(db, scheme_name)
    canonical = scheme.get("short_name") or scheme.get("name") if scheme else scheme_name
    file_path = downloader.get_document_path(canonical, doc_name)
    if not file_path and canonical != scheme_name:
        file_path = downloader.get_document_path(scheme_name, doc_name)
    if not file_path or not os.path.exists(file_path):
        raise AppError(
            HttpStatus.NOT_FOUND,
            ErrorCode.RESOURCE_NOT_FOUND,
            f"Document not found. Try downloading first via POST /download-scheme-docs/{scheme_name}",
        )

    guessed_media_type, _ = mimetypes.guess_type(file_path)
    media_type = guessed_media_type or "application/octet-stream"

    # Some web forms are stored with uncommon extensions (e.g. .aspx); keep these renderable.
    ext = os.path.splitext(file_path)[1].lower()
    if ext in {".html", ".htm", ".aspx", ".jsp", ".php", ".do"}:
        media_type = "text/html"

    return FileResponse(
        path=file_path,
        filename=os.path.basename(file_path),
        media_type=media_type,
    )


# ── LangExtract Extraction Endpoint ─────────────────────────────

@router.post("/extract-text", status_code=HttpStatus.OK)
async def extract_from_text_endpoint(
    body: ExtractTextRequest,
    user: dict = Depends(get_current_user),
):
    """
    Extract structured data from text using LangExtract.
    Body: { "text": "...", "document_type": "aadhaar|land_record|bank_passbook|auto", "target_fields": [...] }
    """
    text = body.text
    
    try:
        from services.langextract_service import extract_from_text
        result = extract_from_text(
            text=text,
            target_fields=body.target_fields,
            document_type=body.document_type,
        )
        return result
    except ImportError:
        raise AppError(
            HttpStatus.SERVICE_UNAVAILABLE,
            ErrorCode.SERVICE_UNAVAILABLE,
            "langextract not installed on server",
        )
