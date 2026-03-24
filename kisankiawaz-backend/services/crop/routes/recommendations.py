"""AI-powered crop recommendation route."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional

from shared.auth.deps import get_current_farmer
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus

from services.crop_service import CropService

router = APIRouter()


class RecommendationRequest(BaseModel):
    """Input for crop recommendation."""

    soil_type: str = Field(..., min_length=1, max_length=100)
    season: str = Field(..., min_length=1, max_length=50)
    state: Optional[str] = Field(default=None, max_length=100)

    model_config = {"strict": True}


@router.post("/recommendations", status_code=HttpStatus.OK)
async def get_recommendations(
    body: RecommendationRequest,
    _user: dict = Depends(get_current_farmer),
):
    """Return recommended crops based on soil/weather context."""
    db = get_async_db()
    return await CropService.get_recommendations(
        db=db, soil_type=body.soil_type, season=body.season, state=body.state,
    )
