from fastapi import APIRouter, Query, HTTPException
from fastapi import Body
from services.firebase import db

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
    """
    Given state and district, fetch the latest soil moisture data for that district and return Gemini-powered actionable suggestions.
    """
    try:
        from services.soil_moisture import get_soil_moisture_data
        # Get the latest soil data for the district
        records = get_soil_moisture_data(state, district)
        if not records:
            return {"suggestions": ["No soil data found for this district."]}
        # Use the most recent record
        latest = records[0]
        # Convert timestamps to strings for JSON serialization
        latest_serializable = convert_timestamps(latest)
        # Build a context string for Gemini
        context = f"Soil moisture data for {district}, {state}:\n" + json.dumps(latest_serializable, indent=2)
        # Build prompt for Gemini
        prompt = f"You are an expert agricultural assistant. Given the following latest soil moisture data for a district, provide 2-3 actionable, practical, and easy-to-understand suggestions for a farmer in that district. Use simple language.\n\n{context}"
        data = {
            "contents": [
                {"role": "user", "parts": [{"text": prompt}]}
            ]
        }
        import requests
        response = requests.post(GEMINI_API_URL, json=data)
        if response.status_code != 200:
            return {"suggestions": [f"Gemini API error: {response.text}"]}
        result = response.json()
        # Parse suggestions from the response
        suggestions = []
        try:
            text = result['candidates'][0]['content']['parts'][0]['text']
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
        except Exception as e:
            suggestions = [text]
        return {"suggestions": suggestions}
    except Exception as e:
        return {"suggestions": [f"Error: {str(e)}"]} 