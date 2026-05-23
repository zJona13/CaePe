from __future__ import annotations

import base64
import logging
import re

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_VISION_URL = "https://vision.googleapis.com/v1/images:annotate"
_KEYWORDS = ("yape", "plin", "yapeaste", "yapeo", "plin!")
_AMOUNT_RE = re.compile(r"s/\.?\s*\d", re.IGNORECASE)


class ProofValidationError(Exception):
    """Raised when an uploaded proof does not look like a Yape/Plin receipt."""


def _ocr_text(image_bytes: bytes) -> str:
    """Call Google Vision OCR and return the detected text. Empty string on failure."""
    if not settings.google_vision_api_key:
        return ""
    payload = {
        "requests": [
            {
                "image": {"content": base64.b64encode(image_bytes).decode("ascii")},
                "features": [{"type": "TEXT_DETECTION", "maxResults": 1}],
            }
        ]
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(
                _VISION_URL,
                params={"key": settings.google_vision_api_key},
                json=payload,
            )
        r.raise_for_status()
        data = r.json()
        responses = data.get("responses") or []
        if not responses:
            return ""
        annotation = responses[0].get("fullTextAnnotation")
        if annotation and annotation.get("text"):
            return annotation["text"]
        textual = responses[0].get("textAnnotations") or []
        if textual:
            return textual[0].get("description", "")
    except Exception as exc:  # noqa: BLE001 — surface network/parse errors as failed OCR
        logger.warning("vision ocr failed: %s", exc)
    return ""


def validate_yape_plin_proof(image_bytes: bytes) -> None:
    """Raise ProofValidationError if OCR text lacks Yape/Plin markers.

    When google_vision_enabled is False (default) this is a no-op so dev/tests
    don't need credentials.
    """
    if not settings.google_vision_enabled:
        return
    text = _ocr_text(image_bytes).lower()
    if not text:
        raise ProofValidationError(
            "No pudimos leer el comprobante. Sube una captura clara de Yape o Plin."
        )
    has_keyword = any(k in text for k in _KEYWORDS)
    has_amount = bool(_AMOUNT_RE.search(text))
    if not (has_keyword and has_amount):
        raise ProofValidationError(
            "La imagen no parece un comprobante de Yape/Plin. Sube la captura oficial."
        )
