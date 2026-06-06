from __future__ import annotations

import logging
import uuid
from typing import Any, Iterable

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import DeviceToken

logger = logging.getLogger(__name__)

_CHUNK = 100  # Expo acepta hasta 100 mensajes por request


def _tokens_for_users(db: Session, user_ids: Iterable[uuid.UUID]) -> list[str]:
    ids = {uid for uid in user_ids if uid is not None}
    if not ids:
        return []
    rows = db.execute(
        select(DeviceToken.token).where(DeviceToken.user_id.in_(ids))
    ).scalars().all()
    return list(dict.fromkeys(rows))  # dedupe, preserva orden


def send_expo_push(messages: list[dict[str, Any]]) -> None:
    """Best-effort POST a la API de Expo. Nunca lanza: solo loguea fallos.

    Llamar SIEMPRE después de db.commit() para no retener la transacción
    durante la I/O de red.
    """
    if not settings.push_enabled or not messages:
        return
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if settings.expo_access_token:
        headers["Authorization"] = f"Bearer {settings.expo_access_token}"
    try:
        with httpx.Client(timeout=8.0) as client:
            for i in range(0, len(messages), _CHUNK):
                batch = messages[i : i + _CHUNK]
                resp = client.post(settings.expo_push_url, json=batch, headers=headers)
                if resp.status_code >= 400:
                    logger.warning("Expo push fallo HTTP %s: %s", resp.status_code, resp.text[:500])
                    continue
                # Expo responde 200 aun cuando un mensaje falla: el error viene en
                # cada ticket (status='error': DeviceNotRegistered, MismatchSenderId,
                # InvalidCredentials...). Hay que inspeccionar el body, no solo el HTTP.
                try:
                    tickets = resp.json().get("data", [])
                except Exception:  # noqa: BLE001
                    tickets = []
                errors = [t for t in tickets if isinstance(t, dict) and t.get("status") == "error"]
                if errors:
                    detail = "; ".join(
                        f"{t.get('message')} [{(t.get('details') or {}).get('error')}]"
                        for t in errors
                    )
                    logger.warning(
                        "Expo push: %d ok, %d con error -> %s",
                        len(tickets) - len(errors), len(errors), detail,
                    )
                else:
                    logger.info("Expo push: %d enviados ok", len(tickets))
    except Exception as exc:  # noqa: BLE001 — push nunca debe tumbar el request
        logger.warning("No se pudo enviar push a Expo: %s", exc)


def notify_users(
    db: Session,
    user_ids: Iterable[uuid.UUID],
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> None:
    """Envía una push a todos los dispositivos registrados de esos usuarios."""
    ids = {uid for uid in user_ids if uid is not None}
    tokens = _tokens_for_users(db, ids)
    if not tokens:
        if ids:
            logger.warning(
                "push '%s': %d usuario(s) objetivo pero 0 tokens registrados "
                "(¿no dieron permiso de notificaciones / no abrieron la app tras instalar?)",
                title, len(ids),
            )
        return
    logger.info("push '%s': %d usuario(s) objetivo, %d token(s)", title, len(ids), len(tokens))
    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "data": data or {},
        }
        for token in tokens
    ]
    send_expo_push(messages)
