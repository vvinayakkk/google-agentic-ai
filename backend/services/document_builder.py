import os
import uuid
from typing import Optional, Tuple, List, Dict
from . import gemini
from fastapi import UploadFile
from PIL import Image
import pytesseract

temp_dir = "temp_documents"
os.makedirs(temp_dir, exist_ok=True)

def run_ocr(file: UploadFile) -> str:
    try:
        image = Image.open(file.file)
        text = pytesseract.image_to_string(image, lang='eng+hin')
        return text
    except Exception as e:
        raise Exception(f"OCR failed: {str(e)}")

def start_builder(scheme_name: Optional[str], file: Optional[UploadFile]) -> Tuple[List[Dict], Dict, List[Dict]]:
    ocr_text = None
    if file:
        ocr_text = run_ocr(file)
    history = []
    prompt = f"""
You are an assistant helping Indian farmers fill out official government scheme documents.\nGiven the following scheme name/description and (optionally) extracted text from a sample document, do the following:\n1. List all fields required for this scheme.\n2. Identify which fields are already present in the extracted text.\n3. For missing fields, generate friendly, conversational questions in Hinglish (mix of Hindi and English, e.g., 'Kisan Bhaiya, aapka Aadhaar number kya hai?').\n\nScheme: {scheme_name or ''}\nExtracted Text: {ocr_text or ''}\nRespond in JSON with keys: required_fields, present_fields, missing_fields, questions (list of {{field, question}}).\n"""
    history.append({"role": "user", "message": prompt})
    gemini_response = gemini.ask_gemini(prompt)
    history.append({"role": "assistant", "message": str(gemini_response)})
    if 'error' in gemini_response:
        raise Exception(f"Gemini error: {gemini_response['error']}")
    required_fields = gemini_response.get('required_fields', [])
    present_fields = gemini_response.get('present_fields', {})
    questions = gemini_response.get('questions', [])
    return questions, present_fields, history

def process_answers(all_fields: Dict, session_id: str, history: List[Dict], scheme_name: Optional[str], ocr_text: Optional[str]) -> Tuple[List[Dict], bool, Optional[str], List[Dict]]:
    prompt = f"""
You are an expert in creating official government documents for Indian farmers.\nGiven the following information, generate a bilingual (Hindi and English) official-looking document for the specified scheme.\nUse a formal style, include placeholders for signature and date, and format for easy printing.\n\nScheme: {scheme_name or ''}\nExtracted Text: {ocr_text or ''}\nFields: {all_fields}\nRespond in JSON with keys: document_ready (bool), questions (if any missing fields), document_content (if ready, as HTML or markdown).\n"""
    history.append({"role": "user", "message": prompt})
    gemini_response = gemini.ask_gemini(prompt)
    history.append({"role": "assistant", "message": str(gemini_response)})
    if 'error' in gemini_response:
        raise Exception(f"Gemini error: {gemini_response['error']}")
    if gemini_response.get('document_ready'):
        doc_content = gemini_response['document_content']
        file_path = os.path.join(temp_dir, f"{session_id}.pdf")
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        for line in doc_content.split('\n'):
            pdf.cell(200, 10, txt=line, ln=1, align='L')
        pdf.output(file_path)
        return [], True, f"/document-builder/download/{session_id}", history
    else:
        questions = gemini_response.get('questions', [])
        return questions, False, None, history

def get_document_path(session_id: str) -> Optional[str]:
    file_path = os.path.join(temp_dir, f"{session_id}.pdf")
    return file_path if os.path.exists(file_path) else None 