# Fase 3 — Mobile Core UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 14 mobile screens for CaePe with end-to-end flow connected to the backend (Fases 0–2).

**Architecture:** Expo SDK 54 + RN 0.81 + TypeScript + expo-router (file-based). State split: TanStack Query for server state, Zustand for auth session only. Forms via react-hook-form. Sin libs UI extras — solo RN primitives + StyleSheet + lucide-react-native. Copy es-PE centralizado en `lib/slang.ts`. Auth via Supabase (placeholders en env). API base = `EXPO_PUBLIC_API_URL` (Android emulator `10.0.2.2:8000`, iOS sim `localhost:8000`).

**Tech Stack:** Expo 54, React Native 0.81, TypeScript 5.9 strict, expo-router 6, @tanstack/react-query, zustand, react-hook-form, @supabase/supabase-js, @react-native-async-storage/async-storage, lucide-react-native, react-native-svg, @react-native-community/datetimepicker, expo-clipboard.

**Spec reference:** `docs/superpowers/specs/2026-05-01-fase3-mobile-core-ui-design.md`

**Backend contracts confirmed (from Fase 2 routers):**
- `POST /auth/register` requires valid Supabase JWT — mobile signs up with Supabase first, then provisions row
- `POST /auth/login` is echo of authenticated user — mobile does Supabase signIn then `GET /auth/me`
- `GET /events/{id}` is public (no auth dep) — works for guest mode
- `GET /events` lists events for groups user belongs to — filter by `group_id` client-side
- `POST /groups/join/{invite_code}` accepts optional auth — guest path works
- Plans random supports `category`, `price_min`, `price_max`, `city` — `#personas` is client-side only
- Plan categories enum: `comida | deporte | fiesta | cultura | aire_libre | otros`

**Verification model:** spec dice no automated tests for mobile. Each task ends with TypeScript compile check (`npx tsc --noEmit`). Manual smoke tests run at end (Task 33).

---

