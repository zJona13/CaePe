from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Plan, PlanCategory


CITY = "Chiclayo"


PLANS_CHICLAYO: list[dict] = [
    {
        "name": "Cancha de fulbito",
        "category": PlanCategory.deporte,
        "price_min": Decimal("60.00"),
        "price_max": Decimal("120.00"),
        "location": "Canchas sintéticas, Chiclayo",
        "description": "Reserva de cancha de fulbito por hora con pelota incluida.",
    },
    {
        "name": "Karaoke",
        "category": PlanCategory.fiesta,
        "price_min": Decimal("25.00"),
        "price_max": Decimal("60.00"),
        "location": "Centro de Chiclayo",
        "description": "Sala privada de karaoke por hora para grupos.",
    },
    {
        "name": "Chifa",
        "category": PlanCategory.comida,
        "price_min": Decimal("18.00"),
        "price_max": Decimal("45.00"),
        "location": "Av. Balta, Chiclayo",
        "description": "Cena en chifa con platos para compartir.",
    },
    {
        "name": "Pollería",
        "category": PlanCategory.comida,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("40.00"),
        "location": "Chiclayo",
        "description": "Cuarto o medio pollo a la brasa con guarniciones.",
    },
    {
        "name": "Cine",
        "category": PlanCategory.cultura,
        "price_min": Decimal("15.00"),
        "price_max": Decimal("28.00"),
        "location": "Real Plaza Chiclayo / Open Plaza",
        "description": "Entrada de cine 2D o 3D en mall.",
    },
    {
        "name": "Café",
        "category": PlanCategory.comida,
        "price_min": Decimal("10.00"),
        "price_max": Decimal("25.00"),
        "location": "Cafeterías del centro de Chiclayo",
        "description": "Café y postre para conversar.",
    },
    {
        "name": "Restaurante criollo",
        "category": PlanCategory.comida,
        "price_min": Decimal("25.00"),
        "price_max": Decimal("60.00"),
        "location": "Chiclayo",
        "description": "Almuerzo criollo: arroz con pato, seco de cabrito, etc.",
    },
    {
        "name": "Parrillas",
        "category": PlanCategory.comida,
        "price_min": Decimal("35.00"),
        "price_max": Decimal("80.00"),
        "location": "Chiclayo",
        "description": "Parrilla mixta con anticuchos, chorizos y carne.",
    },
    {
        "name": "Bar",
        "category": PlanCategory.fiesta,
        "price_min": Decimal("25.00"),
        "price_max": Decimal("80.00"),
        "location": "Calle San José / centro de Chiclayo",
        "description": "Bar con música y tragos para grupo.",
    },
    {
        "name": "Heladería",
        "category": PlanCategory.comida,
        "price_min": Decimal("8.00"),
        "price_max": Decimal("22.00"),
        "location": "Chiclayo",
        "description": "Helados artesanales y postres fríos.",
    },
    {
        "name": "Bowling",
        "category": PlanCategory.deporte,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("50.00"),
        "location": "Real Plaza Chiclayo",
        "description": "Línea de bowling por persona con zapatos incluidos.",
    },
    {
        "name": "Picnic",
        "category": PlanCategory.aire_libre,
        "price_min": Decimal("15.00"),
        "price_max": Decimal("40.00"),
        "location": "Paseo Yortuque / parque principal",
        "description": "Picnic grupal con comida llevada al aire libre.",
    },
    {
        "name": "Picantería",
        "category": PlanCategory.comida,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("50.00"),
        "location": "Monsefú / Chiclayo",
        "description": "Comida típica norteña en picantería.",
    },
    {
        "name": "Comida rápida",
        "category": PlanCategory.comida,
        "price_min": Decimal("12.00"),
        "price_max": Decimal("30.00"),
        "location": "Patio de comidas, Chiclayo",
        "description": "Combo de comida rápida en mall.",
    },
    {
        "name": "Discoteca",
        "category": PlanCategory.fiesta,
        "price_min": Decimal("30.00"),
        "price_max": Decimal("80.00"),
        "location": "Chiclayo",
        "description": "Cover de discoteca con consumo mínimo.",
    },
    {
        "name": "Juegos de mesa",
        "category": PlanCategory.otros,
        "price_min": Decimal("10.00"),
        "price_max": Decimal("30.00"),
        "location": "Café de juegos, Chiclayo",
        "description": "Tarde de juegos de mesa en local especializado.",
    },
    {
        "name": "Malecón/parque",
        "category": PlanCategory.aire_libre,
        "price_min": Decimal("0.00"),
        "price_max": Decimal("15.00"),
        "location": "Parque Principal / Paseo Yortuque",
        "description": "Caminata por parque o paseo, snacks opcionales.",
    },
    {
        "name": "Escape room",
        "category": PlanCategory.otros,
        "price_min": Decimal("30.00"),
        "price_max": Decimal("60.00"),
        "location": "Chiclayo",
        "description": "Sala de escape room por persona, 60 min.",
    },
    {
        "name": "Cevichería",
        "category": PlanCategory.comida,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("55.00"),
        "location": "Chiclayo / Pimentel",
        "description": "Almuerzo de ceviche y pescados.",
    },
    {
        "name": "Noche de películas",
        "category": PlanCategory.otros,
        "price_min": Decimal("5.00"),
        "price_max": Decimal("20.00"),
        "location": "Casa",
        "description": "Maratón de películas en casa con snacks.",
    },
    {
        "name": "Pizzería",
        "category": PlanCategory.comida,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("45.00"),
        "location": "Chiclayo",
        "description": "Pizza familiar para compartir.",
    },
    {
        "name": "Anticuchería",
        "category": PlanCategory.comida,
        "price_min": Decimal("15.00"),
        "price_max": Decimal("35.00"),
        "location": "Chiclayo",
        "description": "Anticuchos a la parrilla con papas y choclo.",
    },
    {
        "name": "Billar",
        "category": PlanCategory.deporte,
        "price_min": Decimal("10.00"),
        "price_max": Decimal("30.00"),
        "location": "Chiclayo",
        "description": "Mesa de billar por hora.",
    },
    {
        "name": "Fútbol semanal",
        "category": PlanCategory.deporte,
        "price_min": Decimal("8.00"),
        "price_max": Decimal("20.00"),
        "location": "Cancha barrial, Chiclayo",
        "description": "Cuota semanal de pichanga grupal.",
    },
    {
        "name": "Cumpleaños grupal",
        "category": PlanCategory.fiesta,
        "price_min": Decimal("30.00"),
        "price_max": Decimal("100.00"),
        "location": "Local privado, Chiclayo",
        "description": "Aporte por persona para celebración de cumpleaños.",
    },
    {
        "name": "Comida marina",
        "category": PlanCategory.comida,
        "price_min": Decimal("25.00"),
        "price_max": Decimal("70.00"),
        "location": "Pimentel / Santa Rosa",
        "description": "Restaurante de pescados y mariscos en la costa.",
    },
    {
        "name": "Pollada",
        "category": PlanCategory.comida,
        "price_min": Decimal("12.00"),
        "price_max": Decimal("25.00"),
        "location": "Local barrial",
        "description": "Tarjeta de pollada solidaria.",
    },
    {
        "name": "Alitas",
        "category": PlanCategory.comida,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("45.00"),
        "location": "Chiclayo",
        "description": "Alitas BBQ o picantes con papas.",
    },
    {
        "name": "Hamburguesas",
        "category": PlanCategory.comida,
        "price_min": Decimal("18.00"),
        "price_max": Decimal("40.00"),
        "location": "Chiclayo",
        "description": "Hamburguesa artesanal con guarnición.",
    },
    {
        "name": "Centro comercial",
        "category": PlanCategory.otros,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("80.00"),
        "location": "Real Plaza / Open Plaza Chiclayo",
        "description": "Tarde de mall: tiendas, comida y juegos.",
    },
]


def seed_plans(db: Session) -> tuple[int, int]:
    """Idempotent seed. Returns (inserted_now, total_in_db_after)."""
    inserted = 0
    for plan_data in PLANS_CHICLAYO:
        exists = db.execute(
            select(Plan).where(Plan.name == plan_data["name"], Plan.city == CITY)
        ).scalar_one_or_none()
        if exists:
            continue
        db.add(
            Plan(
                name=plan_data["name"],
                category=plan_data["category"],
                price_min=plan_data["price_min"],
                price_max=plan_data["price_max"],
                location=plan_data.get("location"),
                description=plan_data.get("description"),
                city=CITY,
                is_active=True,
            )
        )
        inserted += 1
    db.commit()
    total = db.execute(select(Plan).where(Plan.city == CITY)).scalars().all()
    return inserted, len(total)
