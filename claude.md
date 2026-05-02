# CaePe — Prompts secuenciales para Claude Code

> Pegar uno por sesión, en orden. Esperar criterios de aceptación verdes antes de pasar al siguiente.

---

## FASE 0 — Scaffolding & Foundation

```
## Contexto (mantener entre fases)
- Proyecto: CaePe — app social móvil para jóvenes peruanos (18–30) que organiza salidas grupales, divide presupuesto y confirma pagos. La app NO retiene dinero (Yape/Plin externo).
- Stack frontend: React Native + Expo SDK 54 + TypeScript + expo-router + Zustand
- Stack backend: FastAPI 0.115+ / Python 3.11 / Pydantic v2 / SQLAlchemy 2 / PostgreSQL
- Auth: Supabase Auth (Fase 1)
- Notif: Firebase Cloud Messaging (Fase 4)
- Infra: Cloud Run + Supabase Postgres + Expo EAS + GitHub Actions (Fase 4)
- Estrategia: 5 fases secuenciales — esta es FASE 0.

## Objetivo
Crear el scaffolding mínimo del monorepo CaePe: backend FastAPI booteable y mobile Expo arrancable, conectados localmente. SIN lógica de negocio.

## Estado objetivo
caepe/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app + GET /health
│   │   ├── config.py          # Settings con pydantic-settings
│   │   └── db.py              # SQLAlchemy engine + session (placeholder, sin tablas aún)
│   ├── tests/test_health.py
│   ├── requirements.txt
│   ├── .env.example
│   └── pyproject.toml
├── mobile/
│   ├── app/(tabs)/index.tsx   # Home placeholder con fetch a /health
│   ├── app/_layout.tsx
│   ├── package.json
│   ├── app.json
│   ├── tsconfig.json
│   └── .env.example
├── .gitignore
└── README.md                  # Comandos exactos para correr backend + mobile local

## Alcance
- Trabaja SOLO en la estructura listada arriba
- NO toques: nada fuera de esa lista. Sin lógica de negocio, sin endpoints aparte de /health, sin pantallas aparte del Home.

## Restricciones
- Sin Docker en esta fase (va en Fase 4)
- Sin dependencias adicionales fuera de FastAPI, uvicorn, pydantic-settings, sqlalchemy, pytest, httpx (backend) y expo, expo-router, react-native (mobile). Si una falta, pregunta antes de añadirla.
- Solo realiza cambios pedidos directamente. NO agregues features, abstracciones, configuraciones, linters, pre-commit hooks, ni archivos fuera del estado objetivo.

## Criterios de aceptación
- [ ] `cd backend && uvicorn app.main:app --reload` levanta sin errores
- [ ] GET http://localhost:8000/health responde {"status":"ok"}
- [ ] `cd mobile && npx expo start` arranca y la pantalla Home renderiza el resultado de /health
- [ ] `cd backend && pytest` pasa con test_health.py verde
- [ ] README.md tiene los comandos exactos para los 4 puntos anteriores

## Stop conditions
Pregunta antes de:
- Agregar cualquier dependencia no listada
- Crear archivos fuera de la estructura definida
- Cambiar versiones de stack

## Progreso
Después de cada paso: ✅ [qué se completó] — [archivo(s)]

Think carefully and step-by-step before starting.
```

---

## FASE 1 — Backend: Data + Auth