## Task 0: Install dependencies + update env

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/.env.example` (likely missing — create if so)

- [ ] **Step 1: Install runtime deps**

```bash
cd C:/CaePe/mobile
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage @tanstack/react-query zustand react-hook-form lucide-react-native react-native-svg @react-native-community/datetimepicker expo-clipboard
```

Expected: package.json updated. Versions resolved by `expo install` to compatible RN/Expo SDK 54.

- [ ] **Step 2: Verify install**

```bash
npx tsc --noEmit
```

Expected: PASS (no type errors). If types missing for any dep, install corresponding `@types/*` (most listed deps ship types).

- [ ] **Step 3: Create `.env.example` if missing, set placeholders**

File `mobile/.env.example`:
```
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY-HERE
```

- [ ] **Step 4: Commit**

```bash
cd C:/CaePe
git add mobile/package.json mobile/package-lock.json mobile/.env.example
git commit -m "chore(mobile): install Fase 3 deps + env placeholders"
```

---

## Task 1: Theme tokens

**Files:**
- Create: `mobile/theme/colors.ts`
- Create: `mobile/theme/spacing.ts`
- Create: `mobile/theme/radius.ts`
- Create: `mobile/theme/typography.ts`

- [ ] **Step 1: Write `theme/colors.ts`**

```ts
export const colors = {
  primary: '#FF6B35',
  secondary: '#2EC4B6',
  accent: '#FFB627',
  success: '#06D6A0',
  error: '#EF476F',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  background: '#FFF8F0',
  surface: '#FFFFFF',
  border: '#E8E8E8',
  overlay: 'rgba(26,26,46,0.5)',
  badgePendingBg: '#FFF4E6',
  badgePaidBg: '#E6FBF4',
} as const;

export type ColorKey = keyof typeof colors;
```

- [ ] **Step 2: Write `theme/spacing.ts`**

```ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;
```

- [ ] **Step 3: Write `theme/radius.ts`**

```ts
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;
```

- [ ] **Step 4: Write `theme/typography.ts`**

```ts
import type { TextStyle } from 'react-native';

export const typography = {
  display: { fontSize: 28, fontWeight: '700' as TextStyle['fontWeight'] },
  h1:      { fontSize: 24, fontWeight: '700' as TextStyle['fontWeight'] },
  h2:      { fontSize: 20, fontWeight: '600' as TextStyle['fontWeight'] },
  body:    { fontSize: 16, fontWeight: '400' as TextStyle['fontWeight'] },
  caption: { fontSize: 13, fontWeight: '400' as TextStyle['fontWeight'] },
  button:  { fontSize: 16, fontWeight: '600' as TextStyle['fontWeight'] },
} as const;
```

- [ ] **Step 5: Verify**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd C:/CaePe
git add mobile/theme/
git commit -m "feat(mobile): add theme tokens (colors, spacing, radius, typography)"
```

---

## Task 2: Slang constants

**Files:**
- Create: `mobile/lib/slang.ts`

- [ ] **Step 1: Write `lib/slang.ts`**

```ts
export const SLANG = {
  helloUser: (name: string) => `¡Habla, ${name}!`,
  ctaCreatePlan: 'Arma el plan',
  ctaSpinRoulette: '¡Tira la ruleta!',
  ctaShare: 'Pasa la voz',
  ctaMarkPaid: 'Cayó la cuota',
  ctaLogout: 'Chaufa',
  ctaCreateAccount: 'Crear cuenta',
  ctaHaveAccount: 'Ya tengo cuenta',
  ctaEnter: 'Entrar',
  ctaCreateGroup: 'Armar collera',
  ctaCreateEvent: 'Crear evento',
  ctaConfirm: 'De ley',
  ctaSoftCancel: 'Mejor después',
  ctaSpinAgain: 'Otra vuelta',
  ctaUseThisPlan: 'Arma evento con este',
  ctaShareWhatsapp: 'Compartir por WhatsApp',
  ctaCopyMessage: 'Copiar mensaje',
  ctaCopy: 'Copiar al portapapeles',
  ctaMarkPayments: 'Marcar pagos',
  ctaJoinCaepe: 'Únete a CaePe',
  ctaBackHome: 'Volver al inicio',
  ctaSave: 'Guardar',
  ctaConfirmEvent: 'Confirmar evento',
  ctaAddParticipant: '+ Agregar',
  fundedTitle: '¡Cayó! Plan armado',
  fundedSubtitle: 'Todos pagaron, mostro. Disfruten el plan.',
  rouletteResult: '¡Qué paja! Tu planazo:',
  emptyGroups: 'Aún sin collera. Arma una.',
  emptyEvents: 'Sin planes todavía. Arma uno.',
  paymentExternal: 'El pago va por fuera. No te hagas paltas.',
  errorGeneric: 'Palta, intenta de nuevo.',
  loading: 'Al toque...',
  reminderUnpaid: '¡Yara! Aún falta tu cuota.',
  badgePending: 'Falta pagar',
  badgePaid: 'Pagado',
  sectionGroups: 'Tu collera',
  sectionEvents: 'Eventos próximos',
  tagline: 'Arma planes con tu collera. Divide cuentas. Sin mover plata por la app.',
} as const;
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/lib/slang.ts
git commit -m "feat(mobile): add es-PE slang constants module"
```

---

## Task 3: Supabase client

**Files:**
- Create: `mobile/lib/supabase.ts`

- [ ] **Step 1: Write `lib/supabase.ts`**

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 2: Install missing polyfill**

```bash
cd C:/CaePe/mobile && npx expo install react-native-url-polyfill
```

- [ ] **Step 3: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/lib/supabase.ts mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): add Supabase client with AsyncStorage adapter"
```

---

## Task 4: Zustand session store

**Files:**
- Create: `mobile/lib/store.ts`

- [ ] **Step 1: Write `lib/store.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  payment_method?: 'yape' | 'plin' | null;
  payment_number?: string | null;
};

type SessionState = {
  user: SessionUser | null;
  token: string | null;
  seenOnboarding: boolean;
  setSession: (user: SessionUser, token: string) => void;
  clearSession: () => void;
  setSeenOnboarding: () => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      seenOnboarding: false,
      setSession: (user, token) => set({ user, token }),
      clearSession: () => set({ user: null, token: null }),
      setSeenOnboarding: () => set({ seenOnboarding: true }),
    }),
    {
      name: 'caepe.session',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/lib/store.ts
git commit -m "feat(mobile): add Zustand session store with AsyncStorage persistence"
```

---

## Task 5: API wrapper

**Files:**
- Create: `mobile/lib/api.ts`

- [ ] **Step 1: Write `lib/api.ts`**

```ts
import { useSession } from './store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions = {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean; // default true; set false for public routes (events/[id], plans, join)
  token?: string; // explicit override (used during register before store updates)
};

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, token: explicitToken } = opts;
  const token = explicitToken ?? useSession.getState().token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let parsed: unknown = null;
  const text = await res.text();
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      useSession.getState().clearSession();
    }
    const detail = (parsed && typeof parsed === 'object' && 'detail' in (parsed as object))
      ? String((parsed as { detail: unknown }).detail)
      : `HTTP ${res.status}`;
    throw new ApiError(res.status, detail, parsed);
  }

  return parsed as T;
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/lib/api.ts
git commit -m "feat(mobile): add typed API wrapper with JWT injection and 401 handling"
```

---

## Task 6: React Query client

**Files:**
- Create: `mobile/lib/queries/client.ts`

- [ ] **Step 1: Write `lib/queries/client.ts`**

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/lib/queries/client.ts
git commit -m "feat(mobile): add shared React Query client"
```

---

## Task 7: PrimaryButton component

**Files:**
- Create: `mobile/components/PrimaryButton.tsx`

- [ ] **Step 1: Write `components/PrimaryButton.tsx`**

```tsx
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  icon?: ReactNode;
};

export function PrimaryButton({ label, onPress, loading, disabled, variant = 'primary', icon }: Props) {
  const isDisabled = disabled || loading;
  const styleByVariant = stylesByVariant[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styleByVariant.container,
        isDisabled && { opacity: 0.5 },
        pressed && !isDisabled && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={styleByVariant.spinner} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, styleByVariant.label]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.button },
});

const stylesByVariant: Record<Variant, { container: object; label: object; spinner: string }> = {
  primary: {
    container: {
      backgroundColor: colors.primary,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    label: { color: colors.surface },
    spinner: colors.surface,
  },
  secondary: {
    container: { backgroundColor: colors.secondary },
    label: { color: colors.surface },
    spinner: colors.surface,
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
    label: { color: colors.primary },
    spinner: colors.primary,
  },
};
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/components/PrimaryButton.tsx
git commit -m "feat(mobile): add PrimaryButton with primary/secondary/ghost variants"
```

---

## Task 8: PaymentStatusBadge component

**Files:**
- Create: `mobile/components/PaymentStatusBadge.tsx`

- [ ] **Step 1: Write `components/PaymentStatusBadge.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { SLANG } from '../lib/slang';

type Props = { status: 'pending' | 'paid' };

export function PaymentStatusBadge({ status }: Props) {
  const isPaid = status === 'paid';
  return (
    <View style={[styles.badge, { backgroundColor: isPaid ? colors.badgePaidBg : colors.badgePendingBg }]}>
      {isPaid && <Check size={12} color={colors.success} />}
      <Text style={[styles.label, { color: isPaid ? colors.success : colors.primary }]}>
        {isPaid ? SLANG.badgePaid : SLANG.badgePending}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 12, fontWeight: '600' },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/components/PaymentStatusBadge.tsx
git commit -m "feat(mobile): add PaymentStatusBadge with pending/paid states"
```

---

## Task 9: PlanCard component

**Files:**
- Create: `mobile/components/PlanCard.tsx`

- [ ] **Step 1: Write `components/PlanCard.tsx`**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export type PlanCardData = {
  name: string;
  category: string;
  price_min: number | string;
  price_max: number | string;
  location?: string | null;
  description?: string | null;
};

type Props = {
  plan: PlanCardData;
  selected?: boolean;
  onPress?: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  comida: 'Comida',
  deporte: 'Deporte',
  fiesta: 'Fiesta',
  cultura: 'Cultura',
  aire_libre: 'Aire libre',
  otros: 'Otros',
};

export function PlanCard({ plan, selected, onPress }: Props) {
  const Wrapper: typeof Pressable | typeof View = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{plan.name}</Text>
        <View style={styles.chip}><Text style={styles.chipText}>{CATEGORY_LABELS[plan.category] ?? plan.category}</Text></View>
      </View>
      {plan.location ? (
        <View style={styles.locationRow}>
          <MapPin size={14} color={colors.textSecondary} />
          <Text style={styles.location}>{plan.location}</Text>
        </View>
      ) : null}
      {plan.description ? (
        <Text style={styles.description} numberOfLines={2}>{plan.description}</Text>
      ) : null}
      <Text style={styles.price}>S/ {plan.price_min} – S/ {plan.price_max}</Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.h2, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  chip: { backgroundColor: colors.accent, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  location: { ...typography.caption, color: colors.textSecondary },
  description: { ...typography.body, color: colors.textSecondary },
  price: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/components/PlanCard.tsx
git commit -m "feat(mobile): add PlanCard component"
```

---

## Task 10: ParticipantRow component

**Files:**
- Create: `mobile/components/ParticipantRow.tsx`

- [ ] **Step 1: Write `components/ParticipantRow.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { PrimaryButton } from './PrimaryButton';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { SLANG } from '../lib/slang';

type Props = {
  name: string;
  amountDue: number | string;
  status: 'pending' | 'paid';
  isOrganizer?: boolean;
  showMarkButton?: boolean;
  onMarkPaid?: () => void;
  marking?: boolean;
};

export function ParticipantRow({ name, amountDue, status, isOrganizer, showMarkButton, onMarkPaid, marking }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={styles.row}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {isOrganizer && <Text style={styles.organizerTag}>organizador</Text>}
        </View>
        <PaymentStatusBadge status={status} />
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>S/ {amountDue}</Text>
        {showMarkButton && status === 'pending' && onMarkPaid ? (
          <View style={{ marginTop: spacing.xs }}>
            <PrimaryButton variant="secondary" label={SLANG.ctaMarkPaid} onPress={onMarkPaid} loading={marking} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', color: colors.textPrimary },
  body: { flex: 1, gap: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  organizerTag: { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' },
  right: { alignItems: 'flex-end' },
  amount: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/components/ParticipantRow.tsx
git commit -m "feat(mobile): add ParticipantRow component"
```

---

## Task 11: Plans queries

**Files:**
- Create: `mobile/lib/queries/plans.ts`

- [ ] **Step 1: Write `lib/queries/plans.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api';

export type PlanCategory = 'comida' | 'deporte' | 'fiesta' | 'cultura' | 'aire_libre' | 'otros';

export type Plan = {
  id: string;
  name: string;
  category: PlanCategory;
  price_min: string;
  price_max: string;
  location: string | null;
  description: string | null;
  city: string;
  is_active: boolean;
};

export type PlanFilters = {
  category?: PlanCategory;
  price_min?: number;
  price_max?: number;
  city?: string;
};

export function usePlans(filters: PlanFilters = {}) {
  return useQuery({
    queryKey: ['plans', filters],
    queryFn: () => apiRequest<Plan[]>('/plans', { auth: false, query: filters }),
  });
}

export async function fetchRandomPlan(filters: PlanFilters): Promise<Plan> {
  return apiRequest<Plan>('/plans/random', { auth: false, query: filters });
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/lib/queries/plans.ts
git commit -m "feat(mobile): add plans query hooks"
```

---

## Task 12: Groups queries

**Files:**
- Create: `mobile/lib/queries/groups.ts`

- [ ] **Step 1: Write `lib/queries/groups.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api';

export type Group = {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
};

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => apiRequest<Group[]>('/groups'),
  });
}

export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: ['groups', id],
    enabled: !!id,
    queryFn: () => apiRequest<Group>(`/groups/${id}`),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiRequest<Group>('/groups', { method: 'POST', body: { name } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) =>
      apiRequest<{ id: string; group_id: string }>(`/groups/join/${inviteCode}`, { method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/lib/queries/groups.ts
git commit -m "feat(mobile): add groups query/mutation hooks"
```

---

## Task 13: Events queries

**Files:**
- Create: `mobile/lib/queries/events.ts`

- [ ] **Step 1: Write `lib/queries/events.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api';

export type EventStatus = 'draft' | 'active' | 'funded' | 'cancelled';

export type EventParticipant = {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  amount_due: string;
  payment_status: 'pending' | 'paid';
  proof_image_url: string | null;
  paid_at: string | null;
};

export type EventDetail = {
  id: string;
  group_id: string;
  organizer_id: string;
  plan_id: string | null;
  name: string;
  date: string | null;
  time: string | null;
  location: string | null;
  total_budget: string;
  amount_per_person: string;
  status: EventStatus;
  created_at: string;
  participants: EventParticipant[];
};

export type EventListItem = Omit<EventDetail, 'participants'>;

export type CreateEventBody = {
  group_id: string;
  plan_id?: string;
  name: string;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  total_budget: string;
  participants: { name: string; phone?: string | null }[];
};

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => apiRequest<EventListItem[]>('/events'),
  });
}

export function useEventsByGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ['events', 'group', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const all = await apiRequest<EventListItem[]>('/events');
      return all.filter((e) => e.group_id === groupId);
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    queryFn: () => apiRequest<EventDetail>(`/events/${id}`, { auth: false }),
    refetchInterval: 5_000,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEventBody) => apiRequest<EventDetail>('/events', { method: 'POST', body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); },
  });
}

export function useShareMessage(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event', eventId, 'share-message'],
    enabled: !!eventId,
    queryFn: () => apiRequest<{ message: string; invite_code: string }>(
      `/events/${eventId}/share-message`,
      { method: 'POST' as never },
    ),
  });
}
```

> **Note:** `useShareMessage` issues a POST via the query system (idempotent on backend — returns the existing invitation if already created). The cast `'POST' as never` is required because TanStack Query's queryFn type doesn't constrain method.

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/lib/queries/events.ts
git commit -m "feat(mobile): add events query/mutation hooks with auto-refetch"
```

---

## Task 14: Payments mutation

**Files:**
- Create: `mobile/lib/queries/payments.ts`

- [ ] **Step 1: Write `lib/queries/payments.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api';
import type { EventParticipant } from './events';

export function useMarkPayment(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, status }: { participantId: string; status: 'pending' | 'paid' }) =>
      apiRequest<EventParticipant>(
        `/events/${eventId}/participants/${participantId}/payment`,
        { method: 'PATCH', body: { payment_status: status } },
      ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event', eventId] }); },
  });
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/lib/queries/payments.ts
git commit -m "feat(mobile): add useMarkPayment mutation with cache invalidation"
```

---

## Task 15: Auth queries

**Files:**
- Create: `mobile/lib/queries/auth.ts`

- [ ] **Step 1: Write `lib/queries/auth.ts`**

```ts
import { apiRequest } from '../api';
import type { SessionUser } from '../store';

export type RegisterBody = {
  email: string;
  name?: string;
  phone?: string;
  payment_method?: 'yape' | 'plin' | null;
  payment_number?: string | null;
};

export async function provisionAccount(body: RegisterBody, token: string): Promise<SessionUser> {
  const u = await apiRequest<SessionUser & { payment_method: 'yape' | 'plin' | null }>(
    '/auth/register',
    { method: 'POST', body, token },
  );
  return u;
}

export async function fetchMe(token: string): Promise<SessionUser> {
  return apiRequest<SessionUser>('/auth/me', { token });
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/lib/queries/auth.ts
git commit -m "feat(mobile): add auth helpers (provisionAccount, fetchMe)"
```

---

## Task 16: Auth route group layout

**Files:**
- Create: `mobile/app/(auth)/_layout.tsx`

- [ ] **Step 1: Write `(auth)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/CaePe
git add mobile/app/\(auth\)/_layout.tsx
git commit -m "feat(mobile): add (auth) route group layout"
```

---

## Task 17: Onboarding screen

**Files:**
- Create: `mobile/app/(auth)/onboarding.tsx`

- [ ] **Step 1: Write `(auth)/onboarding.tsx`**

```tsx
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function Onboarding() {
  const setSeen = useSession((s) => s.setSeenOnboarding);

  const goRegister = () => { setSeen(); router.replace('/(auth)/register'); };
  const goLogin = () => { setSeen(); router.replace('/(auth)/login'); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.brand}>CaePe</Text>
        <Text style={styles.tagline}>{SLANG.tagline}</Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton label={SLANG.ctaCreateAccount} onPress={goRegister} />
        <PrimaryButton variant="ghost" label={SLANG.ctaHaveAccount} onPress={goLogin} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'space-between' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  brand: { ...typography.display, color: colors.primary, fontSize: 56 },
  tagline: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  actions: { gap: spacing.md },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/\(auth\)/onboarding.tsx
git commit -m "feat(mobile): add onboarding screen"
```

---

## Task 18: Login screen

**Files:**
- Create: `mobile/app/(auth)/login.tsx`

- [ ] **Step 1: Write `(auth)/login.tsx`**

```tsx
import { router, Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchMe } from '../../lib/queries/auth';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type FormValues = { email: string; password: string };

export default function Login() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { email: '', password: '' },
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useSession((s) => s.setSession);

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e || !data.session) throw new Error(e?.message ?? 'Sin sesión');
      const token = data.session.access_token;
      const user = await fetchMe(token);
      setSession(user, token);
      router.replace('/(tabs)/home');
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Entrar</Text>

      <Controller
        control={control}
        name="email"
        rules={{ required: 'Email requerido' }}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            placeholder="email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
          />
        )}
      />
      {errors.email && <Text style={styles.err}>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        rules={{ required: 'Contraseña requerida', minLength: { value: 6, message: 'Mín 6 caracteres' } }}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            placeholder="contraseña"
            secureTextEntry
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
          />
        )}
      />
      {errors.password && <Text style={styles.err}>{errors.password.message}</Text>}

      {error && <Text style={styles.err}>{error}</Text>}

      <PrimaryButton label={SLANG.ctaEnter} onPress={onSubmit} loading={loading} />

      <Link href="/(auth)/register" style={styles.link}>¿Nuevo? Crear cuenta</Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body,
  },
  err: { color: colors.error, ...typography.caption },
  link: { color: colors.primary, marginTop: spacing.lg, textAlign: 'center', ...typography.body },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/\(auth\)/login.tsx
git commit -m "feat(mobile): add login screen with Supabase auth"
```

---

## Task 19: Register screen

**Files:**
- Create: `mobile/app/(auth)/register.tsx`

- [ ] **Step 1: Write `(auth)/register.tsx`**

```tsx
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { provisionAccount } from '../../lib/queries/auth';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type FormValues = {
  name: string;
  email: string;
  password: string;
  payment_method: 'yape' | 'plin';
  payment_number: string;
};

export default function Register() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', email: '', password: '', payment_method: 'yape', payment_number: '' },
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useSession((s) => s.setSession);

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.auth.signUp({ email: values.email, password: values.password });
      if (e || !data.session) throw new Error(e?.message ?? 'Sin sesión tras signUp (¿confirmar email habilitado?)');
      const token = data.session.access_token;
      const user = await provisionAccount({
        email: values.email,
        name: values.name,
        payment_method: values.payment_method,
        payment_number: values.payment_number,
      }, token);
      setSession(user, token);
      router.replace('/(tabs)/home');
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{SLANG.ctaCreateAccount}</Text>

      <Controller control={control} name="name" rules={{ required: 'Nombre requerido' }}
        render={({ field: { value, onChange } }) => (
          <TextInput placeholder="nombre" value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
        )}
      />
      {errors.name && <Text style={styles.err}>{errors.name.message}</Text>}

      <Controller control={control} name="email" rules={{ required: 'Email requerido' }}
        render={({ field: { value, onChange } }) => (
          <TextInput placeholder="email" keyboardType="email-address" autoCapitalize="none"
            value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
        )}
      />
      {errors.email && <Text style={styles.err}>{errors.email.message}</Text>}

      <Controller control={control} name="password" rules={{ required: 'Contraseña requerida', minLength: { value: 6, message: 'Mín 6' } }}
        render={({ field: { value, onChange } }) => (
          <TextInput placeholder="contraseña" secureTextEntry value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
        )}
      />
      {errors.password && <Text style={styles.err}>{errors.password.message}</Text>}

      <Text style={styles.label}>Método de pago</Text>
      <Controller control={control} name="payment_method"
        render={({ field: { value, onChange } }) => (
          <View style={styles.chipsRow}>
            {(['yape', 'plin'] as const).map((m) => (
              <Pressable key={m} onPress={() => onChange(m)}
                style={[styles.chip, value === m && styles.chipActive]}>
                <Text style={[styles.chipText, value === m && styles.chipTextActive]}>{m.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        )}
      />

      <Controller control={control} name="payment_number"
        rules={{ required: 'Número requerido', pattern: { value: /^\d{9}$/, message: '9 dígitos' } }}
        render={({ field: { value, onChange } }) => (
          <TextInput placeholder="número (9 dígitos)" keyboardType="number-pad" maxLength={9}
            value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
        )}
      />
      {errors.payment_number && <Text style={styles.err}>{errors.payment_number.message}</Text>}

      {error && <Text style={styles.err}>{error}</Text>}

      <PrimaryButton label={SLANG.ctaCreateAccount} onPress={onSubmit} loading={loading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body,
  },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textPrimary, fontWeight: '600' },
  chipTextActive: { color: colors.surface },
  err: { color: colors.error, ...typography.caption },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/\(auth\)/register.tsx
git commit -m "feat(mobile): add register screen with Supabase signUp + backend provisioning"
```

---

## Task 20: Tabs layout

**Files:**
- Create: `mobile/app/(tabs)/_layout.tsx`
- Delete: `mobile/app/(tabs)/index.tsx` (replaced by `home.tsx` in next task)

- [ ] **Step 1: Write `(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router';
import { Home, User } from 'lucide-react-native';
import { colors } from '../../theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Inicio', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Delete obsolete index.tsx**

```bash
cd C:/CaePe
rm mobile/app/\(tabs\)/index.tsx
```

- [ ] **Step 3: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/\(tabs\)/_layout.tsx mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): add tabs layout (Home + Profile), remove placeholder index"
```

---

## Task 21: Home screen

**Files:**
- Create: `mobile/app/(tabs)/home.tsx`

- [ ] **Step 1: Write `(tabs)/home.tsx`**

```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Plus } from 'lucide-react-native';
import { useGroups, type Group } from '../../lib/queries/groups';
import { useEvents, type EventListItem } from '../../lib/queries/events';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PrimaryButton } from '../../components/PrimaryButton';

export default function Home() {
  const user = useSession((s) => s.user);
  const groups = useGroups();
  const events = useEvents();
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);
  const goCreateGroup = () => { close(); router.push('/groups/new'); };
  const goRoulette = () => { close(); router.push('/planazo/ruleta'); };
  const goCreateEvent = () => {
    close();
    if (groups.data && groups.data.length > 0) {
      router.push({ pathname: '/events/new', params: { groupId: groups.data[0].id } });
    } else {
      router.push('/groups/new');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Text style={styles.greet}>{SLANG.helloUser(user?.name ?? user?.email ?? 'causa')}</Text>

        <Text style={styles.section}>{SLANG.sectionGroups}</Text>
        {groups.isLoading ? <ActivityIndicator color={colors.primary} /> :
          groups.data && groups.data.length > 0 ? (
            groups.data.map((g) => <GroupRow key={g.id} group={g} />)
          ) : (
            <Text style={styles.empty}>{SLANG.emptyGroups}</Text>
          )
        }

        <Text style={styles.section}>{SLANG.sectionEvents}</Text>
        {events.isLoading ? <ActivityIndicator color={colors.primary} /> :
          events.data && events.data.length > 0 ? (
            events.data.map((e) => <EventRow key={e.id} event={e} />)
          ) : (
            <Text style={styles.empty}>{SLANG.emptyEvents}</Text>
          )
        }
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setMenuOpen(true)}>
        <Plus color={colors.surface} size={24} />
        <Text style={styles.fabText}>{SLANG.ctaCreatePlan}</Text>
      </Pressable>

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <View style={styles.menu}>
            <PrimaryButton label="Crear collera" onPress={goCreateGroup} />
            <PrimaryButton variant="secondary" label={SLANG.ctaSpinRoulette} onPress={goRoulette} />
            <PrimaryButton variant="ghost" label="Crear evento directo" onPress={goCreateEvent} />
            <PrimaryButton variant="ghost" label={SLANG.ctaSoftCancel} onPress={close} />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function GroupRow({ group }: { group: Group }) {
  return (
    <Pressable style={styles.row} onPress={() => router.push({ pathname: '/groups/[id]', params: { id: group.id } })}>
      <Text style={styles.rowTitle}>{group.name}</Text>
      <Text style={styles.rowMeta}>código: {group.invite_code}</Text>
    </Pressable>
  );
}

function EventRow({ event }: { event: EventListItem }) {
  return (
    <Pressable style={styles.row} onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}>
      <View style={styles.eventHead}>
        <Calendar size={16} color={colors.secondary} />
        <Text style={styles.rowTitle}>{event.name}</Text>
      </View>
      <Text style={styles.rowMeta}>{event.date ?? 'sin fecha'} — S/ {event.amount_per_person} c/u — {event.status}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  greet: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  section: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  empty: { ...typography.body, color: colors.textSecondary, fontStyle: 'italic' },
  row: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  eventHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  rowMeta: { ...typography.caption, color: colors.textSecondary },
  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.xl,
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  fabText: { color: colors.surface, ...typography.button },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end', padding: spacing.lg },
  menu: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md, marginBottom: spacing.xl },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/\(tabs\)/home.tsx
git commit -m "feat(mobile): add home screen with groups + events lists + FAB menu"
```

---

## Task 22: Profile screen

**Files:**
- Create: `mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: Write `(tabs)/profile.tsx`**

```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { supabase } from '../../lib/supabase';
import { apiRequest } from '../../lib/api';
import { useSession, type SessionUser } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function Profile() {
  const user = useSession((s) => s.user);
  const setSession = useSession((s) => s.setSession);
  const clearSession = useSession((s) => s.clearSession);
  const token = useSession((s) => s.token);

  const [method, setMethod] = useState<'yape' | 'plin'>(user?.payment_method ?? 'yape');
  const [num, setNum] = useState(user?.payment_number ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!user || !token) return null;

  const onSave = async () => {
    setSaving(true); setErr(null);
    try {
      // Backend has no /auth update endpoint per Fase 2 router; persist locally only as MVP.
      // (Fase 4 may add PATCH /auth/me.)
      setSession({ ...user, payment_method: method, payment_number: num }, token);
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
    clearSession();
    router.replace('/(auth)/onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(user.name ?? user.email)?.charAt(0).toUpperCase()}</Text></View>
        <Text style={styles.name}>{user.name ?? '(sin nombre)'}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <Text style={styles.label}>Método de pago</Text>
      <View style={styles.chipsRow}>
        {(['yape', 'plin'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMethod(m)} style={[styles.chip, method === m && styles.chipActive]}>
            <Text style={[styles.chipText, method === m && styles.chipTextActive]}>{m.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Número (9 dígitos)</Text>
      <TextInput value={num} onChangeText={setNum} keyboardType="number-pad" maxLength={9} style={styles.input} placeholderTextColor={colors.textSecondary} />

      {err && <Text style={styles.err}>{err}</Text>}

      <PrimaryButton variant="secondary" label={SLANG.ctaSave} onPress={onSave} loading={saving} />

      <View style={{ flex: 1 }} />

      <PrimaryButton variant="ghost" label={SLANG.ctaLogout} onPress={onLogout} icon={<LogOut color={colors.primary} size={18} />} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md },
  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  name: { ...typography.h2, color: colors.textPrimary },
  email: { ...typography.caption, color: colors.textSecondary },
  label: { ...typography.caption, color: colors.textSecondary },
  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textPrimary, fontWeight: '600' },
  chipTextActive: { color: colors.surface },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body },
  err: { color: colors.error, ...typography.caption },
});
```

> **Note:** Backend has no `PATCH /auth/me` endpoint in Fase 2. Profile save persists locally only (Zustand store). A backend PATCH endpoint is out of Fase 3 scope per stop conditions. If user requests it later, add a separate task.

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/\(tabs\)/profile.tsx
git commit -m "feat(mobile): add profile screen with logout"
```

---

## Task 23: groups/new screen

**Files:**
- Create: `mobile/app/groups/new.tsx`

- [ ] **Step 1: Write `groups/new.tsx`**

```tsx
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useCreateGroup, type Group } from '../../lib/queries/groups';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type FormValues = { name: string };

export default function NewGroup() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({ defaultValues: { name: '' } });
  const createGroup = useCreateGroup();
  const [created, setCreated] = useState<Group | null>(null);

  const onSubmit = handleSubmit(async ({ name }) => {
    const g = await createGroup.mutateAsync(name);
    setCreated(g);
  });

  const shareWhatsapp = async (group: Group) => {
    const link = `caepe://groups/join/${group.invite_code}`;
    const msg = `¡Habla! Únete a mi collera "${group.name}" en CaePe: ${link}`;
    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    try { await Linking.openURL(url); } catch { /* ignore */ }
  };

  if (created) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>¡Collera armada!</Text>
        <View style={styles.codeCard}>
          <Text style={styles.label}>Código de invitación</Text>
          <Text style={styles.code}>{created.invite_code}</Text>
        </View>
        <PrimaryButton label={SLANG.ctaShare} onPress={() => shareWhatsapp(created)} />
        <PrimaryButton variant="ghost" label="Ir a la collera" onPress={() => router.replace({ pathname: '/groups/[id]', params: { id: created.id } })} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Nueva collera</Text>
      <Controller control={control} name="name" rules={{ required: 'Nombre requerido' }}
        render={({ field: { value, onChange } }) => (
          <TextInput placeholder="nombre de la collera" value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
        )}
      />
      {errors.name && <Text style={styles.err}>{errors.name.message}</Text>}
      {createGroup.isError && <Text style={styles.err}>{SLANG.errorGeneric}</Text>}

      <PrimaryButton label={SLANG.ctaCreateGroup} onPress={onSubmit} loading={createGroup.isPending} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body },
  err: { color: colors.error, ...typography.caption },
  codeCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.xs, alignItems: 'center' },
  label: { ...typography.caption, color: colors.textSecondary },
  code: { ...typography.h1, color: colors.primary, letterSpacing: 4 },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/groups/new.tsx
