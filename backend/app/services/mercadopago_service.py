from __future__ import annotations

import hashlib
import hmac
import uuid
from decimal import Decimal

import httpx

from app.config import settings


class MercadoPagoError(Exception):
    """Un pago de Mercado Pago falló (rechazado, credenciales faltantes o red)."""

    def __init__(self, message: str, *, user_message: str | None = None) -> None:
        super().__init__(message)
        self.user_message = user_message or "No se pudo procesar el pago. Intenta con otra tarjeta."


def is_configured() -> bool:
    return bool(settings.mp_access_token)


# Mensajes amigables por status_detail de MP (los más comunes).
_DETAIL_MESSAGES = {
    "cc_rejected_insufficient_amount": "Fondos insuficientes en la tarjeta.",
    "cc_rejected_bad_filled_card_number": "Revisa el número de tarjeta.",
    "cc_rejected_bad_filled_date": "Revisa la fecha de vencimiento.",
    "cc_rejected_bad_filled_security_code": "Revisa el código de seguridad (CVV).",
    "cc_rejected_bad_filled_other": "Revisa los datos de la tarjeta.",
    "cc_rejected_high_risk": "El pago fue rechazado por seguridad. Usa otro medio.",
    "cc_rejected_call_for_authorize": "Debes autorizar el pago con tu banco.",
    "cc_rejected_card_disabled": "La tarjeta está inhabilitada. Llama a tu banco.",
    "cc_rejected_duplicated_payment": "Ya hiciste un pago igual. Espera un momento.",
    "cc_rejected_other_reason": "El banco rechazó el pago. Intenta con otra tarjeta.",
}


def _headers(idempotency_key: str | None = None) -> dict:
    h = {"Authorization": f"Bearer {settings.mp_access_token}"}
    if idempotency_key:
        h["X-Idempotency-Key"] = idempotency_key
    return h


def create_payment(
    *,
    token: str,
    amount: Decimal,
    email: str,
    payment_method_id: str,
    installments: int = 1,
    issuer_id: str | None = None,
    external_reference: str | None = None,
    metadata: dict | None = None,
    identification: dict | None = None,
) -> dict:
    """Crea un pago con un token de tarjeta (Checkout API). Devuelve el pago.

    El status puede ser approved / in_process / rejected. Lanza MercadoPagoError
    solo ante error de red o credenciales; el rechazo se refleja en el status.
    """
    if not is_configured():
        raise MercadoPagoError("MP_ACCESS_TOKEN no configurado", user_message="Pagos no disponibles.")

    payer: dict = {"email": email}
    if identification:
        payer["identification"] = identification

    body: dict = {
        "transaction_amount": float(Decimal(amount)),
        "token": token,
        "description": (metadata or {}).get("description", "CaePe"),
        "installments": installments,
        "payment_method_id": payment_method_id,
        "payer": payer,
    }
    if issuer_id:
        body["issuer_id"] = issuer_id
    if external_reference:
        body["external_reference"] = external_reference
    if metadata:
        body["metadata"] = metadata
    body["notification_url"] = f"{settings.api_public_url.rstrip('/')}/billing/webhook"

    try:
        resp = httpx.post(
            f"{settings.mp_api_base}/v1/payments",
            json=body,
            headers=_headers(idempotency_key=str(uuid.uuid4())),
            timeout=30.0,
        )
    except httpx.HTTPError as e:
        raise MercadoPagoError(f"Error de red con Mercado Pago: {e}") from e

    data = resp.json() if resp.content else {}
    if resp.status_code in (200, 201) and data.get("id"):
        print(
            f"[mp create_payment] OK id={data.get('id')} status={data.get('status')} "
            f"status_detail={data.get('status_detail')}"
        )
        return data

    print(f"[mp create_payment] FALLO http={resp.status_code} data={data}")
    msg = data.get("message") or "No se pudo procesar el pago."
    raise MercadoPagoError(f"MP {resp.status_code}: {data}", user_message=msg)


def get_payment(payment_id: str) -> dict:
    """Consulta un pago por id (fuente de verdad para el webhook)."""
    if not is_configured():
        raise MercadoPagoError("MP_ACCESS_TOKEN no configurado")
    try:
        resp = httpx.get(
            f"{settings.mp_api_base}/v1/payments/{payment_id}",
            headers=_headers(),
            timeout=30.0,
        )
    except httpx.HTTPError as e:
        raise MercadoPagoError(f"Error de red con Mercado Pago: {e}") from e
    data = resp.json() if resp.content else {}
    if resp.status_code == 200 and data.get("id"):
        return data
    raise MercadoPagoError(f"Pago {payment_id} no encontrado ({resp.status_code})")


def payment_is_approved(payment: dict) -> bool:
    return payment.get("status") == "approved"


def rejection_message(payment: dict) -> str:
    detail = payment.get("status_detail", "")
    return _DETAIL_MESSAGES.get(detail, "El pago fue rechazado. Intenta con otra tarjeta.")


def verify_signature(*, signature_header: str | None, request_id: str | None, data_id: str) -> bool:
    """Valida la firma x-signature del webhook si hay secreto configurado.

    Manifest: 'id:{data_id};request-id:{x-request-id};ts:{ts};' (omitiendo las
    claves sin valor). Si no hay secreto, no se valida (la verdad la da get_payment).
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
    manifest = f"id:{str(data_id).lower()};"
    if request_id:
        manifest += f"request-id:{request_id};"
    manifest += f"ts:{ts};"
    expected = hmac.new(
        settings.mp_webhook_secret.encode(), manifest.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, v1)
