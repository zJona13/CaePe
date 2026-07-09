# -*- coding: utf-8 -*-
"""Seed de 20 usuarios demo (universitarios de Chiclayo) con actividad real en la app.

Inserta: 20 users (12 con compra premium, 2 con packs de créditos), 5 grupos,
10 eventos con participantes y pagos, todo escalonado en las últimas 6 semanas.

Uso:    cd backend && python -m app.seeds.demo_users
Idempotente: si algún email demo ya existe, aborta sin tocar nada.
Los emails demo llevan el sufijo "+caepe" para poder identificarlos/borrarlos.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app.db import SessionLocal
from app.models import (
    BillingKind,
    BillingPayment,
    BillingStatus,
    Event,
    EventParticipant,
    EventStatus,
    Group,
    GroupMember,
    GroupMemberRole,
    GroupMemberStatus,
    ParticipantPaymentStatus,
    PaymentMethod,
    Plan,
    User,
    UserPlan,
)

BASE = datetime(2026, 5, 25, tzinfo=timezone.utc)  # lunes, ~6 semanas atrás
PREMIUM_PRICE = Decimal("9.90")


def d(day: int, hour: int = 19) -> datetime:
    return BASE + timedelta(days=day, hours=hour)


# (nombre, email, teléfono, método, día_registro, [días_compra_premium])
USERS = [
    ("Diego Fernández Cieza", "diego.fernandezc+caepe@gmail.com", "941238756", "yape", 0, [2, 33]),
    ("Valeria Chávez Montenegro", "vchavezm+caepe@unprg.edu.pe", "957614382", "plin", 1, [4]),
    ("Sebastián Vílchez Torres", "sebasvilchez.t+caepe@gmail.com", "923485917", "yape", 3, [20]),
    ("Camila Puican Sandoval", "camila.puican+caepe@usat.pe", "968241735", "yape", 5, [8]),
    ("Jorge Llontop Ramírez", "jorge.llontopr+caepe@gmail.com", "934871260", "plin", 7, [16]),
    ("Fiorella Cabrera Díaz", "fiore.cabrerad+caepe@gmail.com", "976134582", "yape", 9, [21]),
    ("Renzo Ballena Suclupe", "rballenas+caepe@unprg.edu.pe", "912473865", "yape", 11, []),
    ("Andrea Mundaca Pérez", "andrea.mundacap+caepe@gmail.com", "945826371", "plin", 13, [18]),
    ("Kevin Santisteban Inoñán", "kevinsantisteban.i+caepe@gmail.com", "987351246", "yape", 15, [24]),
    ("Lucía Alarcón Bances", "lucia.alarconb+caepe@usat.pe", "931682457", "yape", 17, []),
    ("Piero Gonzáles Effio", "pierogonzalese+caepe@gmail.com", "964517823", "plin", 19, []),
    ("Micaela Serrato Chapoñán", "mica.serratoc+caepe@gmail.com", "958234617", "yape", 22, [26]),
    ("André Farro Custodio", "andre.farroc+caepe@uss.edu.pe", "926841375", "yape", 25, []),
    ("Daniela Ucañay Reque", "dani.ucanayr+caepe@gmail.com", "973462158", "plin", 27, [31]),
    ("Gustavo Siesquén Valdera", "gsiesquenv+caepe@unprg.edu.pe", "918536742", "yape", 30, []),
    ("Alexandra Neciosup Vidaurre", "alexa.neciosupv+caepe@gmail.com", "947128635", "yape", 32, [36]),
    ("Bruno Chirinos Salazar", "bruno.chirinoss+caepe@gmail.com", "962385174", "plin", 35, [39]),
    ("Ximena Ayasta Damián", "xime.ayastad+caepe@usat.pe", "935742861", "yape", 37, []),
    ("Rodrigo Esqueche Nunton", "rodrigo.esquechen+caepe@gmail.com", "981263547", "yape", 40, []),
    ("Brenda Capuñay Flores", "brenda.capunayf+caepe@gmail.com", "953817426", "plin", 42, []),
]

# (email_comprador, pack_code, monto, créditos, día)
CREDIT_BUYS = [
    ("rballenas+caepe@unprg.edu.pe", "credits_10", Decimal("8.00"), 10, 14),
    ("rodrigo.esquechen+caepe@gmail.com", "credits_25", Decimal("15.00"), 25, 41),
]

REFERRAL_CODES = [
    "K7PM2QX4", "T3WN8RJ2", "H9DK4VL6", "B2XR7MC5", "Q6FT1ZP8",
    "M4JW9SN3", "V8CL2HB7", "R5PQ6DK1", "Z1NM3XT9", "G7BS4WF2",
    "L2VH8QR6", "D9KT5JM4", "W3XC7PN1", "S6RB2LZ8", "F1QM9VH5",
    "N8JD4TW3", "C5ZP7KB2", "J2WF6RX9", "P4HN1MS7", "X9LT3QC6",
]

# (nombre, email_owner, día, invite_code, [emails_miembros])
GROUPS = [
    ("Los del quinto ciclo", "diego.fernandezc+caepe@gmail.com", 3, "5TOCICLO", [0, 1, 2, 4, 8, 9]),
    ("Chicas USAT", "camila.puican+caepe@usat.pe", 10, "USATGRLS", [3, 5, 7, 11, 17]),
    ("Fulbito de los jueves", "jorge.llontopr+caepe@gmail.com", 16, "FULBOJUE", [4, 6, 8, 10, 12, 14, 16]),
    ("Patas del barrio", "andrea.mundacap+caepe@gmail.com", 28, "PATASBRR", [7, 13, 15, 19, 9, 18]),
    ("Team parciales", "mica.serratoc+caepe@gmail.com", 34, "TPARCIAL", [11, 2, 13, 16, 17, 19]),
]

# (grupo_idx, organizador_idx, nombre, plan_seed, día_creado, budget, status,
#  n_pagados)  — participantes = miembros del grupo; funded ⇒ todos pagaron
EVENTS = [
    (0, 0, "Chifa por fin de parciales", "Chifa", 5, Decimal("120.00"), "funded", None),
    (1, 3, "Tarde de café", "Café", 12, Decimal("75.00"), "funded", None),
    (2, 4, "Fulbito jueves", "Cancha de fulbito", 17, Decimal("70.00"), "funded", None),
    (0, 1, "Karaoke sábado", "Karaoke", 19, Decimal("150.00"), "funded", None),
    (2, 4, "Fulbito + alitas", "Alitas", 24, Decimal("140.00"), "funded", None),
    (1, 5, "Cine martes 2x1", "Cine", 26, Decimal("60.00"), "active", 3),
    (3, 7, "Cumple de Brenda", "Cumpleaños grupal", 30, Decimal("240.00"), "funded", None),
    (4, 11, "Pizza post estudio", "Pizzería", 36, Decimal("108.00"), "active", 4),
    (2, 6, "Pichanga + parrilla", "Parrillas", 38, Decimal("175.00"), "active", 2),
    (4, 16, "Cevichería domingo", "Cevichería", 41, Decimal("180.00"), "draft", 0),
]


def run() -> None:
    db = SessionLocal()
    try:
        emails = [u[1] for u in USERS]
        existing = db.execute(select(User.email).where(User.email.in_(emails))).scalars().all()
        if existing:
            print(f"Abortado: ya existen {len(existing)} emails demo (ej. {existing[0]}). Nada que hacer.")
            return

        now = datetime.now(timezone.utc)
        users: list[User] = []
        for i, (name, email, phone, method, day, premium_days_bought) in enumerate(USERS):
            premium_until = None
            for buy_day in premium_days_bought:
                base = premium_until if (premium_until and premium_until > d(buy_day)) else d(buy_day)
                premium_until = base + timedelta(days=30)
            u = User(
                name=name,
                email=email,
                phone=phone,
                payment_method=PaymentMethod(method),
                payment_number=phone,
                plan=UserPlan.premium if (premium_until and premium_until > now) else UserPlan.free,
                premium_until=premium_until,
                referral_code=REFERRAL_CODES[i],
                created_at=d(day, 10 + i % 9),
            )
            db.add(u)
            users.append(u)
        db.flush()

        by_email = {u.email: u for u in users}

        # Pagos premium aprobados (Mercado Pago; mp_payment_id NULL = seed, nunca
        # colisiona con webhooks reales)
        n_payments = 0
        for name, email, phone, method, day, premium_days_bought in USERS:
            for buy_day in premium_days_bought:
                db.add(BillingPayment(
                    user_id=by_email[email].id,
                    kind=BillingKind.premium,
                    pack_code="premium_month",
                    amount=PREMIUM_PRICE,
                    currency="PEN",
                    status=BillingStatus.approved,
                    premium_days=30,
                    created_at=d(buy_day, 20),
                    confirmed_at=d(buy_day, 20) + timedelta(minutes=2),
                ))
                n_payments += 1
        for email, pack, amount, credits, buy_day in CREDIT_BUYS:
            u = by_email[email]
            u.event_credits += credits
            db.add(BillingPayment(
                user_id=u.id,
                kind=BillingKind.credits,
                pack_code=pack,
                amount=amount,
                currency="PEN",
                status=BillingStatus.approved,
                credits_granted=credits,
                created_at=d(buy_day, 21),
                confirmed_at=d(buy_day, 21) + timedelta(minutes=2),
            ))
            n_payments += 1

        # Grupos + miembros
        groups: list[Group] = []
        for gname, owner_email, day, code, member_idxs in GROUPS:
            g = Group(name=gname, owner_id=by_email[owner_email].id, invite_code=code, created_at=d(day, 18))
            db.add(g)
            db.flush()
            for idx in member_idxs:
                member = users[idx]
                role = GroupMemberRole.owner if member.email == owner_email else GroupMemberRole.member
                db.add(GroupMember(group_id=g.id, user_id=member.id, role=role, status=GroupMemberStatus.active))
            groups.append(g)

        # Eventos + participantes con pagos
        plan_rows = {p.name: p for p in db.execute(select(Plan).where(Plan.city == "Chiclayo")).scalars()}
        n_participants = 0
        for g_idx, org_idx, ename, plan_name, day, budget, status, n_paid in EVENTS:
            group_def = GROUPS[g_idx]
            member_idxs = group_def[4]
            n = len(member_idxs)
            per_person = (budget / n).quantize(Decimal("0.01"))
            plan = plan_rows.get(plan_name)
            ev = Event(
                group_id=groups[g_idx].id,
                organizer_id=users[org_idx].id,
                plan_id=plan.id if plan else None,
                name=ename,
                date=(BASE + timedelta(days=day + 3)).date(),
                time=time(20, 0),
                location=plan.location if plan else "Chiclayo centro",
                total_budget=budget,
                amount_per_person=per_person,
                status=EventStatus(status),
                created_at=d(day, 15),
            )
            db.add(ev)
            db.flush()
            paid_count = n if status == "funded" else (n_paid or 0)
            for j, idx in enumerate(member_idxs):
                member = users[idx]
                paid = j < paid_count
                db.add(EventParticipant(
                    event_id=ev.id,
                    user_id=member.id,
                    name=member.name,
                    phone=member.phone,
                    amount_due=per_person,
                    payment_status=ParticipantPaymentStatus.paid if paid else ParticipantPaymentStatus.pending,
                    paid_at=d(day + 1 + j % 3, 12 + j) if paid else None,
                ))
                n_participants += 1

        db.commit()
        print(f"OK: {len(users)} users, {n_payments} billing_payments, {len(groups)} groups, "
              f"{len(EVENTS)} events, {n_participants} participants.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
