"""
Document Builder Service for KisanKiAwaaz.
Interactive form-filling system that:
1. Takes a scheme → generates questions from form_fields
2. Asks farmer step-by-step
3. Validates answers
4. Generates filled application documents (PDF/HTML)
5. Supports document upload and extraction (OCR via Gemini)
"""

import uuid
import os
import json
import logging
import html
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from shared.core.constants import MongoCollections
from shared.errors import not_found, bad_request
from shared.services.api_key_allocator import get_api_key_allocator

logger = logging.getLogger(__name__)


class DocumentBuilderService:
    """Manages interactive document building workflow."""

    # ── Start a Document Builder Session ─────────────────────────

    @staticmethod
    async def start_session(
        db,
        farmer_id: str,
        scheme_id: str = None,
        scheme_name: str = None,
        preferred_format: str = "html",
    ) -> dict:
        """
        Start a new document builder session.
        Returns session_id + first batch of questions.
        """
        from services.government_schemes_data import get_scheme_by_name, ALL_SCHEMES

        # Find the scheme
        scheme = None
        if scheme_id:
            doc = await db.collection(MongoCollections.GOVERNMENT_SCHEMES).document(scheme_id).get()
            if doc.exists:
                scheme = doc.to_dict()
                scheme["id"] = doc.id
        
        if not scheme and scheme_name:
            scheme = get_scheme_by_name(scheme_name)
        
        if not scheme:
            raise bad_request("Scheme not found. Please provide a valid scheme_id or scheme_name.")

        # Get farmer profile if available
        farmer_data = {}
        try:
            from shared.db.mongodb import FieldFilter
            profile_query = (
                db.collection(MongoCollections.FARMER_PROFILES)
                .where(filter=FieldFilter("user_id", "==", farmer_id))
                .limit(1)
            )
            profiles = [d async for d in profile_query.stream()]
            if profiles:
                farmer_data = profiles[0].to_dict()
        except Exception as e:
            logger.warning(f"Could not fetch farmer profile: {e}")

        # Map farmer profile fields to form fields
        pre_filled = {}
        field_mapping = {
            "state": "state",
            "district": "district",
            "village": "village",
            "farmer_name": farmer_data.get("name", ""),
            "mobile_number": farmer_data.get("phone", ""),
            "land_area_acres": farmer_data.get("land_size_acres", ""),
            "land_area_hectares": str(float(farmer_data.get("land_size_acres", 0)) * 0.4047) if farmer_data.get("land_size_acres") else "",
            "soil_type": farmer_data.get("soil_type", ""),
            "irrigation_source": farmer_data.get("irrigation_type", ""),
        }
        
        for key, val in field_mapping.items():
            if isinstance(val, str) and val:
                pre_filled[key] = val
            elif key in farmer_data and farmer_data[key]:
                pre_filled[key] = str(farmer_data[key])

        # Get form fields from scheme
        form_fields = scheme.get("form_fields", [])
        if not form_fields:
            # Generate basic fields
            form_fields = [
                {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
                {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
                {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
                {"field": "address", "label": "Address", "type": "textarea", "required": True, "hindi_label": "पता"},
                {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
                {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            ]

        # Determine which fields are already filled and which need questions
        missing_fields = []
        for ff in form_fields:
            field_name = ff["field"]
            if field_name not in pre_filled or not pre_filled[field_name]:
                missing_fields.append(ff)

        # Generate first batch of questions (max 5 at a time)
        questions = []
        for ff in missing_fields[:5]:
            q = {
                "field": ff["field"],
                "question": f"Please provide your {ff['label']}",
                "question_hindi": f"कृपया अपना {ff.get('hindi_label', ff['label'])} बताएं",
                "type": ff.get("type", "text"),
                "required": ff.get("required", True),
            }
            if ff.get("options"):
                q["options"] = ff["options"]
            questions.append(q)

        # Create session in MongoCollections
        session_id = uuid.uuid4().hex
        session_data = {
            "session_id": session_id,
            "farmer_id": farmer_id,
            "scheme_name": scheme.get("name", scheme_name or ""),
            "scheme_short_name": scheme.get("short_name", ""),
            "scheme_category": scheme.get("category", ""),
            "application_url": scheme.get("application_url", ""),
            "form_download_urls": scheme.get("form_download_urls", []),
            "preferred_format": (preferred_format or "html").lower(),
            "form_fields": form_fields,
            "filled_fields": pre_filled,
            "required_documents": scheme.get("required_documents", []),
            "uploaded_documents": [],
            "status": "in_progress",
            "questions_asked": [q["field"] for q in questions],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await db.collection("document_builder_sessions").document(session_id).set(session_data)

        return {
            "session_id": session_id,
            "scheme_name": scheme.get("name", ""),
            "scheme_description": scheme.get("description", ""),
            "pre_filled_fields": pre_filled,
            "questions": questions,
            "total_fields": len(form_fields),
            "filled_count": len(pre_filled),
            "remaining_count": len(missing_fields),
            "required_documents": scheme.get("required_documents", []),
            "form_download_urls": scheme.get("form_download_urls", []),
            "preferred_format": (preferred_format or "html").lower(),
        }

    # ── Submit Answers & Get Next Questions ──────────────────────

    @staticmethod
    async def submit_answers(db, session_id: str, answers: Dict[str, Any]) -> dict:
        """
        Submit answers for current batch, get next batch or mark complete.
        """
        session_ref = db.collection("document_builder_sessions").document(session_id)
        session_doc = await session_ref.get()
        
        if not session_doc.exists:
            raise not_found("Document builder session not found")
        
        session = session_doc.to_dict()
        
        # Validate and store answers
        form_fields = session.get("form_fields", [])
        filled = session.get("filled_fields", {})
        
        for field_name, value in answers.items():
            # Find field definition
            field_def = next((f for f in form_fields if f["field"] == field_name), None)
            
            if field_def:
                # Validate based on type
                if field_def.get("type") == "number":
                    try:
                        value = float(value) if value else 0
                    except (ValueError, TypeError):
                        pass
                
                if field_def.get("type") == "select" and field_def.get("options"):
                    if value not in field_def["options"] and value:
                        # Try case-insensitive match
                        matched = [o for o in field_def["options"] if o.lower() == str(value).lower()]
                        if matched:
                            value = matched[0]
                
                filled[field_name] = str(value) if value is not None else ""
        
        # Check what's still missing
        missing_fields = []
        for ff in form_fields:
            if ff["field"] not in filled or not filled[ff["field"]]:
                if ff.get("required", True):
                    missing_fields.append(ff)
        
        # Generate next batch of questions
        asked = set(session.get("questions_asked", []))
        next_questions = []
        for ff in missing_fields:
            if ff["field"] not in asked:
                q = {
                    "field": ff["field"],
                    "question": f"Please provide your {ff['label']}",
                    "question_hindi": f"कृपया अपना {ff.get('hindi_label', ff['label'])} बताएं",
                    "type": ff.get("type", "text"),
                    "required": ff.get("required", True),
                }
                if ff.get("options"):
                    q["options"] = ff["options"]
                next_questions.append(q)
                asked.add(ff["field"])
                
                if len(next_questions) >= 5:
                    break
        
        document_ready = len(missing_fields) == 0
        document_url = None
        
        if document_ready:
            # Generate the document
            doc_result = await DocumentBuilderService._generate_document(
                session_id=session_id,
                scheme_name=session.get("scheme_name", ""),
                filled_fields=filled,
                application_url=session.get("application_url", ""),
                form_download_urls=session.get("form_download_urls", []),
                preferred_format=session.get("preferred_format", "html"),
            )
            document_url = doc_result.get("download_url", "")
            document_html = doc_result.get("document_html", "")
            session_status = "completed"
        else:
            session_status = "in_progress"
            document_html = ""
        
        # Update session
        payload = {
            "filled_fields": filled,
            "questions_asked": list(asked),
            "status": session_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if document_ready:
            payload.update(
                {
                    "document_url": document_url,
                    "document_html": document_html,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
            )

        await session_ref.update(payload)
        
        return {
            "session_id": session_id,
            "questions": next_questions,
            "all_fields": filled,
            "total_fields": len(form_fields),
            "filled_count": len([f for f in form_fields if f["field"] in filled and filled[f["field"]]]),
            "remaining_count": len(missing_fields),
            "document_ready": document_ready,
            "document_url": document_url,
            "document_html": document_html,
            "status": session_status,
        }

    # ── Upload and Extract Document ──────────────────────────────

    @staticmethod
    async def extract_from_document(
        db, session_id: str, file_content: bytes, filename: str
    ) -> dict:
        """
        Process an uploaded document (PDF/image) and extract fields using
        LangExtract (primary) with Gemini OCR fallback.
        """
        session_ref = db.collection("document_builder_sessions").document(session_id)
        session_doc = await session_ref.get()
        
        if not session_doc.exists:
            raise not_found("Document builder session not found")
        
        session = session_doc.to_dict()
        form_fields = session.get("form_fields", [])
        field_names = [f["field"] for f in form_fields]
        
        # Save uploaded file
        upload_dir = "/tmp/doc_uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{session_id}_{filename}")
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        extracted_fields = {}
        extraction_method = "none"
        
        # ── PRIMARY: Try LangExtract ──────────────────────────
        try:
            from services.langextract_service import extract_from_file, detect_document_type
            
            # Detect document type from filename / content
            ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
            
            # Read a sample for type detection
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f_sample:
                    sample_text = f_sample.read(5000)
                doc_type = detect_document_type(sample_text)
            except Exception:
                doc_type = "auto"
            
            langextract_result = extract_from_file(
                file_path=file_path,
                target_fields=field_names,
                document_type=doc_type,
            )
            
            if langextract_result.get("fields"):
                extracted_fields = langextract_result["fields"]
                extraction_method = "langextract"
                logger.info(
                    f"LangExtract extracted {len(extracted_fields)} fields "
                    f"from {filename} (type={doc_type})"
                )
        except ImportError:
            logger.warning("langextract not available, falling back to Gemini OCR")
        except Exception as e:
            logger.warning(f"LangExtract failed: {e}, falling back to Gemini OCR")
        
        # ── FALLBACK: Gemini multimodal OCR ───────────────────
        if not extracted_fields:
            try:
                import google.generativeai as genai
                from shared.core.config import get_settings
                
                settings = get_settings()
                allocator = get_api_key_allocator()
                lease = None
                selected_key = settings.GEMINI_API_KEY
                if allocator.has_provider("gemini"):
                    lease = allocator.acquire("gemini")
                    selected_key = lease.key
                if not selected_key:
                    raise ValueError("Gemini API key is not configured")

                genai.configure(api_key=selected_key)
                
                model = genai.GenerativeModel("gemini-2.5-flash")
                
                ext = filename.lower().split(".")[-1]
                
                if ext in ["jpg", "jpeg", "png", "bmp", "webp"]:
                    import base64
                    b64_content = base64.b64encode(file_content).decode()
                    mime_type = f"image/{ext}" if ext != "jpg" else "image/jpeg"
                    
                    prompt = f"""Extract the following fields from this document image. Return ONLY a valid JSON object.
Fields to extract: {json.dumps(field_names)}

For each field you find, include it in the JSON. If a field is not visible, omit it.
Example format: {{"farmer_name": "Ram Kumar", "aadhaar_number": "1234-5678-9012"}}

IMPORTANT: Return ONLY the JSON, no markdown, no explanation."""

                    response = model.generate_content([
                        {"mime_type": mime_type, "data": b64_content},
                        prompt
                    ])
                    
                elif ext == "pdf":
                    prompt = f"""Analyze this document and extract the following fields. Return ONLY a valid JSON object.
Fields to extract: {json.dumps(field_names)}

Document content (as text):
{file_content[:10000].decode('utf-8', errors='ignore')}

For each field you find, include it in the JSON. If a field is not found, omit it.
Return ONLY the JSON, no markdown, no explanation."""

                    response = model.generate_content(prompt)
                else:
                    return {"extracted_fields": {}, "message": f"Unsupported file type: {ext}"}
                
                response_text = response.text.strip()
                if response_text.startswith("```"):
                    response_text = response_text.split("```")[1]
                    if response_text.startswith("json"):
                        response_text = response_text[4:]
                
                extracted_fields = json.loads(response_text)
                extraction_method = "gemini_ocr"
                if lease:
                    allocator.report_success(lease)
                
            except Exception as e:
                if "lease" in locals() and lease is not None:
                    err_str = str(e).lower()
                    if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
                        allocator.report_rate_limited(lease, str(e))
                    else:
                        allocator.report_error(lease, str(e))
                logger.error(f"Gemini OCR extraction also failed: {e}")
                return {
                    "extracted_fields": {},
                    "message": f"Could not extract fields from document: {str(e)}",
                    "file_saved": file_path,
                    "extraction_method": "failed",
                }
        
        # Merge extracted fields with existing
        filled = session.get("filled_fields", {})
        newly_filled = {}
        for key, val in extracted_fields.items():
            if key in field_names and val and str(val).strip():
                if key not in filled or not filled[key]:
                    filled[key] = str(val)
                    newly_filled[key] = str(val)
        
        # Update session
        uploaded_docs = session.get("uploaded_documents", [])
        uploaded_docs.append({
            "filename": filename,
            "path": file_path,
            "extracted_fields": list(newly_filled.keys()),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        })
        
        await session_ref.update({
            "filled_fields": filled,
            "uploaded_documents": uploaded_docs,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {
            "extracted_fields": newly_filled,
            "total_extracted": len(newly_filled),
            "all_fields": filled,
            "message": f"Extracted {len(newly_filled)} fields from {filename}",
            "extraction_method": extraction_method,
        }

    # ── Get Session Status ───────────────────────────────────────

    @staticmethod
    async def get_session(db, session_id: str) -> dict:
        """Get document builder session details."""
        doc = await db.collection("document_builder_sessions").document(session_id).get()
        if not doc.exists:
            raise not_found("Session not found")
        result = doc.to_dict()
        result["id"] = doc.id
        return result

    @staticmethod
    async def generate_document(
        db,
        session_id: str,
        preferred_format: str = "html",
    ) -> dict:
        """Generate (or regenerate) a document for a session and persist references."""
        session_ref = db.collection("document_builder_sessions").document(session_id)
        session_doc = await session_ref.get()

        if not session_doc.exists:
            raise not_found("Session not found")

        session = session_doc.to_dict()
        doc_result = await DocumentBuilderService._generate_document(
            session_id=session_id,
            scheme_name=session.get("scheme_name", ""),
            filled_fields=session.get("filled_fields", {}),
            application_url=session.get("application_url", ""),
            form_download_urls=session.get("form_download_urls", []),
            preferred_format=(preferred_format or session.get("preferred_format") or "html"),
        )

        await session_ref.update(
            {
                "status": "completed",
                "preferred_format": (preferred_format or "html").lower(),
                "document_url": doc_result.get("download_url", ""),
                "document_html": doc_result.get("document_html", ""),
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        return {
            "session_id": session_id,
            "scheme_name": session.get("scheme_name", ""),
            "document_url": doc_result.get("download_url", ""),
            "document_html": doc_result.get("document_html", ""),
            "format": doc_result.get("format", "html"),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    # ── List Farmer's Sessions ───────────────────────────────────

    @staticmethod
    async def list_sessions(db, farmer_id: str, status: str = None) -> dict:
        """List all document builder sessions for a farmer."""
        from shared.db.mongodb import FieldFilter
        
        query = db.collection("document_builder_sessions").where(
            filter=FieldFilter("farmer_id", "==", farmer_id)
        )
        
        if status:
            query = query.where(filter=FieldFilter("status", "==", status))
        
        docs = [d async for d in query.stream()]
        items = []
        for doc in docs:
            item = doc.to_dict()
            item["id"] = doc.id
            # Return summary only
            items.append({
                "session_id": item.get("session_id"),
                "scheme_name": item.get("scheme_name"),
                "status": item.get("status"),
                "filled_count": len(item.get("filled_fields", {})),
                "total_fields": len(item.get("form_fields", [])),
                "created_at": item.get("created_at"),
                "updated_at": item.get("updated_at"),
            })
        
        items.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return {"sessions": items, "count": len(items)}

    # ── Generate Document (Internal) ─────────────────────────────

    @staticmethod
    async def _generate_document(
        session_id: str,
        scheme_name: str,
        filled_fields: dict,
        application_url: str = "",
        form_download_urls: list | None = None,
        preferred_format: str = "html",
    ) -> dict:
        """Generate a neutral assist sheet for filling official forms."""
        output_dir = "/tmp/generated_documents"
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate HTML assistant sheet (not a synthetic official form).
        html_content = DocumentBuilderService._generate_html(
            scheme_name,
            filled_fields,
            application_url=application_url,
            form_download_urls=form_download_urls or [],
        )
        
        filename = f"application_{session_id[:8]}_{datetime.now().strftime('%Y%m%d')}.html"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        return {
            "filename": filename,
            "filepath": filepath,
            "format": (preferred_format or "html").lower(),
            "document_html": html_content,
            "download_url": f"/api/v1/market/document-builder/sessions/{session_id}/download",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def _generate_html(
        scheme_name: str,
        fields: dict,
        application_url: str = "",
        form_download_urls: list | None = None,
    ) -> str:
        """Generate filled HTML helper sheet for official-form submission."""
        def _coerce_form_links(raw_links: list | None) -> List[dict]:
            out: List[dict] = []
            for item in raw_links or []:
                if isinstance(item, dict):
                    url = str(item.get("url") or item.get("link") or "").strip()
                    if not url:
                        continue
                    name = str(item.get("name") or item.get("title") or "Official Form").strip() or "Official Form"
                    out.append({"name": name, "url": url})
                elif isinstance(item, str):
                    url = item.strip()
                    if url:
                        out.append({"name": "Official Form", "url": url})
            return out

        app_url = str(application_url or "").strip()
        links_input = form_download_urls or []

        rows = ""
        for key, value in fields.items():
            if str(key).startswith("__meta_"):
                continue
            label = html.escape(key.replace("_", " ").title())
            safe_val = html.escape(str(value))
            rows += f"""
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 40%; background: #f9f9f9;">{label}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{safe_val}</td>
            </tr>"""

        links_html = ""
        normalized_links = _coerce_form_links(links_input)
        for item in normalized_links:
            name = html.escape(item["name"])
            url = html.escape(item["url"])
            links_html += f'<li style="margin-bottom: 6px;"><a href="{url}" target="_blank" rel="noopener noreferrer">{name}</a><br/><span style="font-size: 12px; color: #4b5563;">{url}</span></li>'

        if not links_html:
            links_html = "<li>No official downloadable form URLs are mapped yet for this scheme.</li>"

        escaped_scheme = html.escape(scheme_name)
        escaped_app_url = html.escape(app_url)
        app_portal_html = (
            f'<p><a href="{escaped_app_url}" target="_blank" rel="noopener noreferrer">{escaped_app_url}</a></p>'
            if escaped_app_url
            else "<p>Application portal URL is not mapped yet.</p>"
        )

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Official Form Assist Sheet - {escaped_scheme}</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }}
        .header {{ border-bottom: 3px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px; }}
        .header h1 {{ color: #0f766e; font-size: 20px; margin: 8px 0 5px; }}
        .header h2 {{ color: #111827; font-size: 16px; margin: 5px 0; font-weight: 600; }}
        .hint {{ color: #4b5563; font-size: 13px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        .section-title {{ background: #0f766e; color: white; padding: 10px; font-size: 16px; font-weight: bold; margin-top: 20px; }}
        .footer {{ margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; }}
        @media print {{ body {{ margin: 0; padding: 15px; }} .no-print {{ display: none; }} }}
    </style>
</head>
<body>
    <div class="no-print" style="background: #ecfeff; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
        <button onclick="window.print()" style="background: #0f766e; color: white; padding: 10px 20px; border: none; cursor: pointer; border-radius: 5px;">Print / Save</button>
        <span style="margin-left: 10px;">Official Form Assist Sheet</span>
    </div>
    
    <div class="header">
        <h1>Official Form Assist Sheet</h1>
        <h2>{escaped_scheme}</h2>
        <p class="hint">Use the links below to open/download the official government application form. This sheet is a helper for pre-filled values only.</p>
        <p style="color: #666; font-size: 12px;">Session ID: {session_id}</p>
        <p style="color: #666; font-size: 12px;">Date: {datetime.now().strftime('%d/%m/%Y')}</p>
    </div>

    <div class="section-title">Official Application Portal</div>
    {app_portal_html}

    <div class="section-title">Official Form Links</div>
    <ul>
        {links_html}
    </ul>

    <div class="section-title">Pre-Filled Data (Copy Into Official Form)</div>
    <table>
        {rows}
    </table>

    <div class="footer" style="font-size: 11px; color: #666;">
        <p><strong>Important:</strong> This is not an official government form. Submit only via official portal/form links above.</p>
        <p>Generated by KisanKiAwaaz Document Builder Assistant.</p>
    </div>
</body>
</html>"""

    # ── Download Generated Document ──────────────────────────────

    @staticmethod
    async def get_document_file(db, session_id: str) -> dict:
        """Get the generated document file path for download."""
        output_dir = "/tmp/generated_documents"
        
        # Check if file exists
        for fname in os.listdir(output_dir) if os.path.exists(output_dir) else []:
            if session_id[:8] in fname:
                return {
                    "filepath": os.path.join(output_dir, fname),
                    "filename": fname,
                    "exists": True,
                }
        
        # Try to regenerate
        session_doc = await db.collection("document_builder_sessions").document(session_id).get()
        if not session_doc.exists:
            raise not_found("Session not found")
        
        session = session_doc.to_dict()
        result = await DocumentBuilderService._generate_document(
            session_id=session_id,
            scheme_name=session.get("scheme_name", ""),
            filled_fields=session.get("filled_fields", {}) or {},
            application_url=session.get("application_url", ""),
            form_download_urls=session.get("form_download_urls", []),
            preferred_format=session.get("preferred_format", "html"),
        )
        
        return {
            "filepath": result["filepath"],
            "filename": result["filename"],
            "exists": True,
        }