git commit -m "feat(mobile): add groups/new screen with share flow"
```

---

## Task 24: groups/[id] screen

**Files:**
- Create: `mobile/app/groups/[id].tsx`

- [ ] **Step 1: Write `groups/[id].tsx`**

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Copy } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useGroup } from '../../lib/queries/groups';
import { useEventsByGroup } from '../../lib/queries/events';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(id);
  const events = useEventsByGroup(id);

  const shareWhatsapp = async () => {
    if (!group.data) return;
    const link = `caepe://groups/join/${group.data.invite_code}`;
    const msg = `¡Habla! Únete a "${group.data.name}" en CaePe: ${link}`;
    try { await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`); } catch { /* ignore */ }
  };

  const copyCode = async () => {
    if (group.data) await Clipboard.setStringAsync(group.data.invite_code);
  };

  if (group.isLoading) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  if (!group.data) return <SafeAreaView style={styles.center}><Text>{SLANG.errorGeneric}</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={styles.title}>{group.data.name}</Text>

        <View style={styles.codeRow}>
          <View>
            <Text style={styles.label}>código</Text>
            <Text style={styles.code}>{group.data.invite_code}</Text>
          </View>
          <Pressable onPress={copyCode} style={styles.copyBtn}>
            <Copy size={18} color={colors.primary} />
          </Pressable>
        </View>

        <PrimaryButton label={SLANG.ctaShare} onPress={shareWhatsapp} />

        <Text style={styles.section}>{SLANG.sectionEvents}</Text>
        {events.isLoading ? <ActivityIndicator color={colors.primary} /> :
          events.data && events.data.length > 0 ?
            events.data.map((e) => (
              <Pressable key={e.id} style={styles.eventRow} onPress={() => router.push({ pathname: '/events/[id]', params: { id: e.id } })}>
                <Text style={styles.eventName}>{e.name}</Text>
                <Text style={styles.eventMeta}>{e.date ?? 'sin fecha'} — {e.status}</Text>
              </Pressable>
            )) :
            <Text style={styles.empty}>{SLANG.emptyEvents}</Text>
        }

        <PrimaryButton variant="secondary" label={SLANG.ctaCreateEvent} onPress={() => router.push({ pathname: '/events/new', params: { groupId: id } })} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  label: { ...typography.caption, color: colors.textSecondary },
  code: { ...typography.h2, color: colors.primary, letterSpacing: 2 },
  copyBtn: { padding: spacing.sm },
  section: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md },
  empty: { ...typography.body, color: colors.textSecondary, fontStyle: 'italic' },
  eventRow: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  eventName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  eventMeta: { ...typography.caption, color: colors.textSecondary },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/groups/\[id\].tsx
git commit -m "feat(mobile): add groups/[id] screen with members and events"
```

---

## Task 25: planazo/ruleta screen

**Files:**
- Create: `mobile/app/planazo/ruleta.tsx`

- [ ] **Step 1: Write `planazo/ruleta.tsx`**

```tsx
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dice5 } from 'lucide-react-native';
import { PlanCard } from '../../components/PlanCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchRandomPlan, type Plan, type PlanCategory } from '../../lib/queries/plans';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const CATEGORIES: PlanCategory[] = ['comida', 'deporte', 'fiesta', 'cultura', 'aire_libre', 'otros'];

export default function Ruleta() {
  const [selected, setSelected] = useState<PlanCategory | null>(null);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [people, setPeople] = useState('');
  const [result, setResult] = useState<Plan | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const rotate = useRef(new Animated.Value(0)).current;

  const spin = async () => {
    setErr(null); setResult(null); setSpinning(true);
    rotate.setValue(0);
    Animated.timing(rotate, {
      toValue: 3,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    try {
      const plan = await fetchRandomPlan({
        category: selected ?? undefined,
        price_min: priceMin ? Number(priceMin) : undefined,
        price_max: priceMax ? Number(priceMax) : undefined,
      });
      // Wait for animation to complete before showing result
      setTimeout(() => { setResult(plan); setSpinning(false); }, 1500);
    } catch (e) {
      setErr((e as Error).message);
      setSpinning(false);
    }
  };

  const useThis = () => {
    if (!result) return;
    router.push({ pathname: '/events/new', params: { planId: result.id, people } });
  };

  const rotateInterpolate = rotate.interpolate({ inputRange: [0, 3], outputRange: ['0deg', '1080deg'] });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}>
        <Text style={styles.title}>Planazo</Text>

        <Text style={styles.label}>Categoría</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => setSelected((s) => (s === c ? null : c))}
              style={[styles.chip, selected === c && styles.chipActive]}>
              <Text style={[styles.chipText, selected === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Rango precio (S/)</Text>
        <View style={styles.priceRow}>
          <TextInput placeholder="min" keyboardType="number-pad" value={priceMin} onChangeText={setPriceMin} style={[styles.input, { flex: 1 }]} placeholderTextColor={colors.textSecondary} />
          <TextInput placeholder="max" keyboardType="number-pad" value={priceMax} onChangeText={setPriceMax} style={[styles.input, { flex: 1 }]} placeholderTextColor={colors.textSecondary} />
        </View>

        <Text style={styles.label}># personas (para calcular monto luego)</Text>
        <TextInput placeholder="ej. 4" keyboardType="number-pad" value={people} onChangeText={setPeople} style={styles.input} placeholderTextColor={colors.textSecondary} />

        <Animated.View style={[styles.dice, { transform: [{ rotate: rotateInterpolate }] }]}>
          <Dice5 size={64} color={colors.primary} />
        </Animated.View>

        <PrimaryButton label={SLANG.ctaSpinRoulette} onPress={spin} loading={spinning} />

        {err && <Text style={styles.err}>{err}</Text>}

        {result && (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.resultTitle}>{SLANG.rouletteResult}</Text>
            <PlanCard plan={result} selected />
            <PrimaryButton variant="secondary" label={SLANG.ctaUseThisPlan} onPress={useThis} />
            <PrimaryButton variant="ghost" label={SLANG.ctaSpinAgain} onPress={spin} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary },
  label: { ...typography.caption, color: colors.textSecondary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.surface },
  priceRow: { flexDirection: 'row', gap: spacing.sm },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body },
  dice: { alignItems: 'center', padding: spacing.lg },
  resultTitle: { ...typography.h2, color: colors.primary },
  err: { color: colors.error, ...typography.caption },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/planazo/ruleta.tsx
git commit -m "feat(mobile): add planazo/ruleta screen with 1.5s ease-out animation"
```

---

## Task 26: events/new screen with live calc

**Files:**
- Create: `mobile/app/events/new.tsx`

- [ ] **Step 1: Write `events/new.tsx`**

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch, Control } from 'react-hook-form';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PrimaryButton } from '../../components/PrimaryButton';
import { PlanCard } from '../../components/PlanCard';
import { useGroups } from '../../lib/queries/groups';
import { useCreateEvent, type CreateEventBody } from '../../lib/queries/events';
import { usePlans } from '../../lib/queries/plans';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Participant = { name: string; phone?: string };

