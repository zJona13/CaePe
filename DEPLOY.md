# CaePe — Guía de Despliegue

Documento completo para que un nuevo dev tome el repo y lo deje corriendo: local, staging y producción. Cubre backend FastAPI + mobile Expo + DB Postgres + validación de comprobantes (Tesseract + OpenCV).

---

## 0. Stack y dependencias del sistema

| Componente | Versión | Notas |
|---|---|---|
| Python | 3.11+ | backend |
| Node.js | 20+ | mobile |
| PostgreSQL | 14+ | Supabase recomendado |
| Tesseract OCR | 5.x | binario nativo, requerido por `pytesseract` |
| Tesseract idioma | `spa` | español, para leer comprobantes |
| Expo CLI | vía `npx` | no instalar global |
| EAS CLI | última | `npm i -g eas-cli` para builds |
| Docker | 24+ | opcional, deploy a Cloud Run / Fly |
| gcloud SDK | última | solo si despliegas a Cloud Run |

### Instalar Tesseract (binario)

```bash
# macOS
brew install tesseract tesseract-lang

# Ubuntu/Debian
sudo apt-get install -y tesseract-ocr tesseract-ocr-spa

# Windows (PowerShell)
choco install tesseract
# o instalador UB-Mannheim: https://github.com/UB-Mannheim/tesseract/wiki
# luego añade C:\Program Files\Tesseract-OCR al PATH
```

Verificar: `tesseract --version` y `tesseract --list-langs` debe mostrar `spa`.

---

## 1. Variables de entorno

### Backend (`backend/.env`)

```env
# Postgres
DATABASE_URL=postgresql+psycopg://USER:PASS@HOST:5432/DBNAME

# Supabase Auth (proyecto Supabase ya creado)
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_JWKS_URL=https://YOUR-PROJECT.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_JWT_ISSUER=https://YOUR-PROJECT.supabase.co/auth/v1
SUPABASE_JWT_ALGORITHMS=HS256,RS256,ES256
SUPABASE_JWT_SECRET=YOUR-SUPABASE-JWT-SECRET
SUPABASE_JWT_LEEWAY_SECONDS=60

# Validación de comprobantes (Tesseract + OpenCV)
PROOF_VALIDATION_ENABLED=false   # ponlo true para forzar OCR de Yape/Plin
PROOF_TESSERACT_LANG=spa
PROOF_LOGO_MATCH_THRESHOLD=0.65
```

Obtener `SUPABASE_JWT_SECRET`: Supabase Dashboard → Project Settings → API → JWT Secret.

### Mobile (`mobile/.env.local`)

```env
EXPO_PUBLIC_API_URL=https://api-publica-del-backend.com
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

Para emuladores en dev:
- Android emulator: `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000`
- iOS simulator: `EXPO_PUBLIC_API_URL=http://localhost:8000`
- Dispositivo físico: IP LAN, ej. `http://192.168.1.10:8000`

---

## 2. Setup local (desarrollo)

### 2.1 Postgres local

Opción A — Supabase remoto (recomendado, sin instalar nada):
- Crear proyecto en https://supabase.com
- Copiar `Connection string` (Settings → Database → URI) a `DATABASE_URL`

Opción B — Docker local:
```bash
docker run -d --name caepe-pg -e POSTGRES_USER=caepe -e POSTGRES_PASSWORD=caepe \
  -e POSTGRES_DB=caepe -p 5432:5432 postgres:16
```

### 2.2 Backend

```bash
cd backend
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows (Git Bash)
# source .venv/Scripts/activate

pip install -r requirements.txt
cp .env.example .env       # editar valores
alembic upgrade head        # crea las 8 tablas
uvicorn app.main:app --reload
curl -X POST http://localhost:8000/plans/seed   # 30 planes Chiclayo
```

Tests:
```bash
pytest
```

Tests usan SQLite in-memory + JWT HS256 con secret de prueba. No requieren Postgres ni Tesseract.

### 2.3 Mobile

```bash
cd mobile
npm install --legacy-peer-deps    # React 19 peer conflicts
cp .env.example .env.local        # editar URLs
npx expo start
```

Escanear QR con Expo Go o presionar `a` (Android) / `i` (iOS) en emulador.

---

## 3. Validación de comprobantes Yape/Plin

Sistema local (cero costo) reemplaza Google Vision API. Usa Tesseract OCR + OpenCV template matching contra logos.

