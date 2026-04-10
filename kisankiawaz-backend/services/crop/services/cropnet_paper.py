"""Experimental crop disease pipeline stub.

This file is intentionally NOT wired into any route, app startup, or service registry.
It is a storage-only prototype requested for future reference.
Do not import, load, or execute this module in production paths.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional


@dataclass(frozen=True)
class DiseaseDetectionResult:
    disease_name: str
    confidence: float
    lesion_bbox_xyxy: tuple[int, int, int, int]
    cropped_lesion_path: str


@dataclass(frozen=True)
class AdvisoryOutput:
    disease_description: str
    remedies: list[str]
    advisories: list[str]


def run_experimental_pipeline(
    image_bytes: bytes,
    optional_text: Optional[str],
    farmer_profile: dict[str, Any],
    model_path: str = "services/crop/models/DO_NOT_USE_dummy_disease_model.bin",
) -> dict[str, Any]:
    """Storage-only prototype flow; not connected to runtime.

    Intended conceptual flow:
    1) Receive image + optional text from frontend payload.
    2) Perform high-quality segmentation to isolate probable lesion region(s).
    3) Run a custom disease classifier model (placeholder path only).
    4) Extract disease area image patch and enrich with farmer profile context.
    5) Send disease label + context to a BERT-style open-source LLM pipeline.
    6) Return disease description and remedies.

    NOTE:
    - No actual model is loaded.
    - No segmentation/classification is executed.
    - This function is intentionally non-operational by design.
    """
    if not image_bytes:
        raise ValueError("image_bytes is required")

    model_file = Path(model_path)
    if not model_file.exists():
        # Keep this explicit so accidental runtime usage fails fast.
        raise FileNotFoundError(
            "Dummy model file not found. This stub is storage-only and not for runtime use."
        )

    # Intentionally do not load any model artifacts.
    # Intentionally do not perform segmentation/inference/LLM generation.
    return {
        "status": "stub_only",
        "message": "Experimental placeholder stored successfully. Not executable by design.",
        "received": {
            "image_bytes_len": len(image_bytes),
            "optional_text_present": bool(optional_text and optional_text.strip()),
            "farmer_profile_keys": sorted(list(farmer_profile.keys())),
            "model_path": str(model_file),
        },
        "pipeline_outline": [
            "segmentation",
            "custom_disease_model_inference",
            "lesion_context_extraction",
            "bert_llm_advisory_generation",
        ],
    }


if __name__ == "__main__":
    raise RuntimeError(
        "Do not execute experimental_disease_pipeline_stub.py directly. Storage-only artifact."
    )