type FormValues = {
  group_id: string;
  plan_id?: string;
  name: string;
  date: Date | null;
  time: Date | null;
  location: string;
  total_budget: string;
  participants: Participant[];
};

function calcAmount(total: string, n: number): string {
  const t = Number(total);
  if (!t || !n) return '0.00';
  return (Math.round((t / n) * 100) / 100).toFixed(2);
}

function LiveAmount({ control }: { control: Control<FormValues> }) {
  const total = useWatch({ control, name: 'total_budget' });
  const participants = useWatch({ control, name: 'participants' });
  const n = participants.length || 1;
  return (
    <View style={styles.amountCard}>
      <Text style={styles.amountLabel}>Monto por persona</Text>
      <Text style={styles.amount}>S/ {calcAmount(total ?? '0', n)}</Text>
      <Text style={styles.amountMeta}>{n} {n === 1 ? 'persona' : 'personas'}</Text>
    </View>
  );
}

export default function NewEvent() {
  const params = useLocalSearchParams<{ groupId?: string; planId?: string; people?: string }>();
  const groups = useGroups();
  const plans = usePlans();
  const createEvent = useCreateEvent();

  const selectedPlan = useMemo(
    () => plans.data?.find((p) => p.id === params.planId),
    [plans.data, params.planId],
  );

  const initialGroupId = params.groupId ?? groups.data?.[0]?.id ?? '';
  const initialParticipants: Participant[] = params.people
    ? Array.from({ length: Math.max(1, Number(params.people)) }, () => ({ name: '' }))
    : [{ name: '' }];

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      group_id: initialGroupId,
      plan_id: params.planId,
      name: selectedPlan?.name ?? '',
      date: null,
      time: null,
      location: selectedPlan?.location ?? '',
      total_budget: '',
      participants: initialParticipants,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'participants' });

  useEffect(() => {
    if (selectedPlan) {
      setValue('name', selectedPlan.name);
      setValue('location', selectedPlan.location ?? '');
    }
  }, [selectedPlan, setValue]);

  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitErr(null);
    try {
      const body: CreateEventBody = {
        group_id: values.group_id,
        plan_id: values.plan_id || undefined,
        name: values.name,
        date: values.date ? values.date.toISOString().slice(0, 10) : null,
        time: values.time ? values.time.toTimeString().slice(0, 8) : null,
        location: values.location || null,
        total_budget: values.total_budget,
        participants: values.participants.filter((p) => p.name.trim()),
      };
      const created = await createEvent.mutateAsync(body);
      router.replace({ pathname: '/events/[id]/summary', params: { id: created.id } });
    } catch (e) {
      setSubmitErr((e as Error).message);
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}>
        <Text style={styles.title}>{SLANG.ctaCreateEvent}</Text>

        {selectedPlan && <PlanCard plan={selectedPlan} />}

        <Text style={styles.label}>Nombre del evento</Text>
        <Controller control={control} name="name" rules={{ required: 'Nombre requerido' }}
          render={({ field: { value, onChange } }) => (
            <TextInput value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
          )}
        />
        {errors.name && <Text style={styles.err}>{errors.name.message}</Text>}

        <Text style={styles.label}>Fecha</Text>
        <Controller control={control} name="date" render={({ field: { value, onChange } }) => (
          <>
            <Pressable style={styles.input} onPress={() => setShowDate(true)}>
              <Text style={{ color: value ? colors.textPrimary : colors.textSecondary }}>
                {value ? value.toLocaleDateString('es-PE') : 'Seleccionar fecha'}
              </Text>
            </Pressable>
            {showDate && (
              <DateTimePicker
                value={value ?? new Date()}
                mode="date"
                onChange={(_, d) => { setShowDate(Platform.OS === 'ios'); if (d) onChange(d); }}
              />
            )}
          </>
        )} />

        <Text style={styles.label}>Hora</Text>
        <Controller control={control} name="time" render={({ field: { value, onChange } }) => (
          <>
            <Pressable style={styles.input} onPress={() => setShowTime(true)}>
              <Text style={{ color: value ? colors.textPrimary : colors.textSecondary }}>
                {value ? value.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'Seleccionar hora'}
              </Text>
            </Pressable>
            {showTime && (
              <DateTimePicker
                value={value ?? new Date()}
                mode="time"
                onChange={(_, d) => { setShowTime(Platform.OS === 'ios'); if (d) onChange(d); }}
              />
            )}
          </>
        )} />

        <Text style={styles.label}>Lugar</Text>
        <Controller control={control} name="location" render={({ field: { value, onChange } }) => (
          <TextInput value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.textSecondary} />
        )} />

        <Text style={styles.label}>Presupuesto total (S/)</Text>
        <Controller control={control} name="total_budget" rules={{ required: 'Presupuesto requerido' }}
          render={({ field: { value, onChange } }) => (
            <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={styles.input} placeholderTextColor={colors.textSecondary} />
          )}
        />
        {errors.total_budget && <Text style={styles.err}>{errors.total_budget.message}</Text>}

        <LiveAmount control={control} />

        <Text style={styles.label}>Participantes</Text>
        {fields.map((f, i) => (
          <View key={f.id} style={styles.partRow}>
            <Controller control={control} name={`participants.${i}.name`}
              rules={{ required: 'Nombre' }}
              render={({ field: { value, onChange } }) => (
                <TextInput placeholder={`Participante ${i + 1}`} value={value} onChangeText={onChange} style={[styles.input, { flex: 1 }]} placeholderTextColor={colors.textSecondary} />
              )}
            />
            {fields.length > 1 && (
              <Pressable onPress={() => remove(i)} style={styles.removeBtn}><Text style={styles.removeText}>×</Text></Pressable>
            )}
          </View>
        ))}
        <Pressable onPress={() => append({ name: '' })} style={styles.addBtn}>
          <Text style={styles.addText}>{SLANG.ctaAddParticipant}</Text>
        </Pressable>

        {submitErr && <Text style={styles.err}>{submitErr}</Text>}
        {!initialGroupId && <Text style={styles.err}>Crea una collera primero.</Text>}

        <PrimaryButton label={SLANG.ctaConfirmEvent} onPress={onSubmit} loading={createEvent.isPending} disabled={!initialGroupId} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.body },
  amountCard: { backgroundColor: colors.accent, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center', gap: spacing.xs },
  amountLabel: { ...typography.caption, color: colors.textPrimary },
  amount: { ...typography.display, color: colors.textPrimary },
  amountMeta: { ...typography.caption, color: colors.textSecondary },
  err: { color: colors.error, ...typography.caption },
  partRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  removeBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.surface, fontSize: 22, lineHeight: 22 },
  addBtn: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center' },
  addText: { color: colors.primary, ...typography.button },
});
```

> **Note:** The form converts `Date` to `'YYYY-MM-DD'` and `'HH:MM:SS'` strings to match backend `EventCreate` schema. Empty strings become `null`. Participant rows with empty `name` are filtered out before submit.

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/events/new.tsx
git commit -m "feat(mobile): add events/new screen with live amount calc and date/time pickers"
```

