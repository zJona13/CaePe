# Fase 3 — Mobile Core UI: Design Spec

**Fecha:** 2026-05-01
**Proyecto:** CaePe
**Fase:** 3 (Mobile Core UI)
**Estado:** aprobado por usuario, pendiente review final

---

## 1. Contexto y objetivo

CaePe es una app social móvil para jóvenes peruanos (18–30, primera ciudad: Chiclayo) que organiza salidas grupales, divide presupuesto y confirma pagos. La app **no retiene dinero** (Yape/Plin externo).

Fases 0–2 entregaron: scaffolding, modelos, auth Supabase, seed de 30 planes Chiclayo, y flujo de negocio backend completo (grupos, eventos, participantes, pagos, fondeado automático, invitaciones). Endpoints disponibles: `/auth`, `/groups`, `/plans`, `/events`, `/payments`.

**Objetivo Fase 3:** implementar 14 pantallas mobile con flujo end-to-end conectado al backend real, en español es-PE con identidad visual y léxica para jóvenes chiclayanos.

**Métrica de éxito UX:** usuario crea grupo + usa ruleta + crea evento en menos de 3 minutos.

---

## 2. Stack y dependencias

| Categoría | Dependencia | Notas |
|-----------|-------------|-------|
| Framework | Expo SDK 54 + React Native 0.81 + TypeScript | ya en Fase 0 |
| Routing | `expo-router` 6.x | file-based, ya en Fase 0 |
| Auth | `@supabase/supabase-js` | placeholders en `.env.example` |
| Storage | `@react-native-async-storage/async-storage` | peer dep obligatorio Supabase RN |
| Server state | `@tanstack/react-query` | cache, refetch invisible |
| Session state | `zustand` | sólo auth (user, token) |
| Forms | `react-hook-form` | declarativo, sin re-renders innecesarios |
| Iconos | `lucide-react-native` + `react-native-svg` (peer) | set fijo de 14 íconos |
| Pickers | `@react-native-community/datetimepicker` | fecha/hora native |
| Clipboard | `expo-clipboard` | viene con Expo SDK |

**Sin** otras libs UI (NativeBase, UI Kitten, Tamagui, etc). Sólo RN primitives + StyleSheet.

**Conexión local (Q3 decidida):** sólo emulador Android (`http://10.0.2.2:8000`) / iOS sim (`http://localhost:8000`). Sin LAN IP gymnastics. Configurable via `EXPO_PUBLIC_API_URL`.

---

## 3. Identidad visual

### Paleta — `theme/colors.ts`
Concepto: sol norteño + mar Pimentel + criollo. Vibrante, callejero, alegre.

| Rol | HEX |
|-----|-----|
| Primario (naranja sol) | `#FF6B35` |
| Secundario (turquesa) | `#2EC4B6` |
| Acento (amarillo dorado) | `#FFB627` |
| Éxito / fondeado (verde lima) | `#06D6A0` |
| Error (coral) | `#EF476F` |
| Texto principal | `#1A1A2E` |
| Texto secundario | `#6B7280` |
| Fondo (crema cálido) | `#FFF8F0` |
| Surface (cards) | `#FFFFFF` |
| Borde | `#E8E8E8` |
| Overlay modal | `rgba(26,26,46,0.5)` |

### Spacing — `theme/spacing.ts`
Escala 4pt: `xs=4, sm=8, md=12, lg=16, xl=24, xxl=32, xxxl=48`

### Radius — `theme/radius.ts`
`sm=8, md=12, lg=16, full=9999`

### Typography — `theme/typography.ts`
System font (sin custom font load).
```
display: 28 / 700
h1:      24 / 700
h2:      20 / 600
body:    16 / 400
caption: 13 / 400
button:  16 / 600
```

### Tono UI
- Bordes redondeados generosos (radius 12-16)
- Sombras suaves en cards (`opacity:0.05, radius:8, offsetY:2`)
- Botón primario: naranja sólido, texto blanco, radius 12, padding alto
- Ruleta: gradient naranja→amarillo, animación 1.5s ease-out

---

## 4. Identidad léxica (español es-PE, jerga juvenil chiclayana)

Centralizada en `lib/slang.ts`. Glosario aprobado v2 (filtra términos antiguos como "roche", soeces, o ambiguos).

