"""
LangExtract Integration for KisanKiAwaaz Document Builder.
Uses Google's LangExtract library to extract structured information from
farmer documents (Aadhaar, land records, bank passbooks, etc.) with
source-grounded, visual extraction using Gemini models.
"""

import os
import json
import logging
import tempfile
from typing import Dict, List, Optional, Any
from shared.services.api_key_allocator import get_api_key_allocator

logger = logging.getLogger(__name__)


# ── LangExtract Extraction Definitions ───────────────────────────

# Field extraction prompt for farmer documents
FARMER_DOC_EXTRACTION_PROMPT = """\
Extract all personally identifiable information (PII), agricultural details,
and government scheme related information from this document.
Use EXACT text from the document for extractions. Do not paraphrase.
Provide relevant attributes for each entity to add context."""

# Examples configuring what fields we want to extract from various document types
AADHAAR_EXAMPLES = None  # Will be built lazily
LAND_RECORD_EXAMPLES = None
BANK_PASSBOOK_EXAMPLES = None


def _get_aadhaar_examples():
    """Few-shot examples for Aadhaar card extraction."""
    import langextract as lx
    return [
        lx.data.ExampleData(
            text="Name: Ramesh Kumar Singh\nDate of Birth: 15/03/1985\nGender: Male\nAadhaar Number: 4567 8901 2345\nAddress: Village Rampur, Post Surajpur, Dist Azamgarh, Uttar Pradesh - 276001",
            extractions=[
                lx.data.Extraction(
                    extraction_class="person_name",
                    extraction_text="Ramesh Kumar Singh",
                    attributes={"field": "farmer_name", "confidence": "high"}
                ),
                lx.data.Extraction(
                    extraction_class="date_of_birth",
                    extraction_text="15/03/1985",
                    attributes={"field": "date_of_birth", "format": "DD/MM/YYYY"}
                ),
                lx.data.Extraction(
                    extraction_class="gender",
                    extraction_text="Male",
                    attributes={"field": "gender"}
                ),
                lx.data.Extraction(
                    extraction_class="aadhaar_number",
                    extraction_text="4567 8901 2345",
                    attributes={"field": "aadhaar_number", "formatted": "4567-8901-2345"}
                ),
                lx.data.Extraction(
                    extraction_class="address",
                    extraction_text="Village Rampur, Post Surajpur, Dist Azamgarh, Uttar Pradesh - 276001",
                    attributes={
                        "field": "address",
                        "village": "Rampur",
                        "district": "Azamgarh",
                        "state": "Uttar Pradesh",
                        "pincode": "276001",
                    }
                ),
            ]
        )
    ]


def _get_land_record_examples():
    """Few-shot examples for land record / khasra / khatauni extraction."""
    import langextract as lx
    return [
        lx.data.ExampleData(
            text="Khata No: 245/2023\nKhasra No: 112, 113, 114\nOwner: Suresh Yadav S/o Rajendra Yadav\nVillage: Bhadohi, Tehsil: Gopiganj\nDistrict: Bhadohi, State: Uttar Pradesh\nTotal Area: 3.5 Acres (1.42 Hectares)\nLand Type: Irrigated Agricultural\nSeason: Kharif - Paddy, Rabi - Wheat\nSurvey Year: 2023-24",
            extractions=[
                lx.data.Extraction(
                    extraction_class="land_owner",
                    extraction_text="Suresh Yadav S/o Rajendra Yadav",
                    attributes={
                        "field": "farmer_name",
                        "father_name": "Rajendra Yadav",
                    }
                ),
                lx.data.Extraction(
                    extraction_class="land_area",
                    extraction_text="3.5 Acres (1.42 Hectares)",
                    attributes={
                        "field": "land_area_acres",
                        "acres": "3.5",
                        "hectares": "1.42",
                    }
                ),
                lx.data.Extraction(
                    extraction_class="khasra_number",
                    extraction_text="112, 113, 114",
                    attributes={"field": "khasra_number"}
                ),
                lx.data.Extraction(
                    extraction_class="location",
                    extraction_text="Village: Bhadohi, Tehsil: Gopiganj",
                    attributes={
                        "village": "Bhadohi",
                        "tehsil": "Gopiganj",
                        "district": "Bhadohi",
                        "state": "Uttar Pradesh",
                    }
                ),
                lx.data.Extraction(
                    extraction_class="land_type",
                    extraction_text="Irrigated Agricultural",
                    attributes={
                        "field": "land_type",
                        "irrigation": "Irrigated",
                    }
                ),
                lx.data.Extraction(
                    extraction_class="crop_info",
                    extraction_text="Kharif - Paddy, Rabi - Wheat",
                    attributes={
                        "kharif_crop": "Paddy",
                        "rabi_crop": "Wheat",
                    }
                ),
            ]
        )
    ]