---

## Task 27: events/[id] layout

**Files:**
- Create: `mobile/app/events/[id]/_layout.tsx`

- [ ] **Step 1: Write `events/[id]/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function EventLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/CaePe
git add mobile/app/events/\[id\]/_layout.tsx
git commit -m "feat(mobile): add events/[id] stack layout"
```

---

## Task 28: events/[id]/summary screen

**Files:**
- Create: `mobile/app/events/[id]/summary.tsx`

- [ ] **Step 1: Write `events/[id]/summary.tsx`**

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, MapPin } from 'lucide-react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ParticipantRow } from '../../../components/ParticipantRow';
import { useEvent } from '../../../lib/queries/events';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function Summary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEvent(id);

  if (event.isLoading || !event.data) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  const e = event.data;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={styles.title}>{e.name}</Text>
        <View style={styles.metaRow}><Calendar size={16} color={colors.textSecondary} /><Text style={styles.meta}>{e.date ?? 'sin fecha'} {e.time ?? ''}</Text></View>
        {e.location && <View style={styles.metaRow}><MapPin size={16} color={colors.textSecondary} /><Text style={styles.meta}>{e.location}</Text></View>}

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Monto por persona</Text>
          <Text style={styles.amount}>S/ {e.amount_per_person}</Text>
        </View>

        <Text style={styles.section}>Participantes</Text>
        {e.participants.map((p) => (
          <ParticipantRow key={p.id} name={p.name} amountDue={p.amount_due} status={p.payment_status} />
        ))}

        <PrimaryButton label={SLANG.ctaShare} onPress={() => router.push({ pathname: '/events/[id]/share', params: { id } })} />
        <PrimaryButton variant="ghost" label="Ver evento" onPress={() => router.replace({ pathname: '/events/[id]', params: { id } })} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { ...typography.body, color: colors.textSecondary },
  amountCard: { backgroundColor: colors.accent, padding: spacing.lg, borderRadius: 16, alignItems: 'center' },
  amountLabel: { ...typography.caption, color: colors.textPrimary },
  amount: { ...typography.display, color: colors.textPrimary },
  section: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/events/\[id\]/summary.tsx
