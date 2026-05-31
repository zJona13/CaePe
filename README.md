# CaePe

App social móvil para jóvenes peruanos (18–30): organizar salidas grupales, dividir presupuesto, confirmar pagos. La app **NO** retiene dinero — Yape/Plin externos.

> **Despliegue producción:** ver [`DEPLOY.md`](./DEPLOY.md) — guía completa paso a paso para tu compañero.

---

## Estructura

```
caepe/
├── backend/   # FastAPI + Python 3.11 + SQLAlchemy 2 + Alembic
└── mobile/    # Expo SDK 54 + React Native + TypeScript + expo-router + Zustand
```

---

## Requisitos del sistema

- **Python 3.11+**
- **Node.js 20+** y **npm**
- **PostgreSQL 14+** (local con Docker o Supabase remoto)
- Cuenta **Supabase** (gratis) para Auth + DB
- Expo Go en celular físico, o emulador Android/iOS

---

## Backend

### 1. Instalar dependencias

```bash
cd backend
python -m venv .venv

# macOS/Linux
source .venv/bin/activate
# Windows (Git Bash)
# source .venv/Scripts/activate

pip install -r requirements.txt
```

Dependencias clave: FastAPI, SQLAlchemy 2, Alembic, PyJWT.

### 2. Configurar entorno

```bash
cp .env.example .env
```

Editar `.env`:

- `DATABASE_URL` → Postgres local o Supabase (`postgresql+psycopg://...`)
- `SUPABASE_URL` + `SUPABASE_JWT_SECRET` → Supabase Dashboard → Settings → API

### 3. Migraciones

```bash
alembic upgrade head
```

Crea las 8 tablas: `users`, `groups`, `group_members`, `plans`, `events`, `event_participants`, `payments`, `invitations`.

### 4. Seed 30 planes Chiclayo

```bash
uvicorn app.main:app --reload &
curl -X POST http://localhost:8000/plans/seed
# {"inserted":30,"total":30}
# Segunda llamada → {"inserted":0,"total":30} (idempotente)
```

### 5. Levantar servidor

```bash
uvicorn app.main:app --reload
```

→ http://localhost:8000 · `GET /health` → `{"status":"ok"}`

### 6. Tests

```bash
pytest
```

SQLite in-memory + JWT HS256 de prueba. No requiere Postgres.

### 7. Endpoints disponibles

**Auth**
- `POST /auth/register`, `POST /auth/login`
- `GET /auth/me` (Bearer JWT Supabase)

**Plans**
- `GET /plans` (filtros: `category`, `price_min`, `price_max`, `city`, `is_active`)
- `GET /plans/random` (mismos filtros)
- `POST /plans/seed`

**Groups**
- `POST /groups`, `GET /groups`, `GET /groups/{id}`
- `POST /groups/{id}/invite`
- `POST /groups/join/{invite_code}` (público)

**Events**
- `POST /events`, `GET /events`
- `GET /events/{id}` (público — modo invitado)
- `PATCH /events/{id}` (recalcula `amount_per_person` al cambiar presupuesto o participantes)
- `POST /events/{id}/share-message` (genera texto WhatsApp)
- `POST /events/{id}/participants`
- `PATCH /events/{id}/participants/{pid}/payment` (marca paid → dispara transición a `funded`)
- `GET /events/{id}/payment-status`

**Payments**
- `POST /payments/upload-proof` (multipart; guarda la imagen del comprobante)
- `PATCH /payments/{id}/confirm`

**Notifications** (push vía Expo)
- `POST /notifications/register-token` — guarda el ExpoPushToken del dispositivo
- `POST /notifications/unregister-token` — lo elimina (al cerrar sesión)
- `POST /notifications/send-reminder?event_id=...` — el organizador recuerda a los pendientes

Triggers automáticos: alguien entra al grupo, evento creado, te sumaron (sube comprobante), se sumaron a tu evento, pago confirmado, evento fondeado.

> **Expo Go no recibe push remoto (SDK 53+).** Para probar notificaciones reales usa un *development build* o el APK de EAS (`eas build --profile preview`). El backend envía a `https://exp.host/--/api/v2/push/send`.

