"""Common / reusable response and pagination schemas."""

from typing import Any, Generic, List, TypeVar

from pydantic import BaseModel, Field

from shared.core.constants import DEFAULT_PAGE, DEFAULT_PER_PAGE, MAX_PER_PAGE

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Query-parameter model for paginated endpoints."""

    page: int = Field(default=DEFAULT_PAGE, ge=1)
    per_page: int = Field(default=DEFAULT_PER_PAGE, ge=1, le=MAX_PER_PAGE)

    model_config = {"strict": True}


class PaginatedResponse(BaseModel, Generic[T]):
    """Envelope for paginated list responses."""

    items: List[Any] = Field(default_factory=list)
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    per_page: int = Field(ge=1)
    total_pages: int = Field(ge=0)


class MessageResponse(BaseModel):
    """Simple single-message response."""

    message: str
