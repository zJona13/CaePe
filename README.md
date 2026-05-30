# CaePe

App social móvil para jóvenes peruanos (18–30): organizar salidas grupales, dividir presupuesto, confirmar pagos. La app **NO** retiene dinero — Yape/Plin externos.

> **Despliegue producción:** ver [`DEPLOY.md`](./DEPLOY.md) — guía completa paso a paso para tu compañero.

---

## Estructura

```
caepe/
├── backend/   # FastAPI + Python 3.11 + SQLAlchemy 2 + Alembic + Tesseract OCR
└── mobile/    # Expo SDK 54 + React Native + TypeScript + expo-router + Zustand
```

---

## Requisitos del sistema

- **Python 3.11+**
- **Node.js 20+** y **npm**
- **PostgreSQL 14+** (local con Docker o Supabase remoto)
- **Tesseract OCR 5.x** + paquete idioma español (`spa`) — solo si activas validación de comprobantes
- Cuenta **Supabase** (gratis) para Auth + DB
- Expo Go en celular físico, o emulador Android/iOS

### Instalar Tesseract (opcional, solo si `PROOF_VALIDATION_ENABLED=true`)

```bash
# macOS
brew install tesseract tesseract-lang

# Ubuntu/Debian
sudo apt-get install -y tesseract-ocr tesseract-ocr-spa

# Windows
choco install tesseract
# o instalador UB-Mannheim, añadir C:\Program Files\Tesseract-OCR al PATH
```

Verificar: `tesseract --list-langs` debe incluir `spa`.

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

Dependencias clave: FastAPI, SQLAlchemy 2, Alembic, PyJWT, **pytesseract**, **opencv-python-headless**, Pillow, numpy.

### 2. Configurar entorno

```bash
cp .env.example .env
```

Editar `.env`:

- `DATABASE_URL` → Postgres local o Supabase (`postgresql+psycopg://...`)
- `SUPABASE_URL` + `SUPABASE_JWT_SECRET` → Supabase Dashboard → Settings → API
- `PROOF_VALIDATION_ENABLED=false` por defecto (sin OCR en dev). `true` solo si Tesseract instalado y templates calibrados.

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

SQLite in-memory + JWT HS256 de prueba. No requiere Postgres ni Tesseract.

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
- `POST /payments/upload-proof` (multipart; valida Yape/Plin si `PROOF_VALIDATION_ENABLED=true`)
- `PATCH /payments/{id}/confirm`

---

## Validación de comprobantes (Yape/Plin)

Sistema local **100% gratis** — Tesseract OCR + OpenCV template matching contra logos. Reemplaza Google Vision API.

### Templates incluidos

`backend/app/assets/templates/`:
- `yape_logo.png` — wordmark púrpura recortado
- `plin_logo.png` — bubble turquesa recortado
- `yape_reference.jpeg`, `plin_reference.jpeg` — recibos completos para calibración visual

### Flujo

1. Usuario sube screenshot del Yape/Plin
2. OpenCV hace template matching del logo (threshold configurable, default `0.65`)
3. Tesseract OCR extrae monto + código de operación
4. Tolera variantes del símbolo sol (`S/`, `sI`, `Sl`, `S|`) que Tesseract suele leer mal
5. Si template falla → fallback a keywords (`yape`, `plin`)

### Recalibración

Ver `backend/app/assets/templates/README.md`. Bajar `PROOF_LOGO_MATCH_THRESHOLD` si rechaza receipts reales; subirlo si imágenes random pasan.

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

---

## Últimos cambios (mayo 2026)

- **283cc12** — `ParticipantRow` usa `hasProof` real (no `canViewProof`)
- **2f94f3b** — Templates Yape/Plin agregados + OCR tolera variantes símbolo sol (`S/`, `sI`, `Sl`, `S|`)
- **88c1aa9** — Google Vision API reemplazado por Tesseract + OpenCV template matching (cero costo)
- **8f24d39** — Arreglo arranque app + comprobantes + teclado + miembros dinámicos
- **acd42bb** — Sistema de comprobantes inicial

Estado actual: ramas `master`, 2 commits ahead de `origin/master`.

---

## Fases del proyecto (`CLAUDE.md`)

- ✅ Fase 0: scaffolding monorepo
- ✅ Fase 1: data layer + auth Supabase + seed planes Chiclayo
- ✅ Fase 2: core MVP (grupos, eventos, participantes, pagos)
- ✅ Fase 3: 13 pantallas mobile + validación de comprobantes
- ⏳ Fase 4: notificaciones FCM + métricas + Dockerfile + Cloud Run + EAS + GitHub Actions

**Para deploy a producción:** ver [`DEPLOY.md`](./DEPLOY.md).

---

## Troubleshooting rápido

| Problema | Fix |
|---|---|
| `pytesseract.TesseractNotFoundError` | Instalar binario Tesseract (sección requisitos) |
| `Failed loading language 'spa'` | `brew install tesseract-lang` / `apt install tesseract-ocr-spa` |
| `cv2 ImportError: libGL.so.1` | En Docker: `apt install libgl1 libglib2.0-0` |
| Mobile no conecta backend | `EXPO_PUBLIC_API_URL` debe ser IP LAN o URL pública, no `localhost` |
| `401` en `/auth/me` | Re-copiar `SUPABASE_JWT_SECRET` de Dashboard → API |
| `npm install` falla por React 19 peers | Usar `--legacy-peer-deps` |
| Comprobante válido rechazado | Bajar `PROOF_LOGO_MATCH_THRESHOLD` a `0.55` |

Resto: ver `DEPLOY.md` sección 9.
