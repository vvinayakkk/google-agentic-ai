"""Core configuration and constants."""

from shared.core.config import get_settings, Settings
from shared.core.constants import (
    Firestore,
    FirestoreCollections,
    Qdrant,
    QdrantCollections,
    EMBEDDING_DIM,
    UserRole,
    CropSeason,
    SUPPORTED_LANGUAGES,
    DEFAULT_PAGE,
    DEFAULT_PER_PAGE,
    MAX_PER_PAGE,
)

__all__ = [
    "get_settings",
    "Settings",
    "Firestore",
    "Qdrant",
    "EMBEDDING_DIM",
    "UserRole",
    "CropSeason",
    "SUPPORTED_LANGUAGES",
    "DEFAULT_PAGE",
    "DEFAULT_PER_PAGE",
    "MAX_PER_PAGE",
]