def _get_bank_passbook_examples():
    """Few-shot examples for bank passbook extraction."""
    import langextract as lx
    return [
        lx.data.ExampleData(
            text="State Bank of India\nBranch: Azamgarh\nAccount Holder: Ramesh Kumar\nAccount Number: 33245678901\nIFSC Code: SBIN0001234\nAccount Type: Savings\nBranch Code: 01234",
            extractions=[
                lx.data.Extraction(
                    extraction_class="account_holder",
                    extraction_text="Ramesh Kumar",
                    attributes={"field": "farmer_name"}
                ),
                lx.data.Extraction(
                    extraction_class="bank_account",
                    extraction_text="33245678901",
                    attributes={"field": "bank_account"}
                ),
                lx.data.Extraction(
                    extraction_class="ifsc_code",
                    extraction_text="SBIN0001234",
                    attributes={"field": "ifsc_code", "bank": "State Bank of India"}
                ),
                lx.data.Extraction(
                    extraction_class="bank_name",
                    extraction_text="State Bank of India",
                    attributes={"field": "bank_name", "branch": "Azamgarh"}
                ),
            ]
        )
    ]


# ── Extraction Functions ─────────────────────────────────────────


def extract_from_text(
    text: str,
    target_fields: List[str] = None,
    document_type: str = "auto",
    api_key: str = None,
) -> Dict[str, Any]:
    """
    Extract structured fields from text using LangExtract + Gemini.
    
    Args:
        text: The document text to extract from
        target_fields: List of field names we want to extract
        document_type: 'aadhaar', 'land_record', 'bank_passbook', or 'auto'
        api_key: Gemini API key (falls back to env var)
    
    Returns:
        Dict with extracted field→value mappings
    """
    try:
        import langextract as lx
    except ImportError:
        logger.error("langextract not installed. Run: pip install langextract")
        return {"error": "langextract not installed", "fields": {}}

    allocator = get_api_key_allocator()

    # Set API key
    if api_key:
        os.environ["LANGEXTRACT_API_KEY"] = api_key
    elif allocator.has_provider("gemini"):
        lease = allocator.acquire("gemini")
        os.environ["LANGEXTRACT_API_KEY"] = lease.key
        allocator.report_success(lease)
    elif not os.environ.get("LANGEXTRACT_API_KEY"):
        try:
            from shared.core.config import get_settings
            settings = get_settings()
            if settings.GEMINI_API_KEY:
                os.environ["LANGEXTRACT_API_KEY"] = settings.GEMINI_API_KEY
            else:
                return {"error": "Gemini key not configured", "fields": {}}
        except Exception:
            return {"error": "Gemini key not configured", "fields": {}}

    # Select examples based on document type
    if document_type == "aadhaar":
        examples = _get_aadhaar_examples()
    elif document_type == "land_record":
        examples = _get_land_record_examples()
    elif document_type == "bank_passbook":
        examples = _get_bank_passbook_examples()
    else:
        # Auto-detect: combine all examples
        examples = (
            _get_aadhaar_examples()
            + _get_land_record_examples()
            + _get_bank_passbook_examples()
        )

    # Build extraction prompt
    prompt = FARMER_DOC_EXTRACTION_PROMPT
    if target_fields:
        prompt += f"\n\nFocus on extracting these specific fields: {', '.join(target_fields)}"

    try:
        result = lx.extract(
            text_or_documents=text,
            prompt_description=prompt,
            examples=examples,
            model_id="gemini-2.5-flash",
            max_char_buffer=2000,
        )

        # Convert LangExtract result to field→value dict
        extracted = {}
        extractions_raw = []

        if hasattr(result, "extractions"):
            extractions_list = result.extractions
        elif hasattr(result, "annotated_text") and hasattr(result.annotated_text, "extractions"):
            extractions_list = result.annotated_text.extractions
        elif isinstance(result, dict):
            extractions_list = result.get("extractions", [])
        else:
            extractions_list = []

        for ext in extractions_list:
            ext_class = ext.extraction_class if hasattr(ext, "extraction_class") else ext.get("extraction_class", "")
            ext_text = ext.extraction_text if hasattr(ext, "extraction_text") else ext.get("extraction_text", "")
            attrs = ext.attributes if hasattr(ext, "attributes") else ext.get("attributes", {})

            extractions_raw.append({
                "class": ext_class,
                "text": ext_text,
                "attributes": attrs,
            })

            # Map to form fields
            field_name = attrs.get("field", "")
            if field_name and ext_text:
                extracted[field_name] = ext_text

            # Also extract nested attributes
            for attr_key, attr_val in attrs.items():
                if attr_key != "field" and attr_key != "confidence" and attr_val:
                    if attr_key in (target_fields or []):
                        extracted[attr_key] = str(attr_val)
                    # Common field mappings
                    elif attr_key in ("village", "district", "state", "pincode",
                                      "father_name", "tehsil", "bank", "branch"):
                        extracted[attr_key] = str(attr_val)

        return {
            "fields": extracted,
            "raw_extractions": extractions_raw,
            "extraction_count": len(extractions_raw),
            "method": "langextract",
        }

    except Exception as e:
        logger.error(f"LangExtract extraction failed: {e}")
        return {
            "fields": {},
            "error": str(e),
            "method": "langextract",
        }


