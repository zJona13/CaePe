# Fase 5 — Monetización (Mercado Pago, Premium, Referidos, Banner)

> Estado: **spec / pendiente de aprobación e implementación**. No empezar a codear hasta tener credenciales de Mercado Pago y confirmar dependencias nuevas.

## Decisiones tomadas (usuario, 2026-06-26)

1. **Eventos extra (plan free):** se venden en **paquetes de créditos** (no S/1 individual).
2. **Plan Premium (arranque):** **eventos ilimitados** + **recordatorios automáticos de pago**. El resto (sin ads, estadísticas, recurrentes) queda para después.
3. **Referidos:** el mes premium se otorga **cuando el referido completa un evento que llega a `funded`** (uso real, anti-multicuenta).
4. **Facturación Premium:** **renovación manual mensual** (pago único en MP cada mes; sin recurrencia automática por ahora).

## Modelo de negocio

- **Free (por defecto):** hasta **5 eventos** creados como organizador. Al llegar al tope, para crear más necesita **créditos** o **Premium**.
- **Créditos:** 1 crédito = 1 evento extra. Packs propuestos (a confirmar precio):
  - 10 créditos — **S/ 8**
  - 25 créditos — **S/ 15**
- **Premium:** **S/ 9.90 / mes** (a confirmar) → eventos ilimitados + recordatorios automáticos. Renovación manual.
- **Referidos:** por cada referido que llega a un evento `funded`, el referente gana **30 días de Premium** (con tope anti-abuso).

> ⚠️ **Google Play:** cobrar funciones digitales con Mercado Pago viola la política de Play. Hoy el APK se reparte por `caepe.lat` (sideload), así que está OK. Si se sube a Play Store, las suscripciones tendrían que migrar a Google Play Billing.

## Integración Mercado Pago (Perú)

- **Checkout Pro**: backend crea una *preferencia* (`/checkout/preferences`) → devuelve `init_point` → la app la abre en WebView (`expo-web-browser`).
- **Confirmación**: por **webhook** (`notification_url` en la preferencia). El pago NO se confía en el redirect del cliente; solo el webhook (verificado contra la API de MP) cambia el estado.
- **SDK**: `mercadopago` (PyPI, oficial). Moneda **PEN**. Sandbox disponible para pruebas.
- **Idempotencia**: cada `mp_payment_id` se procesa una sola vez.

Refs: [SDK Python](https://github.com/mercadopago/sdk-python) · [Checkout Pro – crear preferencias (PE)](https://www.mercadopago.com.pe/developers/es/docs/checkout-pro/integrate-preferences) · [Webhooks](https://www.mercadopago.com.pe/developers/es/docs)

## Modelo de datos (migración `0003`)

**Extender `users`:**
- `plan` ENUM('free','premium') DEFAULT 'free'
- `premium_until` TIMESTAMP NULL  (premium activo si `premium_until > now()`)
- `event_credits` INT DEFAULT 0
- `referral_code` VARCHAR(8) UNIQUE  (generado al crear usuario)

**Nuevas tablas:**
- `billing_payments(id, user_id FK, kind ENUM('credits','premium'), pack_code, amount NUMERIC, currency, mp_preference_id, mp_payment_id, status ENUM('pending','approved','rejected','refunded') DEFAULT 'pending', credits_granted INT NULL, premium_days INT NULL, created_at, confirmed_at NULL)`
- `referrals(id, referrer_user_id FK, referred_user_id FK NULL, status ENUM('pending','qualified','rewarded') DEFAULT 'pending', device_hash VARCHAR NULL, qualified_at NULL, rewarded_at NULL, created_at)`
- `app_banners(id, title, image_url, link_url, audience ENUM('all','free_only') DEFAULT 'all', is_active BOOL DEFAULT true, priority INT DEFAULT 0, starts_at NULL, ends_at NULL, created_at)`

## Lógica backend (services/)

1. **Gating de creación de eventos** (en `events_service`):
   - `can_create_event(user) -> (ok, reason)`: premium activo → ilimitado; free → si `events_creados < 5` ok; si no, si `event_credits > 0` consume 1 crédito; si no → bloquea con `402 PaymentRequired` + payload que indica packs/premium.
   - Conteo: **eventos creados como organizador** (lifetime). *(A confirmar: lifetime vs activos.)*
2. **`mercadopago_service`**: `create_credits_preference(user, pack)`, `create_premium_preference(user)`, `handle_webhook(payload)` → verifica pago en MP, si `approved`: otorga créditos o `premium_until += 30d`, marca `billing_payments`.
3. **Referidos** (`referrals_service`):
   - En registro: acepta `referral_code` opcional → crea `referrals(pending)` con `referred_user_id` + `device_hash`.
   - Anti-abuso al calificar (cuando el referido fondea un evento, vía `check_and_mark_funded`):
     - referido ≠ referente; teléfono único; `device_hash` no repetido entre referidos del mismo referente; tope de **12 meses/año** de premium por referidos.
   - Al calificar → `referrer.premium_until += 30d`, marca `rewarded`.
4. **Banners**: `GET /banners` filtra activos por audiencia (los premium no reciben `free_only`).

## Endpoints nuevos

- `POST /billing/credits/checkout` (auth) → `{ init_point }`
- `POST /billing/premium/checkout` (auth) → `{ init_point }`
- `POST /billing/webhook` (público, verificado contra MP) → procesa notificación
- `GET /billing/me` (auth) → plan, premium_until, event_credits, eventos restantes
- `GET /referrals/me` (auth) → código, link, referidos y su estado
- `GET /banners` (auth/público) → banners activos para mostrar en Home

## Mobile (pantallas/componentes nuevos)

- Paywall al topar 5 eventos → ofrece packs de créditos o Premium (abre `init_point` en WebView).
- Pantalla Premium (estado + comprar mes).
- Pantalla Referidos (compartir código/link + progreso).
- `AdBanner` en Home (oculto para premium), data de `GET /banners`.
- Tras volver del checkout MP (deep link `caepe://billing/return`): refetch de `GET /billing/me`.

**Deps nuevas a confirmar:** backend `mercadopago`; mobile `expo-web-browser`.

## Rollout por etapas (PRs)

1. Migración `0003` + campos de plan en `users` + tablas nuevas.
2. Gating de 5 eventos (funciona sin pagos: bloquea y expone estado). + tests.
3. MP: packs de créditos (checkout + webhook + otorgar créditos). + tests con webhook simulado.
4. Premium (checkout + webhook + `premium_until`). + tests.
5. Referidos (registro con código + calificación al fondear + anti-abuso). + tests.
6. Banners (endpoint + seed/admin manual).
7. Mobile: paywall, premium, referidos, banner, manejo de retorno de checkout.

## Pendiente del usuario antes de implementar

- Credenciales MP (sandbox + prod): `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`.
- Confirmar precios (packs y Premium).
- Confirmar conteo de límite: lifetime vs eventos activos.
- Confirmar deps nuevas (`mercadopago`, `expo-web-browser`).