---

## Comprobantes (Yape/Plin)

La app **no valida** el comprobante automáticamente: el participante sube la captura de Yape/Plin y **el organizador la revisa a ojo** y marca el pago como confirmado.

### Flujo

1. El participante sube el screenshot (`POST /payments/upload-proof`). Solo se valida tamaño (≤8 MB) y formato (jpg/png/webp/heic).
2. La imagen queda asociada al participante (`has_proof=true`) y aparece el indicador "Comprobante subido".
3. El organizador abre "Ver comprobante", confirma visualmente que el monto y el destino son correctos, y marca el pago como pagado.
4. Cuando todos los participantes están pagados → el evento pasa a `funded`.

> La URL de la imagen solo se expone al organizador y al dueño de la fila; el resto solo ve el indicador `has_proof`.

---

## Mobile

### 1. Instalar dependencias

```bash
cd mobile
npm install --legacy-peer-deps
```

`--legacy-peer-deps` necesario por conflicto de peer React 19.

### 2. Configurar API + Supabase

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000          # Android emulator
# EXPO_PUBLIC_API_URL=http://localhost:8000       # iOS simulator
# EXPO_PUBLIC_API_URL=http://192.168.1.10:8000    # device físico (IP LAN)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

### 3. Arrancar Expo

```bash
npx expo start
```

Escanear QR con Expo Go (Android/iOS) o presionar `a` / `i` para emulador.

### 4. Build nativo (opcional, sin Expo Go)

Native dirs `mobile/ios/` y `mobile/android/` ya generados con prebuild.

```bash
npm run android   # expo run:android
npm run ios       # expo run:ios
```

### Para recibir push de verdad necesitas salir de Expo Go (no soporta push remoto desde SDK 53):
cd mobile
eas init                 # crea el projectId de EAS (necesario para el token)
eas build --profile preview --platform android   # genera el APK
En Expo Go el token simplemente no se obtiene (lo manejé sin que crashee), pero no llegarán las notificaciones.

---

## Pantallas (13 implementadas)

```
(auth)/onboarding · (auth)/login · (auth)/register
(tabs)/home · (tabs)/profile
groups/new · groups/[id]
planazo/ruleta
events/new · events/[id]/summary · events/[id]/share · events/[id]/index · events/[id]/payments · events/[id]/funded
```

UI components: `PlanCard`, `ParticipantRow`, `PaymentStatusBadge`, `CategoryChip`, `StatusBadge`, `EmptyState`, `ScreenHeader`, `Input`, `PrimaryButton`.

---

## Verificación E2E manual

Recorrer este flujo en Android emulator + iOS sim:

- [ ] App primer arranque → onboarding
- [ ] "Crear cuenta" → register → home con `¡Habla, [nombre]!`
- [ ] FAB "Arma el plan" → menú 3 opciones
- [ ] "Crear grupo" → form → muestra `invite_code` → "Pasa la voz" abre WhatsApp
- [ ] FAB → "Tira la ruleta" → filtros (categoría=comida + price_max=30 + #personas=4) → ícono dado rota 1.5s → plan aleatorio
- [ ] "Arma evento con este" → events/new prellenado
- [ ] Editar presupuesto a 100 → "Monto por persona" actualiza en vivo a `S/ 25.00`
- [ ] Agregar 3 participantes → recalcula a `S/ 25.00` (4 personas)
- [ ] "Confirmar evento" → summary → "Pasa la voz" → WhatsApp
- [ ] "Ver evento" → events/[id]/index
- [ ] Como organizador: "Marcar pagos" → tap "Cayó la cuota" en cada uno → último marca dispara redirect automático a `funded` (bg verde lima, ícono Check)
- [ ] **Subir comprobante**: tap botón proof en `ParticipantRow` → galería → upload → `hasProof=true` refleja real (no permiso de vista)
- [ ] Profile → "Chaufa" → vuelve a onboarding
- [ ] Reabrir app → salta onboarding (persistido)
- [ ] Deep link sin sesión: `caepe://events/<uuid>` → modo invitado, sin botones mutación, CTA "Únete a CaePe"

