from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from typing import Optional
import uuid
from services import document_builder as doc_service
from models.document_builder import (
    DocumentBuilderStartRequest, DocumentBuilderStartResponse,
    DocumentBuilderAnswerRequest, DocumentBuilderAnswerResponse
)

router = APIRouter(prefix="/document-builder", tags=["Document Builder"])

_sessions = {}

@router.post("/start", response_model=DocumentBuilderStartResponse)
def start_document_builder(
    scheme_name: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    session_id = str(uuid.uuid4())
    try:
        questions, present_fields, history = doc_service.start_builder(scheme_name, file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    _sessions[session_id] = {
        "fields": present_fields,
        "history": history,
        "scheme_name": scheme_name,
        "ocr_text": None,
        "file_uploaded": bool(file)
    }
    return DocumentBuilderStartResponse(
        session_id=session_id,
        present_fields=present_fields,
        questions=questions
    )

@router.post("/answer", response_model=DocumentBuilderAnswerResponse)
def answer_document_builder(req: DocumentBuilderAnswerRequest):
    session = _sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    all_fields = {**session["fields"], **req.answers}
    try:
        questions, document_ready, document_url, history = doc_service.process_answers(
            all_fields, req.session_id, session["history"], session["scheme_name"], session["ocr_text"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing answers: {str(e)}")
    session["fields"] = all_fields
    session["history"] = history
    return DocumentBuilderAnswerResponse(
        session_id=req.session_id,
        questions=questions,
        all_fields=all_fields,
        document_ready=document_ready,
        document_url=document_url
    )

@router.post("/reset/{session_id}")
def reset_document_builder(session_id: str):
    if session_id in _sessions:
        del _sessions[session_id]
    return {"message": "Session reset. Please start again."}

@router.get("/download/{session_id}")
def download_document(session_id: str):
    file_path = doc_service.get_document_path(session_id)
    if not file_path:
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(file_path, media_type="application/pdf", filename="official_document.pdf") 