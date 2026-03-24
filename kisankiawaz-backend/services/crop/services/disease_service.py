"""Crop disease detection service using Gemini multimodal."""

import base64
import io
import json
import logging
import os

from PIL import Image
from pydantic import BaseModel, Field
from shared.services.api_key_allocator import get_api_key_allocator

logger = logging.getLogger(__name__)

FIXED_WIDTH = 512
FIXED_HEIGHT = 512


# ── Pydantic schemas ─────────────────────────────────────────────
class BoundingBox(BaseModel):
    x: float = Field(description="X position (percent, 0-100)")
    y: float = Field(description="Y position (percent, 0-100)")
    width: float = Field(description="Width (percent, 0-100)")
    height: float = Field(description="Height (percent, 0-100)")


class DiseaseDetection(BaseModel):
    disease_name: str = Field(description="Name of detected disease (English + Hindi)")
    confidence: float = Field(description="Confidence score 0-100")
    bounding_boxes: list[BoundingBox] = Field(description="Affected regions")
    bounding_box_explanation: str = Field(description="How boxes were determined")
    description: str = Field(description="Detailed disease description")
    symptoms: list[str] = Field(description="Observable symptoms")
    solutions: list[dict] = Field(
        description="List of {title, details} solution objects"
    )


# ── Prompt ────────────────────────────────────────────────────────
INDIAN_CROPS = [
    "rice/धान", "wheat/गेहूँ", "cotton/कपास", "sugarcane/गन्ना",
    "maize/मक्का", "pulses/दालें", "soybeans/सोयाबीन", "mustard/सरसों",
    "groundnut/मूंगफली", "millet/बाजरा", "potato/आलू", "tomato/टमाटर",
]

COMMON_DISEASES = [
    "blast/ब्लास्ट", "blight/झुलसा", "rust/रतुआ",
    "powdery mildew/चूर्णिल फफूंदी", "leaf spot/पत्ती धब्बा",
    "root rot/जड़ सड़न", "wilt/मुरझान", "mosaic virus/मोज़ेक वायरस",
]

SYSTEM_PROMPT = f"""You are an expert Indian agriculture disease detection system.
Given a crop image resized to {FIXED_WIDTH}x{FIXED_HEIGHT}px, return a JSON object.

CONTEXT: Focus on Indian crops: {', '.join(INDIAN_CROPS)}.
Known diseases: {', '.join(COMMON_DISEASES)}.

RETURN THIS EXACT JSON SCHEMA:
{{
  "disease_name": "Disease Name / हिंदी नाम",
  "confidence": 85.5,
  "bounding_boxes": [{{"x": 12.5, "y": 20.0, "width": 15.0, "height": 18.0}}],
  "bounding_box_explanation": "Why these regions were selected",
  "description": "Detailed description of the disease",
  "symptoms": ["Symptom 1", "Symptom 2"],
  "solutions": [
    {{"title": "Solution title", "details": "Detailed solution with Indian products"}}
  ]
}}

RULES:
- bounding_boxes: x/y/width/height as percentage (0-100). At least one box always.
- If healthy: disease_name="Healthy", confidence=100, one box covering (0,0,100,100).
- Include Hindi/local names alongside English.
- Solutions must prioritize low-cost options for Indian small farmers.
- Include specific product names available in Indian markets.
- ONLY return valid JSON, nothing else."""


async def analyze_crop_image(image_bytes: bytes, api_key: str) -> dict:
    """Analyze crop image for disease using Gemini multimodal."""
    if not image_bytes:
        raise ValueError("Empty image provided")

    # Resize to fixed dimensions
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize((FIXED_WIDTH, FIXED_HEIGHT))
    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    b64 = base64.b64encode(buf.getvalue()).decode()

    # Call Gemini with key-pool retries
    import google.generativeai as genai

    allocator = get_api_key_allocator()
    last_error: Exception | None = None

    for _ in range(3):
        lease = None
        selected_key = api_key
        if allocator.has_provider("gemini"):
            lease = allocator.acquire("gemini")
            selected_key = lease.key
        elif not selected_key:
            selected_key = os.getenv("GEMINI_API_KEY", "")

        if not selected_key:
            raise ValueError("Gemini API key is not configured")

        try:
            genai.configure(api_key=selected_key)
            model = genai.GenerativeModel("gemini-2.5-flash")

            response = await model.generate_content_async(
                [
                    SYSTEM_PROMPT,
                    {"mime_type": "image/jpeg", "data": base64.b64decode(b64)},
                ],
                generation_config={"response_mime_type": "application/json"},
            )
            if lease:
                allocator.report_success(lease)
            break
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            err_str = str(exc).lower()
            if lease:
                if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
                    allocator.report_rate_limited(lease, str(exc))
                else:
                    allocator.report_error(lease, str(exc))
            if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
                continue
            raise

    if last_error and "response" not in locals():
        raise last_error

    text = response.text.strip()
    logger.info("Gemini disease response length: %d", len(text))

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code block
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
            data = json.loads(text)
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            data = json.loads(text)
        else:
            raise ValueError(f"Invalid JSON from Gemini: {text[:200]}")

    # Validate against schema
    result = DiseaseDetection(**data)
    return result.model_dump()
