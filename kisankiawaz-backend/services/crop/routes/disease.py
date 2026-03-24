"""Crop disease detection route – POST /disease/detect."""

from fastapi import APIRouter, File, HTTPException, UploadFile

from shared.core.config import get_settings
from shared.middleware.auth import require_auth

from services.disease_service import analyze_crop_image

router = APIRouter(prefix="/disease", tags=["crop-doctor"])


@router.post("/detect")
async def detect_disease(
    image: UploadFile = File(...),
    _user: dict = require_auth,
):
    """Upload a crop image → get disease detection with bounding boxes."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    settings = get_settings()
    if not settings.GEMINI_API_KEY and not settings.gemini_api_keys_list:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    try:
        image_bytes = await image.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image file")

        result = await analyze_crop_image(image_bytes, settings.GEMINI_API_KEY)
        return result

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Disease detection failed: {exc}",
        ) from exc