### Glosario
| Término | Uso |
|---------|-----|
| Palta / no te hagas paltas | error / tranquilizar |
| Causa, pata, choche, collera, bróder | personas / grupo |
| Habla | saludo |
| Bacán, qué paja, mostro, monstruo | positivo |
| De ley | confirmación |
| Al toque | rápido / loading |
| Cayó | sucedió, fondeado |
| Pasa la voz | compartir |
| Yara | alerta / cuidado |
| Chaufa | adiós |
| Planazo | ruleta (ya en spec) |

### Mapeo a UI
| Pantalla / acción | Copy |
|-------------------|------|
| Home saludo | `¡Habla, [nombre]!` |
| Crear evento | `Arma el plan` |
| Ruleta CTA | `¡Tira la ruleta!` |
| Resultado ruleta | `¡Qué paja! Tu planazo:` |
| Estado fondeado título | `¡Cayó! Plan armado` |
| Fondeado subtítulo | `Todos pagaron, mostro. Disfruten el plan.` |
| Marcar pago | `Cayó la cuota` |
| Compartir WhatsApp | `Pasa la voz` |
| Sección grupos | `Tu collera` |
| Vacío grupos | `Aún sin collera. Arma una.` |
| Vacío eventos | `Sin planes todavía. Arma uno.` |
| Confirmación genérica | `De ley` |
| Cancelar suave | `Mejor después` |
| Logout | `Chaufa` |
| Error genérico | `Palta, intenta de nuevo.` |
| Loading | `Al toque...` |
| Tooltip pago externo | `El pago va por fuera. No te hagas paltas.` |
| Recordatorio pago | `¡Yara! Aún falta tu cuota.` |

---

## 5. Estructura de archivos

```
mobile/
├── app/
│   ├── _layout.tsx                  # QueryClientProvider + auth guard root
│   ├── (auth)/
│   │   ├── _layout.tsx              # Stack sin header
│   │   ├── onboarding.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx              # Tabs Home + Profile
│   │   ├── home.tsx
│   │   └── profile.tsx
│   ├── groups/
│   │   ├── new.tsx
│   │   └── [id].tsx
│   ├── planazo/
│   │   └── ruleta.tsx
│   └── events/
│       ├── new.tsx
│       └── [id]/
│           ├── _layout.tsx
│           ├── index.tsx            # detalle público (modo invitado)
│           ├── summary.tsx
│           ├── share.tsx
│           ├── payments.tsx
│           └── funded.tsx
├── lib/
│   ├── api.ts                       # fetch wrapper + JWT interceptor + errors
│   ├── supabase.ts                  # cliente con AsyncStorage adapter
│   ├── store.ts                     # Zustand: { user, token, setSession, clearSession }
│   ├── queries/
│   │   ├── client.ts                # QueryClient config
│   │   ├── plans.ts                 # usePlans, useRandomPlan
│   │   ├── groups.ts                # useGroups, useGroup, useCreateGroup, useJoinGroup
│   │   ├── events.ts                # useEvent, useCreateEvent, useUpdateEvent, useShareMessage
│   │   └── payments.ts              # useMarkPayment (invalidates event)
│   └── slang.ts                     # constantes copy es-PE (glosario v2)
├── components/
│   ├── PrimaryButton.tsx
│   ├── PlanCard.tsx
│   ├── ParticipantRow.tsx
│   └── PaymentStatusBadge.tsx
├── theme/
│   ├── colors.ts
│   ├── spacing.ts
│   ├── radius.ts
│   └── typography.ts
├── app.json
├── package.json
├── tsconfig.json
└── .env.example                     # EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
```

**Diferencias con spec literal de Fase 3:**
- Añadido `lib/queries/` (separar hooks RQ por dominio)
- Añadido `lib/slang.ts` (centralizar copy es-PE para mantenibilidad)
- Añadido `theme/spacing.ts`, `radius.ts`, `typography.ts` (spec sólo lista `colors.ts`; resto necesario para coherencia)
- Añadido `events/[id]/_layout.tsx` (Stack para sub-rutas evento)

---

## 6. Estado y data flow