def extract_from_file(
    file_path: str,
    target_fields: List[str] = None,
    document_type: str = "auto",
    api_key: str = None,
) -> Dict[str, Any]:
    """
    Extract structured data from a file (PDF, image, or text) using LangExtract.
    
    For PDFs and images, first converts to text using available tools,
    then runs LangExtract on the text.
    """
    ext = file_path.lower().rsplit(".", 1)[-1] if "." in file_path else ""

    # Read text content based on file type
    text = ""

    if ext == "pdf":
        # Try PyPDF2 / pdfplumber
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
        except ImportError:
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(file_path)
                for page in reader.pages:
                    text += page.extract_text() or ""
            except ImportError:
                # Fall back to reading raw bytes
                with open(file_path, "rb") as f:
                    raw = f.read()
                text = raw.decode("utf-8", errors="ignore")

    elif ext in ("jpg", "jpeg", "png", "bmp", "webp", "tiff"):
        # OCR with pytesseract or just pass to Gemini via LangExtract
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(file_path)
            text = pytesseract.image_to_string(img, lang="eng+hin")
        except ImportError:
            # Use Gemini vision to extract text
            try:
                import google.generativeai as genai
                import base64

                selected_key = os.environ.get("LANGEXTRACT_API_KEY", "")
                lease = None
                if allocator.has_provider("gemini"):
                    lease = allocator.acquire("gemini")
                    selected_key = lease.key
                if not selected_key:
                    raise ValueError("Gemini key not configured for OCR fallback")

                genai.configure(api_key=selected_key)
                model = genai.GenerativeModel("gemini-2.5-flash")

                with open(file_path, "rb") as f:
                    image_bytes = f.read()
                b64 = base64.b64encode(image_bytes).decode()
                mime = f"image/{ext}" if ext != "jpg" else "image/jpeg"

                response = model.generate_content([
                    {"mime_type": mime, "data": b64},
                    "Extract ALL text from this document image. Return the text exactly as it appears."
                ])
                text = response.text
                if lease:
                    allocator.report_success(lease)
            except Exception as e:
                if "lease" in locals() and lease is not None:
                    err_str = str(e).lower()
                    if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
                        allocator.report_rate_limited(lease, str(e))
                    else:
                        allocator.report_error(lease, str(e))
                logger.error(f"Image OCR failed: {e}")
                text = ""

    else:
        # Assume text file
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

    if not text.strip():
        return {"fields": {}, "error": "Could not extract text from file", "method": "langextract"}

    return extract_from_text(
        text=text,
        target_fields=target_fields,
        document_type=document_type,
        api_key=api_key,
    )


# ── Utility: Detect Document Type ────────────────────────────────

def detect_document_type(text: str) -> str:
    """Auto-detect document type from text content."""
    text_lower = text.lower()

    if any(k in text_lower for k in ["aadhaar", "unique identification", "uidai", "आधार"]):
        return "aadhaar"
    elif any(k in text_lower for k in ["khasra", "khatauni", "land record", "bhulekh",
                                         "patta", "jamabandi", "खसरा", "खतौनी"]):
        return "land_record"
    elif any(k in text_lower for k in ["passbook", "account number", "ifsc",
                                         "bank statement", "खाता"]):
        return "bank_passbook"
    return "auto"


# ── Quick Test ───────────────────────────────────────────────────

if __name__ == "__main__":
    # Test Aadhaar extraction
    sample_aadhaar = """
    भारत सरकार / Government of India
    विशिष्ट पहचान प्राधिकरण / Unique Identification Authority of India
    
    Name / नाम: Rajesh Kumar Singh
    Date of Birth / जन्म तिथि: 25/06/1980
    Gender / लिंग: Male / पुरुष
    Aadhaar Number: 9876 5432 1098
    Address: House No. 45, Village Chandpur, Post Office Mau,
    Tehsil Mau, District Azamgarh, Uttar Pradesh - 276001
    """

    sample_land = """
    Khasra Khatauni
    Khata Number: 578/2024
    Khasra No: 201, 202
    Name: Vikash Yadav
    Father's Name: Ram Prasad Yadav
    Village: Semra, Tehsil: Ghazipur
    District: Ghazipur, State: Uttar Pradesh
    Total Area: 5.2 Acres (2.1 Hectares)
    Land Classification: Irrigated (Canal)
    Current Crop: Sugarcane (Kharif)
    """

    print("=" * 60)
    print("Testing LangExtract - Aadhaar")
    print("=" * 60)
    result = extract_from_text(sample_aadhaar, document_type="aadhaar")
    print(json.dumps(result, indent=2, ensure_ascii=False))

    print("\n" + "=" * 60)
    print("Testing LangExtract - Land Record")
    print("=" * 60)
    result = extract_from_text(sample_land, document_type="land_record")
    print(json.dumps(result, indent=2, ensure_ascii=False))