```
## Contexto (mantener entre fases)
- Proyecto: CaePe (Fase 1). Viene de Fase 0 con scaffolding completo, /health funcional, ambos servicios arrancan.
- Stack: FastAPI 0.115+ / Pydantic 2 / SQLAlchemy 2 / Alembic / PostgreSQL / Supabase Auth.
- Reglas de negocio clave (informativas para esta fase):
  - App NO retiene dinero
  - Organizador crea evento
  - Evento se marca "fondeado" cuando todos los participantes pagan

## Objetivo
Construir capa de datos completa + auth Supabase + seed de 30 planes Chiclayo. Solo backend en esta fase.

## Estado objetivo
backend/app/
├── models.py              # SQLAlchemy: User, Group, GroupMember, Plan, Event, EventParticipant, Payment, Invitation
├── schemas.py             # Pydantic: *Create, *Read, *Update por entidad
├── deps.py                # get_db, get_current_user (verifica JWT Supabase)
├── auth.py                # Verificación JWT contra Supabase JWKS
├── routers/__init__.py
├── routers/auth.py        # POST /auth/register, POST /auth/login, GET /auth/me
├── routers/plans.py       # GET /plans (con filtros), GET /plans/random, POST /plans/seed
├── seeds/plans_chiclayo.py
└── alembic/               # init + migración inicial con las 8 tablas

backend/tests/
├── test_auth.py
└── test_plans.py

## Esquema obligatorio (DDL)
- users(id UUID PK, email UNIQUE NOT NULL, phone, name, payment_method ENUM('yape','plin'), payment_number, created_at)
- groups(id UUID PK, name, owner_id FK→users, invite_code UNIQUE, created_at)
- group_members(id UUID PK, group_id FK, user_id FK NULL, role, status, UNIQUE(group_id,user_id))
- plans(id UUID PK, name, category ENUM('comida','deporte','fiesta','cultura','aire_libre','otros'), price_min NUMERIC, price_max NUMERIC, location, description, city, is_active BOOL DEFAULT true)
- events(id UUID PK, group_id FK, organizer_id FK, plan_id FK NULL, name, date, time, location, total_budget NUMERIC, amount_per_person NUMERIC, status ENUM('draft','active','funded','cancelled') DEFAULT 'draft', created_at)
- event_participants(id UUID PK, event_id FK, user_id FK NULL, name, phone, amount_due NUMERIC, payment_status ENUM('pending','paid') DEFAULT 'pending', proof_image_url NULL, paid_at NULL)
- payments(id UUID PK, event_id FK, participant_id FK, amount NUMERIC, status, proof_image_url NULL, confirmed_by FK NULL, confirmed_at NULL)
- invitations(id UUID PK, group_id FK NULL, event_id FK NULL, invite_code UNIQUE, expires_at, created_at)

## Seed obligatorio (30 planes Chiclayo, en este orden)
Cancha de fulbito, Karaoke, Chifa, Pollería, Cine, Café, Restaurante criollo, Parrillas, Bar, Heladería, Bowling, Picnic, Picantería, Comida rápida, Discoteca, Juegos de mesa, Malecón/parque, Escape room, Cevichería, Noche de películas, Pizzería, Anticuchería, Billar, Fútbol semanal, Cumpleaños grupal, Comida marina, Pollada, Alitas, Hamburguesas, Centro comercial.
Cada plan: category coherente, price_min/price_max realistas en soles, location o zona genérica de Chiclayo, description corta, city='Chiclayo', is_active=true.

## Alcance
- Trabaja SOLO en archivos listados + ajuste mínimo a app/main.py (registrar routers) y app/db.py si requiere conexión real
- NO toques: mobile/, lógica de negocio (va en Fase 2)

## Restricciones
- Alembic con UNA migración inicial que crea las 8 tablas
- Supabase Auth: valida JWT contra JWKS público — NO implementes auth propia con bcrypt
- NUMERIC/Decimal para todo monto, nunca float
- Solo realiza cambios pedidos directamente. NO agregues endpoints, validaciones extra, middlewares, rate limiting ni features fuera del alcance.

## Criterios de aceptación
- [ ] `alembic upgrade head` crea las 8 tablas sin error contra una DB Postgres limpia
- [ ] POST /plans/seed inserta exactamente 30 planes; segunda llamada es idempotente (no duplica)
- [ ] GET /plans soporta filtros ?category=, ?price_max=, ?city= y devuelve subset correcto
- [ ] GET /plans/random?category=comida devuelve UN plan aleatorio de esa categoría
- [ ] GET /auth/me con JWT Supabase válido devuelve el usuario; con token inválido → 401
- [ ] `pytest` verde: test_auth (3+ casos: válido, inválido, expirado), test_plans (filtro, random, seed idempotente)

## Stop conditions
Pregunta antes de:
- Cambiar el esquema de tablas definido arriba
- Agregar tablas no listadas
- Modificar reglas de negocio del PRD

## Progreso
Después de cada paso: ✅ [qué se completó] — [archivo(s)]

Think carefully and step-by-step before starting.
```

---

## FASE 2 — Backend: Core MVP Flow

