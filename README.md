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

## Fase 3 — Mobile

### Setup local

1. Crea un proyecto Supabase, copia URL y anon key.
2. `cp mobile/.env.example mobile/.env.local` y rellena:
   - `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000` (Android emulator) o `http://localhost:8000` (iOS sim)
   - `EXPO_PUBLIC_SUPABASE_URL=...`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY=...`
3. `cd mobile && npx expo start`
4. En otra terminal: `cd backend && uvicorn app.main:app --reload`

### Verificación E2E manual

Recorre este flujo completo en Android emulator + iOS sim:

- [ ] App primer arranque → onboarding visible
- [ ] Tap "Crear cuenta" → register form
- [ ] Llenar form completo + tap "Crear cuenta" → llega a home
- [ ] Home muestra `¡Habla, [nombre]!` y secciones vacías de collera/eventos
- [ ] Tap FAB "Arma el plan" → menú con 3 opciones
- [ ] "Crear collera" → form, ingresar nombre → muestra invite_code
- [ ] "Pasa la voz" abre WhatsApp con mensaje preformateado
- [ ] Volver a home → collera aparece en sección
- [ ] FAB → "Tira la ruleta" → seleccionar categoría=comida + price_max=30 + #personas=4
- [ ] Tap "¡Tira la ruleta!" → ícono dado rota 1.5s → resultado aparece
- [ ] Tap "Arma evento con este" → events/new prellenado con plan
- [ ] Editar presupuesto a 100 → "Monto por persona" actualiza en vivo a S/ 25.00
- [ ] Agregar 3 participantes → recalcula a S/ 25.00 (4 personas)
- [ ] Tap "Confirmar evento" → llega a summary
- [ ] Tap "Pasa la voz" → share screen con preview → "Compartir por WhatsApp"
- [ ] Volver y tap "Ver evento" → events/[id]/index
- [ ] Como organizador: tap "Marcar pagos" → payments screen
- [ ] Tap "Cayó la cuota" en cada participante (3 veces) → al último, redirect automático a `funded` screen
- [ ] Pantalla funded: bg verde lima, ícono Check grande, "¡Cayó! Plan armado"
- [ ] Tap "Volver al inicio" → home
- [ ] Profile tab → tap "Chaufa" → vuelve a onboarding
- [ ] Cerrado y reabierto: salta onboarding, va a login (seenOnboarding persistido)
- [ ] Deep link: con sesión cerrada, abrir `caepe://events/<uuid-existente>` → renderiza modo invitado, sin botones de mutación, muestra CTA "Únete a CaePe"
