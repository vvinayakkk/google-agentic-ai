"""
Document Builder routes for KisanKiAwaaz Market Service.
Interactive form-filling system that guides farmers to complete government scheme applications.
"""

import base64
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from shared.auth.deps import get_current_user
from shared.db.mongodb import get_async_db
from shared.errors import AppError, HttpStatus

from services.document_builder_service import DocumentBuilderService
from services.government_schemes_data import get_all_schemes, get_scheme_by_name, get_schemes_by_category
from services.scheme_document_downloader import SchemeDocumentDownloader

router = APIRouter(prefix="/document-builder", tags=["Document Builder"])
service = DocumentBuilderService()


# ── Request / Response Models ────────────────────────────────────

class StartSessionRequest(BaseModel):
    scheme_name: str = Field(..., description="Name or short_name of the scheme")

class SubmitAnswerRequest(BaseModel):
    answers: dict = Field(..., description="Dict of field_name → value for the answered questions")

class ExtractRequest(BaseModel):
    file_content: str = Field(..., description="Base64-encoded file content")
    filename: str = Field(..., description="Original filename with extension")


# ── Scheme Discovery ─────────────────────────────────────────────

@router.get("/schemes", status_code=HttpStatus.OK)
async def list_available_schemes(
    category: Optional[str] = Query(default=None, description="Filter by category"),
    state: Optional[str] = Query(default=None, description="Filter by state"),
    user: dict = Depends(get_current_user),
):
    """List all government schemes with their form fields and required documents."""
    schemes = get_all_schemes()

    if category:
        schemes = [s for s in schemes if s.get("category", "").lower() == category.lower()]

    if state:
        state_lower = state.lower()
        schemes = [
            s for s in schemes
            if s.get("state", "").lower() in ("all", state_lower, "")
            or state_lower in s.get("state", "").lower()
        ]

    # Return summary for listing
    summaries = []
    for s in schemes:
        summaries.append({
            "name": s["name"],
            "short_name": s.get("short_name", ""),
            "description": s.get("description", ""),
            "category": s.get("category", ""),
            "state": s.get("state", "All"),
            "benefits": s.get("benefits", []),
            "required_documents": s.get("required_documents", []),
            "application_url": s.get("application_url", ""),
            "form_field_count": len(s.get("form_fields", [])),
        })

    return {"schemes": summaries, "total": len(summaries)}


@router.get("/schemes/{scheme_name}", status_code=HttpStatus.OK)
async def get_scheme_detail(
    scheme_name: str,
    user: dict = Depends(get_current_user),
):
    """Get full details of a scheme including form fields."""
    scheme = get_scheme_by_name(scheme_name)
    if not scheme:
        raise AppError(
            status=HttpStatus.NOT_FOUND,
            message=f"Scheme '{scheme_name}' not found",
            error_code="SCHEME_NOT_FOUND",
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
    farmer_id = user.get("uid") or user.get("user_id")

    scheme = get_scheme_by_name(body.scheme_name)
    if not scheme:
        raise AppError(
            status=HttpStatus.NOT_FOUND,
            message=f"Scheme '{body.scheme_name}' not found",
            error_code="SCHEME_NOT_FOUND",
        )

    result = await service.start_session(
        db=db,
        farmer_id=farmer_id,
        scheme_id=scheme.get("short_name", scheme["name"]),
        scheme_name=scheme["name"],
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
            status=HttpStatus.BAD_REQUEST,
            message="Invalid base64 document payload",
            error_code="INVALID_FILE_CONTENT",
        ) from exc

    if not file_bytes:
        raise AppError(
            status=HttpStatus.BAD_REQUEST,
            message="Empty file content",
            error_code="EMPTY_FILE_CONTENT",
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
            status=HttpStatus.NOT_FOUND,
            message="Session not found",
            error_code="SESSION_NOT_FOUND",
        )
    return result


@router.get("/sessions", status_code=HttpStatus.OK)
async def list_sessions(
    status: Optional[str] = Query(default=None, description="Filter by status"),
    user: dict = Depends(get_current_user),
):
    """List all document builder sessions for the current farmer."""
    db = get_async_db()
    farmer_id = user.get("uid") or user.get("user_id")
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
            status=HttpStatus.NOT_FOUND,
            message="Document not ready. Complete all required fields first.",
            error_code="DOCUMENT_NOT_READY",
        )
    return result


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


@router.post("/download-scheme-docs/{scheme_name}", status_code=HttpStatus.OK)
async def download_scheme_documents(
    scheme_name: str,
    user: dict = Depends(get_current_user),
):
    """Download all available PDF forms and documents for a specific scheme."""
    scheme = get_scheme_by_name(scheme_name)
    if not scheme:
        raise AppError(
            status=HttpStatus.NOT_FOUND,
            message=f"Scheme '{scheme_name}' not found",
            error_code="SCHEME_NOT_FOUND",
        )
    result = await downloader.download_scheme_documents(scheme)
    return result


@router.post("/download-all-scheme-docs", status_code=HttpStatus.OK)
async def download_all_scheme_documents(
    user: dict = Depends(get_current_user),
):
    """Download documents for ALL government schemes (forms, guidelines, PDFs)."""
    result = await downloader.download_all_schemes()
    return result


@router.get("/scheme-docs/{scheme_name}", status_code=HttpStatus.OK)
async def list_scheme_documents(
    scheme_name: str,
    user: dict = Depends(get_current_user),
):
    """List all downloaded documents for a scheme."""
    docs = downloader.get_scheme_documents(scheme_name)
    return {"scheme": scheme_name, "documents": docs, "count": len(docs)}


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
    file_path = downloader.get_document_path(scheme_name, doc_name)
    if not file_path or not os.path.exists(file_path):
        raise AppError(
            status=HttpStatus.NOT_FOUND,
            message=f"Document not found. Try downloading first via POST /download-scheme-docs/{scheme_name}",
            error_code="DOCUMENT_NOT_FOUND",
        )
    return FileResponse(
        path=file_path,
        filename=os.path.basename(file_path),
        media_type="application/octet-stream",
    )


# ── LangExtract Extraction Endpoint ─────────────────────────────

@router.post("/extract-text", status_code=HttpStatus.OK)
async def extract_from_text_endpoint(
    body: dict,
    user: dict = Depends(get_current_user),
):
    """
    Extract structured data from text using LangExtract.
    Body: { "text": "...", "document_type": "aadhaar|land_record|bank_passbook|auto", "target_fields": [...] }
    """
    text = body.get("text", "")
    if not text:
        raise AppError(
            status=HttpStatus.BAD_REQUEST,
            message="'text' field is required",
            error_code="MISSING_TEXT",
        )
    
    try:
        from services.langextract_service import extract_from_text
        result = extract_from_text(
            text=text,
            target_fields=body.get("target_fields"),
            document_type=body.get("document_type", "auto"),
        )
        return result
    except ImportError:
        raise AppError(
            status=HttpStatus.SERVICE_UNAVAILABLE,
            message="langextract not installed on server",
            error_code="LANGEXTRACT_UNAVAILABLE",
        )
