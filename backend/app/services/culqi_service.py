from __future__ import annotations

import hashlib
import hmac
from decimal import Decimal

import httpx

from app.config import settings


class CulqiError(Exception):
    """Un cargo de Culqi falló (rechazado, credenciales faltantes o error de red)."""

    def __init__(self, message: str, *, user_message: str | None = None) -> None:
        super().__init__(message)
        self.user_message = user_message or "No se pudo procesar el pago. Intenta con otra tarjeta."


def is_configured() -> bool:
    return bool(settings.culqi_secret_key)


def to_cents(amount: Decimal) -> int:
    """Culqi cobra en céntimos enteros: S/ 8.00 -> 800."""
    return int((Decimal(amount) * 100).to_integral_value())


def create_charge(*, token: str, amount: Decimal, email: str, metadata: dict | None = None) -> dict:
    """Crea un cargo en Culqi con un token de tarjeta/Yape. Devuelve el cargo.

    Lanza CulqiError si el cargo no es exitoso (rechazo, error, etc.).
    """
    if not is_configured():
        raise CulqiError("CULQI_SECRET_KEY no configurado", user_message="Pagos no disponibles.")

    payload = {
        "amount": to_cents(amount),
        "currency_code": settings.currency,
        "email": email,
        "source_id": token,
    }
    if metadata:
        payload["metadata"] = metadata

    try:
        resp = httpx.post(
            f"{settings.culqi_api_base}/charges",
            json=payload,
            headers={"Authorization": f"Bearer {settings.culqi_secret_key}"},
            timeout=30.0,
        )
    except httpx.HTTPError as e:
        raise CulqiError(f"Error de red con Culqi: {e}") from e

    data = resp.json() if resp.content else {}
    if resp.status_code in (200, 201) and data.get("object") == "charge":
        return data

    # Culqi devuelve un objeto de error con user_message legible.
    msg = data.get("merchant_message") or data.get("user_message") or data.get("message")
    raise CulqiError(
        f"Cargo rechazado ({resp.status_code}): {data}",
        user_message=msg or "El pago fue rechazado. Intenta con otra tarjeta.",
    )


def get_charge(charge_id: str) -> dict:
    """Consulta un cargo por id (fuente de verdad para el webhook)."""
    if not is_configured():
        raise CulqiError("CULQI_SECRET_KEY no configurado")
    try:
        resp = httpx.get(
            f"{settings.culqi_api_base}/charges/{charge_id}",
            headers={"Authorization": f"Bearer {settings.culqi_secret_key}"},
            timeout=30.0,
        )
    except httpx.HTTPError as e:
        raise CulqiError(f"Error de red con Culqi: {e}") from e
    data = resp.json() if resp.content else {}
    if resp.status_code == 200 and data.get("object") == "charge":
        return data
    raise CulqiError(f"Cargo {charge_id} no encontrado ({resp.status_code})")


def charge_is_paid(charge: dict) -> bool:
    """Un cargo está pagado si su outcome es 'venta_exitosa'."""
    outcome = charge.get("outcome") or {}
    return outcome.get("type") == "venta_exitosa"


def verify_signature(*, signature_header: str | None, raw_body: bytes) -> bool:
    """Valida la firma del webhook (HMAC-SHA256 del cuerpo) si hay secreto.

    Si no hay secreto configurado, no se valida (la verdad la da get_charge()).
    """
    if not settings.culqi_webhook_secret:
        return True
    if not signature_header:
        return False
    expected = hmac.new(
        settings.culqi_webhook_secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header.strip())
