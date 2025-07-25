from fastapi import APIRouter, Query, HTTPException
from fastapi import Body
from services.firebase import db
import json
import datetime
import os
import google.generativeai as genai

# Utility to convert timestamps in dicts/lists to strings
def convert_timestamps(obj):
    if isinstance(obj, dict):
        return {k: convert_timestamps(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_timestamps(i) for i in obj]
    elif hasattr(obj, 'isoformat'):
        return obj.isoformat()
    else:
        return obj

# Gemini API setup
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=GEMINI_API_KEY)

router = APIRouter()

@router.get("/soil-moisture")
def get_soil_data():
    """
    Endpoint to get soil moisture data from Firestore (not API).
    """
    try:
        doc_ref = db.collection('soil_data').document('latest')
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="No soil data found.")
        data = doc.to_dict().get('data', [])
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.post("/soil-moisture/ai-suggestion")
def soil_moisture_ai_suggestion(
    state: str = Body(..., embed=True),
    district: str = Body(..., embed=True)
):
    try:
        from services.soil_moisture import get_soil_moisture_data
        records = get_soil_moisture_data(state, district)
        if not records:
            return {"suggestions": ["No soil data found for this district."]}
        latest = records[0]
        latest_serializable = convert_timestamps(latest)
        context = f"Soil moisture data for {district}, {state}:\n" + json.dumps(latest_serializable, indent=2)
        prompt = (
            "You are a friendly voice assistant for farmers. Give 1-2 SHORT suggestions based on this soil data. "
            "Keep it conversational and under 25 words total.\n\n" + context
        )
        # Use Gemini 2.5 Flash model
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        text = response.text
        suggestions = []
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue
            if line[0] in {'-', '•'} or line[:2].isdigit() or line[:1].isdigit():
                line = line.lstrip('-•1234567890. ').strip()
                if line:
                    suggestions.append(line)
            if len(suggestions) == 3:
                break
        if len(suggestions) < 3:
            for line in text.split('\n'):
                line = line.strip()
                if line and line not in suggestions:
                    suggestions.append(line)
                if len(suggestions) == 3:
                    break
        return {"suggestions": suggestions}
    except Exception as e:
        return {"suggestions": [f"Error: {str(e)}"]} 