git commit -m "feat(mobile): add events/[id]/summary screen"
```

---

## Task 29: events/[id]/share screen

**Files:**
- Create: `mobile/app/events/[id]/share.tsx`

- [ ] **Step 1: Write `events/[id]/share.tsx`**

```tsx
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Linking, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useShareMessage } from '../../../lib/queries/events';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const share = useShareMessage(id);

  const openWhatsapp = async () => {
    if (!share.data) return;
    const url = `whatsapp://send?text=${encodeURIComponent(share.data.message)}`;
    try { await Linking.openURL(url); }
    catch { await Share.share({ message: share.data.message }); }
  };

  const copy = async () => {
    if (share.data) await Clipboard.setStringAsync(share.data.message);
  };

  if (share.isLoading || !share.data) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: spacing.lg, gap: spacing.lg, flex: 1 }}>
        <Text style={styles.title}>{SLANG.ctaShare}</Text>
        <View style={styles.preview}><Text style={styles.previewText}>{share.data.message}</Text></View>
        <PrimaryButton label={SLANG.ctaShareWhatsapp} onPress={openWhatsapp} />
        <PrimaryButton variant="ghost" label={SLANG.ctaCopyMessage} onPress={copy} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary },
  preview: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  previewText: { ...typography.body, color: colors.textPrimary },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/events/\[id\]/share.tsx