### 3.1 Templates de logos

Ya incluidos en `backend/app/assets/templates/`:
- `yape_logo.png` — wordmark púrpura
- `plin_logo.png` — bubble turquesa
- `yape_reference.jpeg`, `plin_reference.jpeg` — recibos completos de calibración

Si vas a recalibrar, ver `backend/app/assets/templates/README.md`.

### 3.2 Activar en producción

En `.env` del backend:
```env
PROOF_VALIDATION_ENABLED=true
PROOF_TESSERACT_LANG=spa
PROOF_LOGO_MATCH_THRESHOLD=0.65
```

Requiere binario `tesseract` instalado en el host/contenedor (ver sección 0).

### 3.3 Comportamiento

- Validador tolera variantes OCR del símbolo de sol (`S/`, `sI`, `Sl`, `S|`)
- Si template falta o score < threshold → fallback a detección de keywords (`yape`, `plin`)
- Si `PROOF_VALIDATION_ENABLED=false` → endpoint guarda comprobante sin validar

---

## 4. Deploy backend — Cloud Run (Google Cloud)

Recomendado para escalado automático y free tier generoso.

### 4.1 Prerequisitos

```bash
gcloud auth login
gcloud config set project YOUR-GCP-PROJECT-ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
```

### 4.2 Dockerfile (crear en `backend/Dockerfile`)

```dockerfile
FROM python:3.11-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-spa libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8080
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
```

### 4.3 Build + push + deploy

```bash
cd backend
REGION=us-central1
PROJECT=$(gcloud config get-value project)

# Build via Cloud Build
gcloud builds submit --tag gcr.io/$PROJECT/caepe-backend:latest

# Deploy
gcloud run deploy caepe-backend \
  --image gcr.io/$PROJECT/caepe-backend:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 5 \
  --set-env-vars "DATABASE_URL=postgresql+psycopg://...,SUPABASE_URL=...,SUPABASE_JWT_SECRET=...,PROOF_VALIDATION_ENABLED=true,PROOF_TESSERACT_LANG=spa,PROOF_LOGO_MATCH_THRESHOLD=0.65"
```

Para secrets sensibles, usar Secret Manager:
```bash
echo -n "tu-jwt-secret" | gcloud secrets create supabase-jwt-secret --data-file=-
gcloud run deploy caepe-backend ... \
  --set-secrets "SUPABASE_JWT_SECRET=supabase-jwt-secret:latest"
```

Cloud Run devuelve URL pública (`https://caepe-backend-xxx.run.app`). Usarla como `EXPO_PUBLIC_API_URL` en mobile.

---

## 5. Deploy backend — Alternativas

### 5.1 Render

1. Conectar repo en https://render.com → New → Web Service
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt && alembic upgrade head`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Añadir env vars en dashboard
6. **Importante**: usar Docker en vez de buildpack para incluir Tesseract. Sube `Dockerfile` (sección 4.2) y selecciona "Docker" como Runtime.

### 5.2 Railway

```bash
npm i -g @railway/cli
railway login
cd backend
railway init
railway up
```
Añadir variables en dashboard. Mismo caveat: necesita Docker para Tesseract.

### 5.3 Fly.io

```bash
brew install flyctl
fly auth signup
cd backend
fly launch --dockerfile Dockerfile   # genera fly.toml
fly secrets set DATABASE_URL=... SUPABASE_JWT_SECRET=...
fly deploy
```

---

## 6. Deploy mobile — EAS Build

### 6.1 Setup inicial (una sola vez)

```bash
npm i -g eas-cli
cd mobile
eas login
eas build:configure   # crea eas.json
```

### 6.2 `eas.json` recomendado

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://caepe-backend-xxx.run.app",
        "EXPO_PUBLIC_SUPABASE_URL": "https://YOUR-PROJECT.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "..."
      }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "ios": {},
      "env": {
        "EXPO_PUBLIC_API_URL": "https://caepe-backend-xxx.run.app",
        "EXPO_PUBLIC_SUPABASE_URL": "https://YOUR-PROJECT.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "..."
      }
    }
  },
  "submit": { "production": {} }
}
```

### 6.3 Builds

```bash
# APK interno para QA
eas build --profile preview --platform android

# AAB producción Google Play
eas build --profile production --platform android

# IPA producción App Store (requiere cuenta Apple Developer $99/año)
eas build --profile production --platform ios
```