```
## Contexto (mantener entre fases)
- Proyecto: CaePe (Fase 2). Viene de Fase 1: modelos, auth, seed listos, tests verdes.
- Reglas de negocio críticas:
  - presupuesto_total / num_participantes = amount_per_person (Decimal, 2 decimales)
  - Si se agrega/quita participante → recalcular amount_per_person en todos los participants
  - App NO retiene dinero. Pago por Yape/Plin fuera de la app.
  - Organizador marca pagos manualmente. Cuando TODOS los participants tienen payment_status='paid' → event.status pasa a 'funded' AUTOMÁTICAMENTE.
  - WhatsApp solo para compartir link, no chat interno.
  - Lectura de evento (GET /events/{id}) debe ser pública para invitados sin cuenta.

## Objetivo
Implementar el flujo de negocio completo: grupos, eventos, participantes, pagos, invitaciones — con tests que cubren las 6 reglas obligatorias del PRD.

## Estado objetivo
backend/app/routers/
├── groups.py        # POST /groups, GET /groups, GET /groups/{id}, POST /groups/{id}/invite, POST /groups/join/{invite_code}
├── events.py        # POST /events, GET /events, GET /events/{id}, PATCH /events/{id}, POST /events/{id}/share-message, POST /events/{id}/participants, PATCH /events/{id}/participants/{pid}/payment, GET /events/{id}/payment-status
└── payments.py      # POST /payments/upload-proof, PATCH /payments/{id}/confirm

backend/app/services/
├── events_service.py        # Cálculo monto + transición de estado
└── invitations_service.py

backend/tests/
├── test_groups.py
├── test_events.py
├── test_participants.py
└── test_payments.py

## Funciones obligatorias en services/
1. calculate_amount_per_person(total_budget: Decimal, n: int) -> Decimal — redondeo a 2 decimales (ROUND_HALF_UP), ValueError si n=0
2. recalculate_on_participant_change(event_id) — invocada al agregar/quitar participantes
3. check_and_mark_funded(event_id) — si todos participants tienen payment_status='paid' → event.status='funded'
4. generate_invite_code() — string alfanum 8 chars, único en invitations
5. build_whatsapp_message(event) — texto con nombre, fecha, lugar, monto/persona, link de invitación al evento

## Alcance
- Trabaja SOLO en routers/groups.py, routers/events.py, routers/payments.py, services/, tests nuevos
- Registra nuevos routers en app/main.py
- NO toques: models.py ni schemas.py existentes salvo para AGREGAR schemas que falten. Nada en mobile/.

## Restricciones
- Lógica de negocio SIEMPRE en services/, los routers solo orquestan
- Validación con Pydantic en schemas, nunca en routers
- Decimal para todo monto
- Auth requerido en todos los endpoints EXCEPTO: POST /groups/join/{invite_code}, GET /events/{id}, GET /plans*
- POST /payments/upload-proof: opcional para MVP — implementa endpoint que acepta multipart pero solo guarda URL placeholder, sin S3
- Solo realiza cambios pedidos directamente. NO agregues endpoints fuera de la lista del PRD, ni middleware, ni rate limiting, ni features fuera del alcance.

## Criterios de aceptación (los 6 tests obligatorios del PRD)
- [ ] test_calculate_amount: 100/4=25.00, 100/3=33.33, n=0 lanza ValueError
- [ ] test_funded_transition: marcar el último participante como paid → event.status='funded' sin llamada explícita
- [ ] test_create_event: POST /events con plan_id, fecha, presupuesto, lista participantes → crea evento + participants con amount_due correcto en todos
- [ ] test_join_via_link: POST /groups/join/{invite_code} agrega user al grupo (o crea group_member en estado 'guest' si no autenticado)
- [ ] test_manual_payment: PATCH /events/{id}/participants/{pid}/payment marca paid + setea paid_at + dispara check_and_mark_funded
- [ ] test_filter_plans: GET /plans con combinación de filtros (category + price_max + city) devuelve subset correcto
- [ ] PATCH event con cambio de presupuesto o lista de participantes recalcula amount_per_person en TODOS los participants

## Stop conditions
Pregunta antes de:
- Cambiar reglas de negocio del PRD
- Agregar transiciones de estado no especificadas (draft → active no está definida claramente en el PRD; pregunta cuándo dispararla)
- Modificar el esquema de DB

## Progreso
Después de cada paso: ✅ [qué se completó] — [archivo(s)]

Think carefully and step-by-step before starting.
```

