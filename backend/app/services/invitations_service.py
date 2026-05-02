from __future__ import annotations

import secrets
import string

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Group, Invitation


_ALPHABET = string.ascii_uppercase + string.digits


def generate_invite_code(db: Session, length: int = 8, max_attempts: int = 30) -> str:
    """Return a unique alphanumeric invite_code not present in invitations or groups."""
    for _ in range(max_attempts):
        code = "".join(secrets.choice(_ALPHABET) for _ in range(length))
        clash_inv = db.execute(
            select(Invitation.id).where(Invitation.invite_code == code)
        ).first()
        clash_group = db.execute(
            select(Group.id).where(Group.invite_code == code)
        ).first()
        if clash_inv is None and clash_group is None:
            return code
    raise RuntimeError("Could not generate a unique invite code")