### Zustand (`lib/store.ts`) — sólo sesión
```ts
type SessionState = {
  user: {
    id: string;
    email: string;
    name?: string;
    payment_method?: 'yape' | 'plin';
    payment_number?: string;
  } | null;
  token: string | null;        // Supabase JWT
  setSession(user, token): void;
  clearSession(): void;
};
```
Persistencia vía Zustand `persist` middleware + AsyncStorage. Token y user sobreviven cierre de app.

### React Query (`lib/queries/client.ts`)
```ts
defaults: {
  staleTime: 30_000,
  retry: 1,
  refetchOnWindowFocus: true,
}
```
Cada mutación (marcar pago, crear evento, agregar participante) invalida el query del evento. Esto resuelve la regla "marcar último pago → estado fondeado": invalidate → refetch invisible → componente re-renderiza con `status='funded'` → redirect automático a `/events/[id]/funded`.

### API wrapper (`lib/api.ts`)
```ts
fetch(`${EXPO_PUBLIC_API_URL}${path}`, {
  headers: {
    ...(token && { Authorization: `Bearer ${token}` }),
    'Content-Type': 'application/json',
  },
})
```
Interceptor: si 401 → `clearSession()` + redirect onboarding (sin toast — flujo limpio).

---

## 7. Auth + route protection + modo invitado

### Root layout (`app/_layout.tsx`)
Envuelve todo con `<QueryClientProvider>`. Verifica sesión.

```
if (!token && currentRoute !== /events/[id]/index) → redirect /(auth)/onboarding
if (token && currentRoute starts with /(auth)) → redirect /(tabs)/home
```

### Modo invitado
- `events/[id]/index.tsx` siempre público
- Deep link: `caepe://events/<uuid>` (scheme ya en `app.json`)
- Si `!token`: render read-only (sin botones de mutación) + CTA `Únete a CaePe` que va a `/(auth)/register`

### Onboarding
- AsyncStorage flag `seenOnboarding` para no repetir
- Login y register son rutas separadas, accesibles desde onboarding

### Logout
`profile.tsx` → botón ghost `Chaufa` → `supabase.auth.signOut()` + `clearSession()` + redirect onboarding.

---

## 8. Componentes (4)

### `PrimaryButton.tsx`
Único botón principal por pantalla.
Props: `label, onPress, loading?, disabled?, variant: 'primary'|'secondary'|'ghost', icon?`
- primary: bg naranja, texto blanco, radius 12, padding md/lg, shadow leve
- secondary: bg turquesa
- ghost: transparente + borde naranja + texto naranja
- loading: spinner blanco centrado, disabled mientras
- disabled: opacity 0.5, no press

### `PlanCard.tsx`
Usado en ruleta resultado y `events/new` (preview).
Props: `plan: { name, category, priceMin, priceMax, location, description }`, `selected?, onPress?`
Layout: card surface, radius lg, sombra suave. Header: nombre (h2) + chip categoría. Body: ubicación + descripción truncada 2 líneas. Footer: rango precio "S/ 20 – S/ 35".

### `ParticipantRow.tsx`
Lista en evento.
Props: `name, amountDue, status: 'pending'|'paid', isOrganizer?, onMarkPaid?, paidAt?`
Layout: avatar inicial (círculo color), nombre + badge organizador, amount derecha, `<PaymentStatusBadge>` debajo. Si organizador viendo + status pending → botón secundario inline `Cayó la cuota`.

### `PaymentStatusBadge.tsx`
Props: `status: 'pending'|'paid'`
- pending: bg `#FFF4E6`, texto naranja, label `Falta pagar`
- paid: bg `#E6FBF4`, texto success, label `Pagado` + ícono check

### Set fijo de iconos lucide
`Home, User, Plus, Share2, ChevronRight, Check, Clock, Dice5, Users, Calendar, MapPin, ArrowLeft, LogOut, Copy`

---

## 9. Flujo end-to-end de las 14 pantallas

### 1. `(auth)/onboarding.tsx`
Splash + propósito. Logo CaePe, tagline *"Arma planes con tu collera. Divide cuentas. Sin mover plata por la app."* Dos botones: `Crear cuenta` (→ register) / `Ya tengo cuenta` (→ login). Tras cualquiera de los dos taps, escribe `seenOnboarding=true` en AsyncStorage. En siguientes arranques, root layout salta onboarding y va directo a login si no hay sesión.

