# CaePe

App social móvil para jóvenes peruanos (18–30): organizar salidas grupales, dividir presupuesto, confirmar pagos. La app NO retiene dinero — Yape/Plin externos.

## Estructura

```
caepe/
├── backend/   # FastAPI + Python 3.11
└── mobile/    # Expo SDK 54 + React Native + TypeScript
```

## Requisitos

- Python 3.11+
- Node.js 20+
- npm (o pnpm/yarn)

---

## Backend

### 1. Instalar dependencias

```bash
cd backend
python -m venv .venv
# Windows (Git Bash):
source .venv/Scripts/activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Levantar servidor

```bash
uvicorn app.main:app --reload
```

→ http://localhost:8000

### 3. Verificar `/health`

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

### 4. Tests

```bash
pytest
```

---

## Mobile

### 1. Instalar dependencias

```bash
cd mobile
npm install
```

### 2. Configurar API

```bash
cp .env.example .env
# Edita EXPO_PUBLIC_API_URL si el backend corre en otra dirección
```

> Nota: para correr en dispositivo físico, reemplaza `localhost` por la IP LAN de tu máquina (ej. `http://192.168.1.10:8000`).

### 3. Arrancar Expo

```bash
npx expo start
```

Escanea el QR con Expo Go (Android/iOS). El Home muestra el resultado de `GET /health` del backend.

---

## Fases del proyecto

- **Fase 0** (actual): scaffolding monorepo
- Fase 1: data layer + auth Supabase + seed planes Chiclayo
- Fase 2: core MVP (grupos, eventos, participantes, pagos)
- Fase 3: 13 pantallas mobile
- Fase 4: notificaciones FCM + métricas + deploy Cloud Run + EAS