EAS devuelve URL de descarga. APK directo a teléfono, AAB/IPA → submit a stores con `eas submit`.

---

## 7. Base de datos — Supabase como Postgres

Supabase Postgres se usa tanto para auth como para datos. Una sola base.

### 7.1 Setup

1. Crear proyecto en Supabase
2. Settings → Database → Connection string → copiar URI (modo `Session` para apps server-side)
3. Reemplazar `postgres://` por `postgresql+psycopg://` para SQLAlchemy
4. Settings → API → copiar `Project URL` + `anon public` + `JWT Secret`

### 7.2 Migraciones contra Supabase

```bash
cd backend
export DATABASE_URL="postgresql+psycopg://postgres:PASS@db.PROJECT.supabase.co:5432/postgres"
alembic upgrade head
curl -X POST https://tu-backend.run.app/plans/seed
```

### 7.3 Auth Supabase

Mobile usa `@supabase/supabase-js` para login/registro. Backend valida JWT contra JWKS público — no necesita SDK Supabase.

---

## 8. Checklist de despliegue (paso a paso)

Marcar uno por uno antes de considerar listo:

- [ ] Proyecto Supabase creado, anotadas las 4 credenciales
- [ ] `DATABASE_URL` apunta a Supabase Postgres
- [ ] `alembic upgrade head` corrido contra DB producción → 8 tablas creadas
- [ ] `POST /plans/seed` ejecutado → 30 planes Chiclayo en DB
- [ ] Backend desplegado (Cloud Run / Render / Fly), URL pública responde `GET /health` → `{"status":"ok"}`
- [ ] Tesseract instalado en contenedor (`docker exec ... tesseract --list-langs` muestra `spa`)
- [ ] `PROOF_VALIDATION_ENABLED=true` solo si templates calibrados con receipts reales
- [ ] `mobile/eas.json` con env vars de producción correctas
- [ ] APK preview construido con `eas build --profile preview --platform android`
- [ ] APK probado en device físico: flujo completo del README sección "Verificación E2E manual" verde
- [ ] Deep link `caepe://events/<uuid>` abre modo invitado sin sesión

---

## 9. Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| `pytesseract.TesseractNotFoundError` | binario `tesseract` no en PATH | instalar (sección 0); en Docker añadir `apt install tesseract-ocr` |
| `Failed loading language 'spa'` | falta pack idioma español | `apt install tesseract-ocr-spa` o `brew install tesseract-lang` |
| `cv2 ImportError: libGL.so.1` | falta OpenGL en slim image | añadir `libgl1 libglib2.0-0` al Dockerfile |
| Mobile no conecta a backend | `EXPO_PUBLIC_API_URL` apunta a `localhost` desde device físico | usar IP LAN o URL pública |
| `401 Unauthorized` en `/auth/me` | `SUPABASE_JWT_SECRET` incorrecto | re-copiar de Supabase Dashboard → API |
| `alembic upgrade head` cuelga | conexión a Supabase bloqueada por firewall | usar pooler `aws-0-xx.pooler.supabase.com:6543` (modo `Session`) |
| `expo install` falla con peer deps React 19 | conflicto npm | `npm install --legacy-peer-deps` |
| Comprobante válido rechazado | threshold muy alto o template no calibrado | bajar `PROOF_LOGO_MATCH_THRESHOLD` a `0.55`, recortar logo tighter |

---

## 10. CI/CD (opcional, no implementado aún)

Plantilla GitHub Actions sugerida (`.github/workflows/backend-deploy.yml`):

```yaml
name: Deploy backend
on:
  push:
    branches: [master]
    paths: ['backend/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/setup-gcloud@v2
      - run: |
          cd backend
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/caepe-backend:${{ github.sha }}
          gcloud run deploy caepe-backend \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/caepe-backend:${{ github.sha }} \
            --region us-central1
```

Secrets requeridos en repo: `GCP_SA_KEY`, `GCP_PROJECT_ID`.

---

## 11. Contactos / handoff

- Repo: este monorepo (`backend/`, `mobile/`)
- DB: Supabase project — credenciales en gestor de secretos del equipo
- Hosting backend: definir (Cloud Run / Render / Fly)
- Hosting mobile: Expo EAS (cuenta del equipo)
- Validación comprobantes: 100% local, sin claves de terceros

Cualquier duda revisar `README.md` (setup local) y `CLAUDE.md` (fases del proyecto).