### 2. `(auth)/login.tsx`
Form: email + password. PrimaryButton `Entrar`. Link "¿Nuevo? Crear cuenta". On success → `setSession()` → `/(tabs)/home`.

### 3. `(auth)/register.tsx`
Form: name + email + password + payment_method (Yape/Plin chip selector) + payment_number (9 dígitos). PrimaryButton `Crear cuenta`. On success → POST `/auth/register` (Supabase signUp) → setSession → `/(tabs)/home`.

### 4. `(tabs)/home.tsx`
Header: `¡Habla, [name]!`. Sección 1: collera (lista de grupos del user, card por grupo, → `/groups/[id]`). Sección 2: Eventos próximos (lista plana de eventos donde user participa). FAB `+ Arma el plan` abre menú: `Crear collera` / `Tira la ruleta` / `Crear evento directo`.

### 5. `(tabs)/profile.tsx`
Avatar + nombre + email. Edit fields: `payment_method` + `payment_number`. PrimaryButton secondary `Guardar`. Bottom: ghost button `Chaufa` (logout).

### 6. `groups/new.tsx`
Form: nombre del grupo. PrimaryButton `Armar collera`. POST `/groups` → al success muestra `invite_code` + botón `Pasa la voz` (compartir WhatsApp con link `caepe://groups/join/{code}`). Luego `→ /groups/[id]`.

### 7. `groups/[id].tsx`
Header: nombre + invite code + botón `Pasa la voz`. Sección miembros (lista). Sección eventos del grupo. PrimaryButton `Crear evento` → `/events/new?groupId={id}`.

### 8. `planazo/ruleta.tsx`
Filtros arriba: chips categoría (multi), inputs `Min S/` `Max S/`, input `# personas`. PrimaryButton `¡Tira la ruleta!`. Animación: `Animated.timing(rotate, { toValue: 3, duration: 1500, easing: Easing.out(Easing.cubic) })` (3 vueltas). Al terminar, fetch `GET /plans/random?category=&price_max=` con filtros, render `<PlanCard>` debajo + dos botones: `Otra vuelta` / `Arma evento con este` → `/events/new?planId={id}`.

### 9. `events/new.tsx`
Pre-relleno desde `planId` (si vino) o `groupId` (lista miembros pre-cargados). Form:
- Nombre evento (default = nombre del plan)
- DatePicker (fecha)
- TimePicker (hora)
- Lugar (TextInput, pre-relleno desde plan.location)
- Presupuesto total (Decimal input)
- Lista participantes (chips con nombre/teléfono, botón `+ Agregar`)
- **Live calc**: `useWatch` sobre `[totalBudget, participants]` recalcula `amount_per_person = total / n` en cliente, mostrado en card destacado. POST final envía total + lista; backend re-calcula y persiste.
PrimaryButton `Confirmar evento` → POST `/events` → `→ /events/[id]/summary`.

### 10. `events/[id]/summary.tsx`
Resumen post-creación: nombre, fecha, lugar, monto/persona, lista participantes con `amount_due`. Dos botones: `Pasa la voz` → `/events/[id]/share` y `Ver evento` → `/events/[id]`.

### 11. `events/[id]/share.tsx`
Fetch `POST /events/{id}/share-message` (backend retorna texto preformateado). Muestra preview. PrimaryButton `Compartir por WhatsApp` → `Linking.openURL('whatsapp://send?text=' + encodeURIComponent(msg))`. Si WhatsApp no instalado: catch → fallback `Share.share({ message: msg })`. Botón secundario `Copiar mensaje`.

### 12. `events/[id]/index.tsx` (modo invitado posible)
Header: nombre + estado (badge). Cuerpo: fecha/hora, lugar (con MapPin icon), monto/persona destacado, método de pago organizador (Yape/Plin + número + botón `Copiar al portapapeles`), texto explícito *"El pago va por fuera. No te hagas paltas."*, lista participantes con `<PaymentStatusBadge>`.
- Si `!token`: CTA `Únete a CaePe`
- Si `user == organizer`: botones `Marcar pagos` (→ payments) + `Editar` (→ `/events/new` mode edit)
- Si `event.status == 'funded'`: redirect automático → `/events/[id]/funded`