git commit -m "feat(mobile): add events/[id]/share screen with WhatsApp + fallback"
```

---

## Task 30: events/[id]/index (modo invitado)

**Files:**
- Create: `mobile/app/events/[id]/index.tsx`

- [ ] **Step 1: Write `events/[id]/index.tsx`**

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Copy, MapPin } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { ParticipantRow } from '../../../components/ParticipantRow';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useEvent } from '../../../lib/queries/events';
import { useSession } from '../../../lib/store';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEvent(id);
  const user = useSession((s) => s.user);

  useEffect(() => {
    if (event.data?.status === 'funded') {
      router.replace({ pathname: '/events/[id]/funded', params: { id } });
    }
  }, [event.data?.status, id]);

  if (event.isLoading || !event.data) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  const e = event.data;
  const isOrganizer = user?.id === e.organizer_id;
  const isGuest = !user;
  // Organizer's payment info: would normally fetch from /users/{organizer_id} (out of Fase 2 scope).
  // Display placeholder. Fase 4 may add a public organizer-payment endpoint.
  const payMethod = isOrganizer ? user?.payment_method : null;
  const payNumber = isOrganizer ? user?.payment_number : null;

  const copyNumber = async () => { if (payNumber) await Clipboard.setStringAsync(payNumber); };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={styles.title}>{e.name}</Text>
        <Text style={styles.statusBadge}>{e.status}</Text>

        <View style={styles.metaRow}><Calendar size={16} color={colors.textSecondary} /><Text style={styles.meta}>{e.date ?? 'sin fecha'} {e.time ?? ''}</Text></View>
        {e.location && <View style={styles.metaRow}><MapPin size={16} color={colors.textSecondary} /><Text style={styles.meta}>{e.location}</Text></View>}

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Monto por persona</Text>
          <Text style={styles.amount}>S/ {e.amount_per_person}</Text>
        </View>

        {payMethod && payNumber ? (
          <View style={styles.payCard}>
            <Text style={styles.label}>Método de pago del organizador</Text>
            <Text style={styles.payMethod}>{payMethod.toUpperCase()}</Text>
            <View style={styles.payRow}>
              <Text style={styles.payNumber}>{payNumber}</Text>
              <Pressable onPress={copyNumber} style={styles.copyBtn}><Copy size={18} color={colors.primary} /></Pressable>
            </View>
            <Text style={styles.tooltip}>{SLANG.paymentExternal}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>Participantes</Text>
        {e.participants.map((p) => (
          <ParticipantRow key={p.id} name={p.name} amountDue={p.amount_due} status={p.payment_status} />
        ))}

        {isGuest && (
          <PrimaryButton label={SLANG.ctaJoinCaepe} onPress={() => router.push('/(auth)/register')} />
        )}
        {isOrganizer && e.status !== 'funded' && (
          <>
            <PrimaryButton label={SLANG.ctaMarkPayments} onPress={() => router.push({ pathname: '/events/[id]/payments', params: { id } })} />
            <PrimaryButton variant="ghost" label="Editar" onPress={() => router.push({ pathname: '/events/new', params: { eventId: id } })} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary },
  statusBadge: { ...typography.caption, color: colors.secondary, fontWeight: '700', textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { ...typography.body, color: colors.textSecondary },
  amountCard: { backgroundColor: colors.accent, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center' },
  amountLabel: { ...typography.caption, color: colors.textPrimary },
  amount: { ...typography.display, color: colors.textPrimary },
  payCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  label: { ...typography.caption, color: colors.textSecondary },
  payMethod: { ...typography.h2, color: colors.primary },
  payRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payNumber: { ...typography.h2, color: colors.textPrimary, letterSpacing: 2 },
  copyBtn: { padding: spacing.sm },
  tooltip: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },
  section: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md },
});
```

