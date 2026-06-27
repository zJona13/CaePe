# Fase 5 — Qué falta antes de continuar (Mercado Pago)

> Estado al 2026-06-26. Etapas 1–2 (esquema + límite del plan free) y el paywall mobile ya están hechos y desplegados/commiteados. Esto lista lo que falta para arrancar las etapas 3–5 (pagos reales).

## ✅ CERRADO EN CÓDIGO (2026-06-27)
Etapas 3–6 + mobile + landing implementadas y testeadas (backend 64 tests verdes; mobile `tsc` limpio).
- **Etapa 3 — Créditos:** `services/mercadopago_service.py` (preferencia + firma webhook), `services/billing_service.py` (catálogo + grant idempotente), `billing_catalog.py` (packs `10=S/8`, `25=S/15`), `POST /billing/credits/checkout`, `POST /billing/webhook`. Tests en `test_billing.py`.
- **Etapa 4 — Premium:** `POST /billing/premium/checkout` (`S/9.90`/mes), webhook acumula `premium_until += 30 días`.
- **Etapa 5 — Referidos:** `services/referrals_service.py` (código al registrar, registro con `referral_code`+`device_hash`, calificación anti-abuso en `check_and_mark_funded`), `GET /referrals/me`. Tests en `test_referrals.py`.
- **Etapa 6 — Banner:** `GET /banners` (audiencia/vigencia, oculto a premium). Tests en `test_banners.py`.
- **Mobile:** `expo-web-browser`, paywall conectado al `init_point`, retorno + refetch (`lib/checkout.ts`), pantalla `app/referrals.tsx`, `components/AdBanner.tsx` en Home, campo de código de referido en el registro (`lib/device.ts`).
- **Landing:** `billing-return.html` + `r.html` + rewrites en `vercel.json`.

**Falta solo lo operativo (del usuario):** cargar credenciales MP reales en `.env`/Render, registrar el webhook en el panel MP, swap a credenciales de producción y rebuild del APK. Detalle abajo.

---


## ✅ Ya hecho
- **Backend etapa 1:** migración `0003` (campos de plan en `users` + tablas `billing_payments`, `referrals`, `app_banners`) — **aplicada en prod (Render)**.
- **Backend etapa 2:** límite de 5 eventos (402 estructurado) + `GET /billing/me`. En vivo.
- **Mobile:** paywall (`app/paywall.tsx`), manejo del 402, indicador de eventos restantes, sección "Plan" en perfil. Commiteado y pusheado (no aún en APK).
- **Credenciales MP:** obtenidas (prueba + producción). ← las usamos abajo.

## 🔴 Bloqueantes antes de codear pagos (del usuario)

- [ ] **Cargar credenciales como variables de entorno** (no en el repo):
  - Local `backend/.env`: usar las de **prueba** (`TEST-...`).
    ```
    MP_ACCESS_TOKEN=TEST-xxxxxxxx
    MP_PUBLIC_KEY=TEST-xxxxxxxx
    MP_WEBHOOK_SECRET=xxxxxxxx   # "Clave secreta" del webhook en el panel MP (para validar firma)
    ```
  - Render (Dashboard → servicio → Environment): mismas claves pero con las de **producción** cuando vayamos a lanzar. Para probar end-to-end primero, se pueden poner las de prueba también en Render.
- [ ] **Confirmar precios finales** (hoy son propuesta): packs `10 = S/8`, `25 = S/15`; Premium `S/9.90/mes`. ¿Se quedan o los cambias?
- [ ] **OK a dependencias nuevas:**
  - Backend: `mercadopago` (SDK oficial PyPI).
  - Mobile: `expo-web-browser` (abrir el checkout de MP).

## 🟡 Decisión técnica a cerrar

- [ ] **URL de retorno del checkout.** Checkout Pro exige `back_urls` con **https** (no admite `caepe://`). Plan propuesto:
  - `back_urls` → `https://caepe.lat/billing/return` (una página simple en la landing).
  - El mobile abre el checkout en WebView (`expo-web-browser`); cuando detecta navegación a `/billing/return`, cierra el WebView y vuelve a la app, y refresca `GET /billing/me`.
  - La **confirmación real** del pago NO depende de esa página: viene por el **webhook** (fuente de verdad).
  - → Implica una tarea extra en el repo de la **landing**: crear `billing-return.html` + rewrite.

## 🔧 Implementación pendiente (de Claude), por etapa

### Etapa 3 — Créditos
- `services/mercadopago_service.py`: crear preferencia (SDK), `back_urls`, `notification_url`, `external_reference` = id de `billing_payments`.
- `POST /billing/credits/checkout` → crea `billing_payments(pending)` + devuelve `init_point`.
- `POST /billing/webhook` → consulta el pago en MP, valida firma, si `approved` y no procesado → otorga créditos (idempotente por `mp_payment_id`).
- Tests con webhook simulado (mock del SDK).

### Etapa 4 — Premium
- `POST /billing/premium/checkout` → preferencia de 1 mes.
- Webhook: al aprobar → `premium_until += 30 días` (acumula si ya tenía).

### Etapa 5 — Referidos
- Generar `referral_code` al crear usuario.
- Registro acepta `referral_code` + `device_hash` → crea `referrals(pending)`.
- Al fondear un evento (`check_and_mark_funded`): calificar referido con anti-abuso (teléfono único, device_hash no repetido, tope 12 meses/año) → `referrer.premium_until += 30 días`.
- `GET /referrals/me` (código, link, progreso).

### Etapa 6 — Banner (no necesita MP, se puede hacer ya)
- `GET /banners` (filtra activos por audiencia) + componente `AdBanner` en Home (oculto para premium).

### Mobile (cuando estén los endpoints)
- Conectar botones del paywall (`comprar créditos` / `hazte premium`) al `init_point` vía `expo-web-browser`.
- Manejar retorno (`/billing/return`) → refetch billing.
- Pantalla de referidos + `AdBanner`.

## 🚀 Operativo / deploy
- [ ] Registrar webhook en panel MP → URL `https://caepe.onrender.com/billing/webhook` (cuando exista el endpoint).
- [ ] **Rebuild del APK** al final (acumula: links de grupo a web, iconos centrados, paywall, y el mobile de pagos). Hacerlo una sola vez cuando el flujo de pago mobile esté completo, para no rebuildear varias veces.

## Orden sugerido
1. Cargar credenciales de prueba (.env local) + confirmar precios y deps.
2. Etapa 3 (créditos) + etapa 4 (premium) en backend, con tests sandbox.
3. Etapa 5 (referidos) + etapa 6 (banner).
4. Mobile: conectar checkout + referidos + banner.
5. Página `billing-return` en la landing + registrar webhook.
6. Swap a credenciales de producción + rebuild APK + prueba final.
