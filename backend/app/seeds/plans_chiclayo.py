from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Plan, PlanCategory


CITY = "Chiclayo"


# Restaurantes reales y reconocidos de Chiclayo / Lambayeque.
# price_min / price_max = rango de gasto aproximado POR PERSONA en soles.
PLANS_CHICLAYO: list[dict] = [
    {
        "name": "Fiesta Chiclayo Gourmet",
        "category": PlanCategory.comida,
        "price_min": Decimal("80.00"),
        "price_max": Decimal("200.00"),
        "location": "Av. Salaverry 1820, Urb. 3 de Octubre, Chiclayo",
        "description": "Alta cocina norteña: arroz con pato a la chiclayana y ceviche caliente.",
    },
    {
        "name": "El Rincón del Pato",
        "category": PlanCategory.comida,
        "price_min": Decimal("30.00"),
        "price_max": Decimal("65.00"),
        "location": "Av. Augusto B. Leguía 270, Lambayeque",
        "description": "Más de 20 recetas de pato: arroz con pato, seco y cebiche de pato.",
    },
    {
        "name": "Restaurant Hebrón",
        "category": PlanCategory.comida,
        "price_min": Decimal("25.00"),
        "price_max": Decimal("55.00"),
        "location": "Av. Balta 605, esq. M. M. Izaga, Chiclayo",
        "description": "Comida criolla y parrillas con buffet de fin de semana.",
    },
    {
        "name": "Restaurant Romana",
        "category": PlanCategory.comida,
        "price_min": Decimal("18.00"),
        "price_max": Decimal("45.00"),
        "location": "Av. Balta 512, Chiclayo",
        "description": "Clásico chiclayano: criollo, desayunos y dulces tradicionales.",
    },
    {
        "name": "El Huaralino",
        "category": PlanCategory.comida,
        "price_min": Decimal("30.00"),
        "price_max": Decimal("70.00"),
        "location": "Av. Vicente de la Vega, Chiclayo",
        "description": "Cabrito a la chiclayana, pescados y mariscos.",
    },
    {
        "name": "Sabores Peruanos",
        "category": PlanCategory.comida,
        "price_min": Decimal("28.00"),
        "price_max": Decimal("65.00"),
        "location": "Chiclayo",
        "description": "Pescados, mariscos y comida criolla del norte.",
    },
    {
        "name": "Restaurant El Pacífico",
        "category": PlanCategory.comida,
        "price_min": Decimal("30.00"),
        "price_max": Decimal("70.00"),
        "location": "Chiclayo",
        "description": "Especialidad en pescados y mariscos: tortilla de raya y chinguirito.",
    },
    {
        "name": "Chifa Luna Llena",
        "category": PlanCategory.comida,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("50.00"),
        "location": "Av. Grau 1086, Chiclayo",
        "description": "Chifa tradicional con platos grandes para compartir.",
    },
    {
        "name": "La Parra",
        "category": PlanCategory.comida,
        "price_min": Decimal("30.00"),
        "price_max": Decimal("75.00"),
        "location": "Av. Manuel M. Izaga, Chiclayo",
        "description": "Parrillas, carnes a la brasa y platos de chifa.",
    },
    {
        "name": "Marakos 490 Grill",
        "category": PlanCategory.comida,
        "price_min": Decimal("35.00"),
        "price_max": Decimal("85.00"),
        "location": "Av. Salaverry, Chiclayo",
        "description": "Parrilla y cortes de carne a la brasa para grupo.",
    },
    {
        "name": "Pardos Chicken",
        "category": PlanCategory.comida,
        "price_min": Decimal("25.00"),
        "price_max": Decimal("55.00"),
        "location": "Real Plaza Chiclayo, Av. Andrés A. Cáceres",
        "description": "Pollo a la brasa y parrillas en ambiente familiar.",
    },
    {
        "name": "Roky's",
        "category": PlanCategory.comida,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("45.00"),
        "location": "Av. Balta / Real Plaza, Chiclayo",
        "description": "Pollo a la brasa, parrillas y broaster.",
    },
    {
        "name": "Norky's",
        "category": PlanCategory.comida,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("45.00"),
        "location": "Chiclayo",
        "description": "Pollo a la brasa con guarniciones y combos para compartir.",
    },
    {
        "name": "Mi Tía",
        "category": PlanCategory.comida,
        "price_min": Decimal("10.00"),
        "price_max": Decimal("28.00"),
        "location": "Centro de Chiclayo",
        "description": "Sánguches, salchipapas y hamburguesas, ícono local económico.",
    },
    {
        "name": "Café 900",
        "category": PlanCategory.comida,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("55.00"),
        "location": "Centro histórico de Chiclayo",
        "description": "Café bar con piqueos, platos y tragos en casona republicana.",
    },
    {
        "name": "Mi Comedia",
        "category": PlanCategory.comida,
        "price_min": Decimal("25.00"),
        "price_max": Decimal("55.00"),
        "location": "Av. Balta, Chiclayo",
        "description": "Pizzas al horno y café en ambiente bohemio.",
    },
    {
        "name": "San Roque",
        "category": PlanCategory.comida,
        "price_min": Decimal("10.00"),
        "price_max": Decimal("35.00"),
        "location": "Av. Balta, Chiclayo",
        "description": "Dulcería tradicional: King Kong, postres y café.",
    },
    {
        "name": "El Cántaro",
        "category": PlanCategory.comida,
        "price_min": Decimal("30.00"),
        "price_max": Decimal("65.00"),
        "location": "Calle 2 de Mayo 180, Lambayeque",
        "description": "Comida típica lambayecana en casona tradicional.",
    },
    {
        "name": "Chifa Central",
        "category": PlanCategory.comida,
        "price_min": Decimal("18.00"),
        "price_max": Decimal("45.00"),
        "location": "Centro de Chiclayo",
        "description": "Chifa clásico del centro con platos para compartir.",
    },
    # --- DEPORTE ---
    {
        "name": "Canchas Sintéticas La Victoria",
        "category": PlanCategory.deporte,
        "price_min": Decimal("70.00"),
        "price_max": Decimal("130.00"),
        "location": "Distrito La Victoria, Chiclayo",
        "description": "Alquiler de cancha de fulbito por hora para el grupo.",
    },
    {
        "name": "Estadio Elías Aguirre",
        "category": PlanCategory.deporte,
        "price_min": Decimal("15.00"),
        "price_max": Decimal("60.00"),
        "location": "Av. Bolognesi, Chiclayo",
        "description": "Entrada a partido de fútbol en el estadio de la ciudad.",
    },
    {
        "name": "Complejo Deportivo IPD Chiclayo",
        "category": PlanCategory.deporte,
        "price_min": Decimal("10.00"),
        "price_max": Decimal("40.00"),
        "location": "Villa Deportiva IPD, Chiclayo",
        "description": "Uso de canchas y losas deportivas para fulbito o vóley.",
    },
    # --- FIESTA ---
    {
        "name": "Discoteca Premium",
        "category": PlanCategory.fiesta,
        "price_min": Decimal("30.00"),
        "price_max": Decimal("90.00"),
        "location": "Chiclayo",
        "description": "Cover y consumo en una de las discotecas más conocidas.",
    },
    {
        "name": "Gotika Discoteca",
        "category": PlanCategory.fiesta,
        "price_min": Decimal("25.00"),
        "price_max": Decimal("75.00"),
        "location": "Chiclayo",
        "description": "Discoteca con música variada y ambiente para grupo.",
    },
    {
        "name": "Gia Lounge",
        "category": PlanCategory.fiesta,
        "price_min": Decimal("30.00"),
        "price_max": Decimal("85.00"),
        "location": "Chiclayo",
        "description": "Lounge bar con cócteles y música en vivo.",
    },
    {
        "name": "Cyra Bar",
        "category": PlanCategory.fiesta,
        "price_min": Decimal("25.00"),
        "price_max": Decimal("70.00"),
        "location": "Chiclayo",
        "description": "Bar temático de cócteles para salir con amigos.",
    },
    {
        "name": "Bahía Club Pimentel",
        "category": PlanCategory.fiesta,
        "price_min": Decimal("35.00"),
        "price_max": Decimal("100.00"),
        "location": "Km 5.5 Carretera a Pimentel",
        "description": "Discoteca frente al mar en Pimentel.",
    },
    # --- CULTURA ---
    {
        "name": "Museo Tumbas Reales de Sipán",
        "category": PlanCategory.cultura,
        "price_min": Decimal("10.00"),
        "price_max": Decimal("20.00"),
        "location": "Av. Juan Pablo Vizcardo y Guzmán, Lambayeque",
        "description": "Museo del Señor de Sipán, tesoro arqueológico moche.",
    },
    {
        "name": "Museo Nacional Sicán",
        "category": PlanCategory.cultura,
        "price_min": Decimal("8.00"),
        "price_max": Decimal("15.00"),
        "location": "Av. Batán Grande, Ferreñafe",
        "description": "Museo de la cultura Sicán y sus tumbas de oro.",
    },
    {
        "name": "Museo Arqueológico Nacional Brüning",
        "category": PlanCategory.cultura,
        "price_min": Decimal("8.00"),
        "price_max": Decimal("15.00"),
        "location": "Av. Huamachuco, Lambayeque",
        "description": "Colección arqueológica de las culturas del norte.",
    },
    {
        "name": "Cineplanet Real Plaza Chiclayo",
        "category": PlanCategory.cultura,
        "price_min": Decimal("15.00"),
        "price_max": Decimal("30.00"),
        "location": "Real Plaza Chiclayo, Av. Andrés A. Cáceres",
        "description": "Entrada de cine 2D o 3D en el mall.",
    },
    # --- AIRE LIBRE ---
    {
        "name": "Playa Pimentel",
        "category": PlanCategory.aire_libre,
        "price_min": Decimal("0.00"),
        "price_max": Decimal("25.00"),
        "location": "Balneario de Pimentel",
        "description": "Día de playa y muelle, snacks y caballitos de totora.",
    },
    {
        "name": "Paseo Yortuque",
        "category": PlanCategory.aire_libre,
        "price_min": Decimal("0.00"),
        "price_max": Decimal("15.00"),
        "location": "Av. Sáenz Peña, Chiclayo",
        "description": "Parque temático con monumentos y pista para caminar.",
    },
    {
        "name": "Parque Principal de Chiclayo",
        "category": PlanCategory.aire_libre,
        "price_min": Decimal("0.00"),
        "price_max": Decimal("10.00"),
        "location": "Centro de Chiclayo",
        "description": "Plaza principal para pasear y tomar algo cerca.",
    },
    {
        "name": "Bosque de Pómac",
        "category": PlanCategory.aire_libre,
        "price_min": Decimal("15.00"),
        "price_max": Decimal("40.00"),
        "location": "Santuario Histórico, Ferreñafe",
        "description": "Caminata entre algarrobos y pirámides Sicán.",
    },
    {
        "name": "Reserva Ecológica Chaparrí",
        "category": PlanCategory.aire_libre,
        "price_min": Decimal("30.00"),
        "price_max": Decimal("70.00"),
        "location": "Chongoyape, Lambayeque",
        "description": "Reserva con osos de anteojos y fauna silvestre, con guía.",
    },
    # --- OTROS ---
    {
        "name": "Real Plaza Chiclayo",
        "category": PlanCategory.otros,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("80.00"),
        "location": "Av. Andrés A. Cáceres, Chiclayo",
        "description": "Tarde de mall: tiendas, cine, comida y juegos.",
    },
    {
        "name": "Mall Aventura Chiclayo",
        "category": PlanCategory.otros,
        "price_min": Decimal("20.00"),
        "price_max": Decimal("80.00"),
        "location": "Av. Augusto B. Leguía, Chiclayo",
        "description": "Centro comercial con tiendas, patio de comidas y entretenimiento.",
    },
    {
        "name": "Coney Park",
        "category": PlanCategory.otros,
        "price_min": Decimal("15.00"),
        "price_max": Decimal("60.00"),
        "location": "Mall Aventura Chiclayo",
        "description": "Juegos de arcade, bowling y atracciones para el grupo.",
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
