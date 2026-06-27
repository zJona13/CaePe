from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class CreditPack:
    """Un pack de créditos comprable. 1 crédito = 1 evento extra, sin vencimiento."""

    code: str
    credits: int
    price: Decimal
    title: str


# Catálogo de packs de créditos (precios confirmados por el usuario, en soles).
CREDIT_PACKS: dict[str, CreditPack] = {
    "credits_10": CreditPack("credits_10", 10, Decimal("8.00"), "10 créditos"),
    "credits_25": CreditPack("credits_25", 25, Decimal("15.00"), "25 créditos"),
}

# Producto Premium: un mes de eventos ilimitados.
PREMIUM_CODE = "premium_month"
PREMIUM_PRICE = Decimal("9.90")
PREMIUM_TITLE = "Premium · 1 mes"


def get_credit_pack(code: str) -> CreditPack | None:
    return CREDIT_PACKS.get(code)