### 13. `events/[id]/payments.tsx`
Solo organizador. Lista `<ParticipantRow>` con botón `Cayó la cuota` por pendiente. On tap → mutation `PATCH /events/{id}/participants/{pid}/payment` → React Query invalida event → si todos paid → backend marca `funded` → query refetch → redirect `/events/[id]/funded`.

### 14. `events/[id]/funded.tsx`
Pantalla celebración. Bg `colors.success` (verde lima), ícono Check 80px blanco, título `¡Cayó! Plan armado`, mensaje `Todos pagaron, mostro. Disfruten el plan.`. Botón ghost `Volver al inicio` → `/(tabs)/home`.

---

## 10. Estados error / loading uniformes

- **Loading**: skeleton card (placeholder bg + shimmer suave) o spinner naranja con texto `Al toque...`
- **Error red**: card crema con borde coral, título `Palta, intenta de nuevo.`, botón `Reintentar` que dispara `query.refetch()`
- **401**: `clearSession()` → redirect onboarding (sin toast)
- **Empty state**: ilustración simple (Lucide icon grande gris) + texto + CTA contextual

---

## 11. Reglas críticas — implementación

1. **Botón primario único por pantalla, arriba del fold** → enforced via `<PrimaryButton>`; review visual al final
2. **Ruleta animación 1.5s ease-out** → `Animated.timing` cúbico, resultado destacado con scale-up 200ms
3. **Filtros ruleta** → categoría chips multi (query param repetido), price min/max numeric, # personas afecta sólo cálculo
4. **Pantalla pago participante** → `events/[id]/index.tsx`: monto, método organizador, número con `Copiar al portapapeles` (`expo-clipboard`), texto pago externo
5. **Pantalla fondeado** → bg verde lima, ícono Check 80px, título `¡Cayó! Plan armado`
6. **WhatsApp** → `Linking.openURL` con fallback a `Share.share`
7. **Modo invitado** → `events/[id]/index.tsx` accesible sin token; deep link `caepe://events/<uuid>`

---

## 12. Verificación (criterios de aceptación)

Spec no pide tests automatizados en mobile. Verificación manual end-to-end en Expo Go (Android emulator + iOS sim):

- [ ] **E2E flujo completo**: registro → crear collera → ruleta filtrada → arma evento → resumen → comparte → ver detalle → marcar 3 pagos → llegar a `funded`
- [ ] 14 pantallas existen y navegables
- [ ] Ruleta filtra: categoría=`comida` + price_max=`30` → resultado coherente con backend
- [ ] Crear evento: cambiar presupuesto en vivo → `amount_per_person` actualiza on-render sin lag
- [ ] Marcar último pago → React Query invalida → pantalla pasa a `funded` sin pull-to-refresh
- [ ] WhatsApp: tap `Pasa la voz` → abre WhatsApp con texto preformateado del backend
- [ ] Deep link: cerrar sesión, abrir `caepe://events/<uuid>` → renderiza modo invitado, sin botones de mutación
- [ ] Logout → vuelve a onboarding, AsyncStorage limpio salvo `seenOnboarding`

---

## 13. Stop conditions (lo que NO se hace en Fase 3)

- Sin upload real de proof image (Fase 4)
- Sin push notif (Fase 4)
- Sin onboarding tour, sin animaciones extra fuera de la ruleta
- Sin dark mode toggle
- Sin pantallas fuera de las 14 listadas
- Sin libs UI extra fuera de las aprobadas

---

## 14. Decisiones aprobadas (resumen)

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | Branding | Paleta naranja sol + turquesa + lima fondeado, vibe Chiclayo joven |
| 2 | Slang | Glosario v2 (palta, mostro, qué paja, cayó, etc.) — sin "roche" ni soeces |
| 3 | Supabase config | Placeholders en `.env.example` |
| 4 | API URL | Sólo emulador (Android `10.0.2.2`, iOS sim `localhost`) |
| 5 | Forms | `react-hook-form` |
| 6 | Deps extra | react-hook-form, async-storage, react-native-svg, datetimepicker |
| 7 | Server state | TanStack Query + Zustand sólo auth |
