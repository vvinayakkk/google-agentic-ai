"""Async Firestore singleton initialisation and access."""

import logging
from typing import Optional

import firebase_admin
from firebase_admin import credentials, firestore_async, firestore

from shared.core.config import get_settings

logger = logging.getLogger("kisankiawaz.db.firebase")

_app: Optional[firebase_admin.App] = None


def init_firebase() -> firebase_admin.App:
    """Initialise the Firebase Admin SDK (idempotent)."""
    global _app
    if _app is not None:
        return _app

    try:
        _app = firebase_admin.get_app()
    except ValueError:
        settings = get_settings()
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        _app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialised")

    return _app


def get_firestore() -> firestore_async.AsyncClient:
    """Return an async Firestore client, initialising Firebase if needed."""
    init_firebase()
    return firestore_async.client()


def get_db() -> firestore.client:
    """Return a synchronous Firestore client (for Celery workers etc.)."""
    init_firebase()
    return firestore.client()


def close_firebase() -> None:
    """Delete the Firebase app instance (for graceful shutdown)."""
    global _app
    if _app is not None:
        firebase_admin.delete_app(_app)
        _app = None
        logger.info("Firebase Admin SDK shut down")