---

## FASE 3 — Mobile: Core UI

```
## Contexto (mantener entre fases)
- Proyecto: CaePe (Fase 3). Backend MVP completo y testeado (Fases 0–2). Endpoints disponibles: /auth, /groups, /plans, /events, /payments.
- Stack mobile: Expo SDK 54 + RN 0.76 + TypeScript + expo-router + Zustand + @supabase/supabase-js
- UX target: usuario crea grupo + usa ruleta + crea evento en menos de 3 minutos.
- Idioma UI: español (es-PE)

## Objetivo
Implementar las 13 pantallas del PRD con flujo end-to-end conectado al backend real.

## Estado objetivo
mobile/
├── app/
│   ├── (auth)/onboarding.tsx
│   ├── (auth)/login.tsx
│   ├── (auth)/register.tsx
│   ├── (tabs)/home.tsx
│   ├── (tabs)/profile.tsx
│   ├── groups/new.tsx
│   ├── groups/[id].tsx
│   ├── planazo/ruleta.tsx
│   ├── events/new.tsx
│   ├── events/[id]/summary.tsx
│   ├── events/[id]/share.tsx
│   ├── events/[id]/index.tsx
│   ├── events/[id]/payments.tsx
│   ├── events/[id]/funded.tsx
│   └── _layout.tsx
├── lib/api.ts             # cliente fetch con baseURL + interceptor JWT
├── lib/supabase.ts        # cliente Supabase
├── lib/store.ts           # Zustand: auth, currentGroup, currentEvent
├── components/PlanCard.tsx
├── components/ParticipantRow.tsx
├── components/PaymentStatusBadge.tsx
├── components/PrimaryButton.tsx
└── theme/colors.ts

## Reglas UI obligatorias
- Botón primario: 1 por pantalla, claro, arriba del fold
- Ruleta Planazo: animación de rotación 1.5s ease-out + resultado destacado al final
- Filtros ruleta: categoría (chips), rango precio (slider o 2 inputs), número de personas
- Pantalla de pago (participante): monto, método del organizador (Yape/Plin), número con botón "Copiar al portapapeles", texto explícito "El pago se hace fuera de la app"
- Pantalla fondeado: color verde, ícono check, mensaje "¡Evento listo!"
- Compartir WhatsApp: Linking.openURL('whatsapp://send?text=...') con mensaje del backend (POST /events/{id}/share-message)
- Modo invitado: pantalla events/[id]/index.tsx funciona sin login (lectura pública)

## Alcance
- Trabaja SOLO en mobile/
- NO toques: backend/ ni archivos de Fase 0–2

## Restricciones
- expo-router file-based routing exclusivamente
- SIN librerías UI pesadas (NativeBase, UI Kitten, Tamagui, etc). Solo react-native primitives + StyleSheet + lucide-react-native para íconos.
- Sin animaciones aparte de la ruleta
- Las 13 pantallas listadas, ni una más ni una menos
- Solo realiza cambios pedidos directamente. NO agregues onboarding tours, splash personalizado, deep linking custom, dark mode, i18n switching, ni nada fuera del PRD.

## Criterios de aceptación
- [ ] Flujo end-to-end en Expo Go: registro → crear grupo → ruleta → crear evento → resumen → compartir → ver detalle → marcar pagos → fondeado
- [ ] Las 13 pantallas existen y son navegables
- [ ] Ruleta filtra por categoría + rango precio + número de personas y devuelve un plan aleatorio del backend
- [ ] Crear evento muestra amount_per_person en vivo al editar presupuesto o lista participantes
- [ ] Marcar último pago dispara refetch y la pantalla pasa a estado fondeado
- [ ] Botón compartir abre WhatsApp con el mensaje preformateado del backend
- [ ] Pantalla events/[id]/index.tsx accesible vía deep link sin sesión iniciada (modo invitado)

## Stop conditions
Pregunta antes de:
- Agregar pantallas no listadas
- Instalar dependencias fuera de Expo SDK + Zustand + @supabase/supabase-js + lucide-react-native
- Cambiar el flujo de navegación

## Progreso
Después de cada pantalla completada: ✅ [pantalla] — [archivo(s)]

Think carefully and step-by-step before starting.
```