> **Note on payment info display:** Backend Fase 2 has no public endpoint to fetch the organizer's `payment_method` and `payment_number` from another user's perspective. As MVP, we only show the payment block when viewer is the organizer. For non-organizer viewers (including guests), the block is hidden — they will see the WhatsApp share message which contains the payment info (built by `build_whatsapp_message` in the backend). A future task can add `GET /events/{id}/payment-info` for this. This is consistent with spec stop conditions (no out-of-scope endpoints in Fase 3).

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/events/\[id\]/index.tsx
git commit -m "feat(mobile): add events/[id] detail (modo invitado + organizer view)"
```

---

## Task 31: events/[id]/payments screen

**Files:**
- Create: `mobile/app/events/[id]/payments.tsx`

- [ ] **Step 1: Write `events/[id]/payments.tsx`**

```tsx
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ParticipantRow } from '../../../components/ParticipantRow';
import { useEvent } from '../../../lib/queries/events';
import { useMarkPayment } from '../../../lib/queries/payments';
import { useSession } from '../../../lib/store';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function Payments() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEvent(id);
  const mark = useMarkPayment(id ?? '');
  const user = useSession((s) => s.user);

  if (event.isLoading || !event.data) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  const e = event.data;
  const isOrganizer = user?.id === e.organizer_id;

  if (!isOrganizer) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.err}>Solo el organizador puede marcar pagos.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={styles.title}>{SLANG.ctaMarkPayments}</Text>
        <Text style={styles.meta}>{e.name}</Text>

        {e.participants.map((p) => (
          <ParticipantRow
            key={p.id}
            name={p.name}
            amountDue={p.amount_due}
            status={p.payment_status}
            isOrganizer={p.user_id === e.organizer_id}
            showMarkButton
            onMarkPaid={() => mark.mutate({ participantId: p.id, status: 'paid' })}
            marking={mark.isPending && mark.variables?.participantId === p.id}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h1, color: colors.textPrimary },
  meta: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  err: { color: colors.error, ...typography.body },
});
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/events/\[id\]/payments.tsx
git commit -m "feat(mobile): add events/[id]/payments screen with mark-paid mutation"
```

---

## Task 32: events/[id]/funded screen

**Files:**
- Create: `mobile/app/events/[id]/funded.tsx`

- [ ] **Step 1: Write `events/[id]/funded.tsx`**

```tsx
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function Funded() {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.success }]}>
      <View style={styles.body}>
        <View style={styles.iconWrap}><Check size={80} color={colors.surface} strokeWidth={3} /></View>
        <Text style={styles.title}>{SLANG.fundedTitle}</Text>
        <Text style={styles.subtitle}>{SLANG.fundedSubtitle}</Text>
      </View>
      <PrimaryButton variant="ghost" label={SLANG.ctaBackHome} onPress={() => router.replace('/(tabs)/home')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, justifyContent: 'space-between' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  iconWrap: { width: 140, height: 140, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.display, color: colors.surface, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.surface, textAlign: 'center', opacity: 0.95 },
});
```

> **Note:** `PrimaryButton` ghost variant uses orange border which clashes on green bg. Override by wrapping with a white-bordered ghost? For MVP keep default — visual polish is acceptable here. If clashing is unacceptable to user, add a `'ghost-on-success'` variant later.

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/events/\[id\]/funded.tsx
git commit -m "feat(mobile): add events/[id]/funded celebration screen"
```

---

## Task 33: Root layout with auth guard + QueryClientProvider

**Files:**
- Modify: `mobile/app/_layout.tsx`

- [ ] **Step 1: Replace `app/_layout.tsx`**

```tsx
import { Stack, router, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '../lib/queries/client';
import { useSession } from '../lib/store';

function AuthGuard() {
  const segments = useSegments();
  const token = useSession((s) => s.token);
  const seenOnboarding = useSession((s) => s.seenOnboarding);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const isPublicEvent = segments[0] === 'events' && segments[2] === undefined;
    // 'events/[id]/index' route: segments = ['events', '<id>'] (Expo router collapses /index)

    if (!token) {
      if (!seenOnboarding && !inAuthGroup) {
        router.replace('/(auth)/onboarding');
      } else if (seenOnboarding && !inAuthGroup && !isPublicEvent) {
        router.replace('/(auth)/login');
      }
    } else if (inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [token, segments, seenOnboarding]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
cd C:/CaePe
git add mobile/app/_layout.tsx
git commit -m "feat(mobile): add root layout with QueryClientProvider and auth guard"
```

---

## Task 34: README updates + final E2E verification checklist

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Fase 3 section to README.md**

Append (or insert after existing mobile section) the following block:

```markdown
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
```

- [ ] **Step 2: Run full typecheck**

```bash
cd C:/CaePe/mobile && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Smoke run (manual)**

```bash
cd C:/CaePe/backend && uvicorn app.main:app --reload &
cd C:/CaePe/mobile && npx expo start --android
```

Run the verification checklist from README. Mark each item.

- [ ] **Step 4: Final commit**

```bash
cd C:/CaePe
git add README.md
git commit -m "docs: add Fase 3 mobile setup + E2E verification checklist"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ 14 screens (Tasks 17, 18, 19, 21, 22, 23, 24, 25, 26, 28, 29, 30, 31, 32)
- ✅ Theme tokens (Task 1)
- ✅ Components: PrimaryButton, PlanCard, ParticipantRow, PaymentStatusBadge (Tasks 7-10)
- ✅ Lib: api, supabase, store, queries, slang (Tasks 2-6, 11-15)
- ✅ Auth guard + guest mode (Task 33)
- ✅ Live amount calc (Task 26)
- ✅ Ruleta animation 1.5s ease-out (Task 25)
- ✅ WhatsApp share with fallback (Task 29)
- ✅ Mark pago → funded auto-redirect (Tasks 30, 31)
- ✅ Pago externo tooltip (Task 30)
- ✅ Copy es-PE centralizado (Task 2)
- ✅ Stop conditions: no upload proof, no push, no extra screens

**Known gaps and trade-offs (documented inline in tasks):**
- Profile save persists locally only — backend has no PATCH /auth/me (Task 22 note). Out of Fase 3 scope.
- Organizer payment info shown only when viewer is organizer — backend has no public endpoint (Task 30 note). Guest sees info via WhatsApp shared message.
- `useShareMessage` uses POST inside `useQuery` (Task 13) — relies on backend idempotency.
- Funded screen ghost button uses orange border on green bg — visual nit, acceptable for MVP (Task 32 note).

**Type consistency check:** all `Plan`, `Group`, `EventDetail`, `EventParticipant`, `EventListItem` types are defined once and imported across queries/screens. `SessionUser` from store, `CreateEventBody` from events queries.

**No placeholder violations:** every step has actual code, exact commands, expected outputs.
