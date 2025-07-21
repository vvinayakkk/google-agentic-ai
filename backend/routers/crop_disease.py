from fastapi import APIRouter, UploadFile, File, HTTPException
from services.crop_disease import analyze_crop_image

router = APIRouter()

@router.post("/crop-disease/detect")
def detect_crop_disease(image: UploadFile = File(...)):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
    try:
        image_bytes = image.file.read()
        result = analyze_crop_image(image_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 