from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "assets" / "templates"

_AMOUNT_PATTERNS = (
    re.compile(r"s\s*[/il|1]\s*\.?\s*([\d]{1,6}(?:[.,]\d{2})?)", re.IGNORECASE),
)
_OPERATION_PATTERNS = (
    re.compile(r"(?:operaci[oó]n|c[oó]digo(?:\s+de\s+seguridad)?)\D{0,15}(\d{6,15})", re.IGNORECASE),
    re.compile(r"n[°ºo]\.?\s*(\d{6,15})", re.IGNORECASE),
)
_PROVIDER_KEYWORDS = {
    "yape": ("yape", "yapeaste", "yapeo"),
    "plin": ("plin", "plin!", "interbank", "bbva", "scotiabank"),
}


class ProofValidationError(Exception):
    """Raised when an uploaded proof does not look like a Yape/Plin receipt."""


@dataclass
class ProofResult:
    valid: bool
    provider: str | None = None
    detected_amount: Decimal | None = None
    operation_code: str | None = None
    reasons: list[str] = field(default_factory=list)


def _load_cv():
    """Lazy import so the module loads even when OpenCV isn't installed."""
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "opencv-python-headless and numpy are required for proof validation"
        ) from exc
    return cv2, np


def _decode_gray(image_bytes: bytes):
    cv2, np = _load_cv()
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ProofValidationError(
            "No pudimos leer la imagen. Sube una captura válida de Yape o Plin."
        )
    return img


def _match_logo(img_gray, provider: str) -> float:
    cv2, _ = _load_cv()
    tpl_path = TEMPLATES_DIR / f"{provider}_logo.png"
    if not tpl_path.exists():
        return 0.0
    tpl = cv2.imread(str(tpl_path), cv2.IMREAD_GRAYSCALE)
    if tpl is None:
        return 0.0
    best = 0.0
    for scale in (0.4, 0.6, 0.8, 1.0, 1.25, 1.5, 2.0):
        resized = cv2.resize(tpl, None, fx=scale, fy=scale)
        if resized.shape[0] >= img_gray.shape[0] or resized.shape[1] >= img_gray.shape[1]:
            continue
        res = cv2.matchTemplate(img_gray, resized, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, _ = cv2.minMaxLoc(res)
        best = max(best, float(max_val))
    return best


def _detect_provider_by_logo(img_gray) -> tuple[str | None, float]:
    scores = {p: _match_logo(img_gray, p) for p in ("yape", "plin")}
    provider, score = max(scores.items(), key=lambda kv: kv[1])
    if score >= settings.proof_logo_match_threshold:
        return provider, score
    return None, score


def _detect_provider_by_text(text: str) -> str | None:
    lowered = text.lower()
    for provider, kws in _PROVIDER_KEYWORDS.items():
        if any(k in lowered for k in kws):
            return provider
    return None


def _ocr_text(img_gray) -> str:
    try:
        import pytesseract  # type: ignore
    except ImportError:
        return ""
    cv2, _ = _load_cv()
    img = cv2.bilateralFilter(img_gray, 9, 75, 75)
    _, img = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    try:
        return pytesseract.image_to_string(img, lang=settings.proof_tesseract_lang)
    except Exception as exc:  # noqa: BLE001
        logger.warning("tesseract ocr failed: %s", exc)
        return ""


def _parse_amount(text: str) -> Decimal | None:
    for pattern in _AMOUNT_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        raw = match.group(1).replace(",", ".")
        try:
            return Decimal(raw)
        except InvalidOperation:
            continue
    return None


def _parse_operation_code(text: str) -> str | None:
    for pattern in _OPERATION_PATTERNS:
        match = pattern.search(text)
        if match:
            return match.group(1)
    return None


def inspect_proof(
    image_bytes: bytes,
    expected_amount: Decimal | None = None,
    expected_method: str | None = None,
) -> ProofResult:
    """Run logo + OCR checks. Pure function, returns structured result."""
    img = _decode_gray(image_bytes)
    reasons: list[str] = []

    provider, score = _detect_provider_by_logo(img)
    text = _ocr_text(img)
    if provider is None:
        provider = _detect_provider_by_text(text)
        if provider is None:
            reasons.append("provider_not_detected")
        else:
            logger.info("provider detected via text fallback (logo score=%.2f)", score)

    if (
        provider is not None
        and expected_method is not None
        and provider != expected_method.lower()
    ):
        reasons.append(f"provider_mismatch:{provider}!={expected_method.lower()}")

    amount = _parse_amount(text)
    if amount is None:
        reasons.append("amount_not_found")
    elif expected_amount is not None and abs(amount - expected_amount) > Decimal("0.50"):
        reasons.append(f"amount_mismatch:{amount}!={expected_amount}")

    op_code = _parse_operation_code(text)
    if op_code is None:
        reasons.append("operation_code_missing")

    return ProofResult(
        valid=len(reasons) == 0,
        provider=provider,
        detected_amount=amount,
        operation_code=op_code,
        reasons=reasons,
    )


def validate_yape_plin_proof(
    image_bytes: bytes,
    expected_amount: Decimal | None = None,
    expected_method: str | None = None,
) -> ProofResult | None:
    """Raise ProofValidationError if the proof fails validation.

    When proof_validation_enabled is False (default) this is a no-op so dev/tests
    don't need Tesseract installed.
    """
    if not settings.proof_validation_enabled:
        return None

    result = inspect_proof(image_bytes, expected_amount, expected_method)
    if result.valid:
        return result

    if "provider_not_detected" in result.reasons:
        raise ProofValidationError(
            "La imagen no parece un comprobante de Yape/Plin. Sube la captura oficial."
        )
    if any(r.startswith("provider_mismatch") for r in result.reasons):
        raise ProofValidationError(
            f"El comprobante es de {result.provider} pero el organizador usa {expected_method}."
        )
    if "amount_not_found" in result.reasons:
        raise ProofValidationError(
            "No pudimos detectar el monto en la captura. Sube una imagen más clara."
        )
    if any(r.startswith("amount_mismatch") for r in result.reasons):
        raise ProofValidationError(
            f"El monto del comprobante (S/ {result.detected_amount}) no coincide con S/ {expected_amount}."
        )
    if "operation_code_missing" in result.reasons:
        raise ProofValidationError(
            "Falta el número de operación. Sube la captura completa de Yape/Plin."
        )
    raise ProofValidationError("Comprobante inválido.")