---

## FASE 4 — Notificaciones + Métricas + Deploy

```
## Contexto (mantener entre fases)
- Proyecto: CaePe (Fase 4). Backend + mobile completos (Fases 0–3). Flujo end-to-end funcional en local.
- Pendiente: push FCM, métricas mínimas, Dockerfile, despliegue Cloud Run, build APK con EAS, CI básico.

## Objetivo
Cerrar el MVP con notificaciones, tracking básico, y deployment listo para producción.

## Estado objetivo
backend/
├── Dockerfile                     # python:3.11-slim, multi-stage, usuario no-root, expone 8080
├── .dockerignore
├── app/routers/notifications.py   # POST /notifications/register-token, POST /notifications/send-reminder
├── app/services/fcm_service.py
├── app/services/metrics_service.py
└── alembic/versions/<nueva>.py    # tablas events_metrics + device_tokens

mobile/
├── lib/notifications.ts           # registro token FCM con expo-notifications
└── lib/analytics.ts               # tracking de eventos clave

infra/
├── deploy/cloud-run.md            # guía paso a paso con gcloud
├── deploy/eas-build.md            # guía generar APK con eas build
└── .github/workflows/
    ├── backend-ci.yml             # lint + pytest en cada PR
    └── backend-deploy.yml         # build image + deploy Cloud Run en push a main

## Notificaciones obligatorias
- Invitación a evento (al agregar participante)
- Recordatorio de pago (endpoint manual /notifications/send-reminder)
- Evento fondeado (auto al transicionar status='funded')

## Métricas obligatorias (tabla events_metrics)
- time_to_create_event_ms (desde abrir "crear evento" hasta confirmar)
- events_created_count
- events_funded_count
- payment_completion_rate (paid / total participants per event)
- second_event_rate (grupos con ≥2 eventos)
- dropoff_step (último step alcanzado en eventos abandonados)

## Alcance
- Trabaja SOLO en archivos listados arriba
- NO toques: lógica de negocio existente; esquema actual (solo AGREGA events_metrics + device_tokens vía nueva migración)

## Restricciones
- Dockerfile multi-stage, python:3.11-slim, usuario no-root, EXPOSE 8080 (convención Cloud Run)
- DB en producción: confirma con el usuario si se usa Supabase Postgres directamente o Cloud SQL Postgres antes de escribir cloud-run.md
- EAS Build: profile "preview" para APK, "production" para AAB
- GitHub Actions: documenta secrets requeridos en cloud-run.md (GCP_SA_KEY, GCP_PROJECT_ID, etc.)
- Solo realiza cambios pedidos directamente. NO agregues Sentry, OpenTelemetry, Prometheus, monitoring extra, ni infra fuera del PRD.

## Criterios de aceptación
- [ ] `docker build -t caepe-backend backend/` construye sin error
- [ ] Container corre local y responde /health en :8080
- [ ] Mobile registra token FCM tras login y POST /notifications/register-token lo persiste
- [ ] events_metrics se inserta al crear evento, al fondearse, y al detectar abandono
- [ ] backend-ci.yml corre pytest verde en cada PR
- [ ] backend-deploy.yml hace push a Cloud Run en push a main (con secrets configurados)
- [ ] cloud-run.md tiene comandos `gcloud` exactos copy-paste-able
- [ ] eas-build.md tiene `eas build --profile preview --platform android` documentado

## Stop conditions
Pregunta antes de:
- Confirmar approach de DB en producción (Supabase vs Cloud SQL)
- Modificar workflows más allá de lo pedido
- Agregar herramientas de observabilidad

## Progreso
Después de cada paso: ✅ [qué se completó] — [archivo(s)]

Think carefully and step-by-step before starting.
```

---

## Notas de uso

1. **Sesión nueva por fase.** En Claude Code: `/clear` antes de pegar la siguiente fase. El bloque `## Contexto` carga lo necesario.
2. **No saltes fases.** Cada una asume que la anterior pasó sus criterios de aceptación.
3. **Si Claude Code pregunta "¿agrego X?"** y no está en el alcance: responde "no, mantén el alcance".
4. **Para arquitectura/decisiones grandes** (ej. Supabase vs Cloud SQL en Fase 4): respóndele antes de que empiece a codear.
