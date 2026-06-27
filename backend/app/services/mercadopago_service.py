from __future__ import annotations

import hashlib
import hmac
from decimal import Decimal

from app.config import settings


class MercadoPagoError(Exception):
    """El checkout no se pudo crear (credenciales faltantes o error del SDK)."""


def is_configured() -> bool:
    return bool(settings.mp_access_token)


def _sdk():
    """Crea el SDK de Mercado Pago. Import perezoso para no exigir la lib en tests."""
    if not is_configured():
        raise MercadoPagoError("MP_ACCESS_TOKEN no configurado")
    import mercadopago  # noqa: PLC0415

    return mercadopago.SDK(settings.mp_access_token)


def create_preference(
    *,
    title: str,
    amount: Decimal,
    external_reference: str,
    payer_email: str | None = None,
) -> dict:
    """Crea una preferencia de Checkout Pro y devuelve {id, init_point}.

    external_reference = id del billing_payment, para reconciliar en el webhook.
    """
    back_url = f"{settings.public_web_url.rstrip('/')}/billing/return"
    notification_url = f"{settings.api_public_url.rstrip('/')}/billing/webhook"
    body: dict = {
        "items": [
            {
                "title": title,
                "quantity": 1,
                "unit_price": float(amount),
                "currency_id": settings.mp_currency,
            }
        ],
        "external_reference": external_reference,
        "back_urls": {
            "success": back_url,
            "failure": back_url,
            "pending": back_url,
        },
        "auto_return": "approved",
        "notification_url": notification_url,
    }
    if payer_email:
        body["payer"] = {"email": payer_email}

    resp = _sdk().preference().create(body)
    data = resp.get("response", {}) if isinstance(resp, dict) else {}
    if not data.get("id"):
        raise MercadoPagoError(f"Respuesta inesperada de MP: {resp}")
    init_point = data.get("sandbox_init_point") if settings.mp_sandbox else data.get("init_point")
    return {
        "id": str(data["id"]),
        "init_point": init_point or data.get("init_point"),
    }


def get_payment(payment_id: str) -> dict:
    """Consulta un pago en MP. Devuelve el cuerpo (status, external_reference, ...)."""
    resp = _sdk().payment().get(payment_id)
    data = resp.get("response", {}) if isinstance(resp, dict) else {}
    if not data:
        raise MercadoPagoError(f"Pago {payment_id} no encontrado en MP")
    return data


def verify_signature(*, signature_header: str | None, request_id: str | None, data_id: str) -> bool:
    """Valida la firma x-signature del webhook contra MP_WEBHOOK_SECRET.

    Si no hay secreto configurado, no se valida (retorna True). El header tiene
    el formato 'ts=...,v1=...'; el manifest firmado es
    'id:{data_id};request-id:{request_id};ts:{ts};'.
    """
    if not settings.mp_webhook_secret:
        return True
    if not signature_header:
        return False
    parts = {}
    for chunk in signature_header.split(","):
        if "=" in chunk:
            k, v = chunk.split("=", 1)
            parts[k.strip()] = v.strip()
    ts = parts.get("ts")
    v1 = parts.get("v1")
    if not ts or not v1:
        return False
    # MP arma el manifest omitiendo las claves cuyo valor no exista. El id va en
    # minúsculas si es alfanumérico (los numéricos quedan igual).
    manifest = f"id:{str(data_id).lower()};"
    if request_id:
        manifest += f"request-id:{request_id};"
    manifest += f"ts:{ts};"
    expected = hmac.new(
        settings.mp_webhook_secret.encode(), manifest.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, v1)
