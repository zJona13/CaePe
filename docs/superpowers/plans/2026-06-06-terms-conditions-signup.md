# Pantalla de Términos y Condiciones en signup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir una pantalla de Términos y Condiciones alcanzable desde el registro, con un checkbox obligatorio que habilita el botón "Crear cuenta".

**Architecture:** Una nueva ruta de solo lectura `mobile/app/(auth)/terms.tsx` (reusa `ScreenHeader` + `PrimaryButton`). En `register.tsx` se agrega un checkbox local que togglea un estado `accepted`; el botón "Crear cuenta" se deshabilita con `disabled={!accepted}`. El gate es solo cliente: no se persiste nada en la DB ni se toca el backend.

**Tech Stack:** Expo Router, React Native primitives, lucide-react-native, react-native-safe-area-context. Sin dependencias nuevas.

---

## Nota sobre testing

El proyecto `mobile/` no tiene runner de tests configurado (Fase 3 fue UI; CLAUDE.md prohíbe dependencias extra). Por eso la verificación es **manual en Expo Go**, no automatizada. Cada tarea incluye pasos de verificación concretos. No se añade Jest/RNTL (fuera de alcance).

## File Structure

- **Create:** `mobile/app/(auth)/terms.tsx` — pantalla de solo lectura con el texto de T&C, header con back y botón "Entendido".
- **Modify:** `mobile/app/(auth)/register.tsx` — import de `Check`, estado `accepted`, fila checkbox+link, `disabled` en el botón, estilos nuevos.
- **No tocar:** `_layout.tsx` (AuthGuard ya trata todo `(auth)/*` como público sin sesión), `PrimaryButton.tsx` (ya soporta `disabled`), backend.

---

### Task 1: Crear la pantalla `terms.tsx`

**Files:**
- Create: `mobile/app/(auth)/terms.tsx`

- [ ] **Step 1: Crear el archivo con el componente completo**

```tsx
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Qué es CaePe',
    body: 'CaePe es una app social para organizar salidas grupales: elegir un plan, dividir el presupuesto entre los participantes y confirmar los pagos entre amigos.',
  },
  {
    title: '2. CaePe no retiene dinero',
    body: 'Los pagos se realizan directamente entre las personas mediante Yape o Plin, fuera de la aplicación. CaePe nunca recibe, custodia ni transfiere fondos: solo organiza la información del gasto.',
  },
  {
    title: '3. Edad mínima',
    body: 'El servicio está dirigido a personas mayores de 18 años. Al crear una cuenta declaras tener al menos 18 años.',
  },
  {
    title: '4. Tu responsabilidad',
    body: 'Te comprometes a brindar datos veraces (nombre, correo, teléfono y número de Yape/Plin) y a coordinar y completar los pagos directamente con los demás participantes de cada salida.',
  },
  {
    title: '5. Datos personales',
    body: 'Usamos tu correo y teléfono para identificar tu cuenta y para facilitar los pagos por Yape/Plin entre usuarios. No vendemos tus datos a terceros.',
  },
  {
    title: '6. Disputas de pago',
    body: 'CaePe no es parte de las transacciones entre usuarios y no se responsabiliza por desacuerdos, montos no pagados ni reembolsos. Cualquier disputa se resuelve directamente entre los participantes.',
  },
  {
    title: '7. Cambios y contacto',
    body: 'Podemos actualizar estos términos; el uso continuado de la app implica su aceptación. Para consultas, escríbenos desde el perfil de la app.',
  },
];

export default function Terms() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Términos y Condiciones" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>Al crear tu cuenta en CaePe aceptas los siguientes términos:</Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
        <Text style={styles.disclaimer}>
          Este texto es referencial y no constituye asesoría legal. Será reemplazado por la versión legal definitiva.
        </Text>
        <PrimaryButton size="lg" label="Entendido" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  intro: { ...typography.body, color: colors.textSecondary },
  section: { gap: spacing.xs },
  sectionTitle: { ...typography.bodyBold, color: colors.textPrimary },
  sectionBody: { ...typography.body, color: colors.textSecondary },
  disclaimer: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.sm },
});
```

- [ ] **Step 2: Verificar tipos/compilación**

Run: `cd mobile && npx tsc --noEmit`
Expected: sin errores nuevos en `app/(auth)/terms.tsx`. (Si el proyecto ya tenía errores previos no relacionados, ignóralos; ninguno debe apuntar a `terms.tsx`.)

- [ ] **Step 3: Verificar render manual (Expo Go)**

Run: `cd mobile && npx expo start`
Pasos: en el navegador/dispositivo, navega temporalmente a la ruta `/(auth)/terms` (o continúa a Task 2 y entra por el link). Verifica:
- Header con flecha back y título "Términos y Condiciones".
- Las 7 secciones se ven y hacen scroll.
- Botón "Entendido" abajo → vuelve atrás.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/\(auth\)/terms.tsx
git commit -m "feat(auth): add terms & conditions screen"
```

---

### Task 2: Checkbox + link + gating en `register.tsx`

**Files:**
- Modify: `mobile/app/(auth)/register.tsx`

- [ ] **Step 1: Agregar `Check` al import de lucide**

Reemplaza la línea 6:

```tsx
import { CreditCard, Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react-native';
```

por:

```tsx
import { Check, CreditCard, Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react-native';
```

- [ ] **Step 2: Agregar el estado `accepted`**

Después de la línea `const [showPassword, setShowPassword] = useState(false);` añade:

```tsx
  const [accepted, setAccepted] = useState(false);
```

- [ ] **Step 3: Insertar la fila checkbox + link antes del bloque de error**

Ubica este fragmento (justo después del `Controller` de `payment_method` y antes de `{error ? ... }`):

```tsx
            {error ? <Text style={styles.err}>{error}</Text> : null}

            <PrimaryButton size="lg" label="Crear cuenta" onPress={onSubmit} loading={loading} />
```

Reemplázalo por:

```tsx
            <View style={styles.termsRow}>
              <Pressable
                onPress={() => setAccepted((a) => !a)}
                hitSlop={8}
                style={[styles.checkbox, accepted && styles.checkboxChecked]}
              >
                {accepted ? <Check size={16} color={colors.onPrimary} strokeWidth={3} /> : null}
              </Pressable>
              <Text style={styles.termsText}>
                Acepto los{' '}
                <Text style={styles.termsLink} onPress={() => router.push('/(auth)/terms')}>
                  Términos y Condiciones
                </Text>
              </Text>
            </View>

            {error ? <Text style={styles.err}>{error}</Text> : null}

            <PrimaryButton size="lg" label="Crear cuenta" onPress={onSubmit} loading={loading} disabled={!accepted} />
```

- [ ] **Step 4: Agregar los estilos nuevos**

Dentro de `StyleSheet.create({ ... })`, después de la entrada `err: { ... }`, añade:

```tsx
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  termsLink: { ...typography.bodyBold, color: colors.primaryDark },
```

- [ ] **Step 5: Verificar tipos/compilación**

Run: `cd mobile && npx tsc --noEmit`
Expected: sin errores nuevos en `app/(auth)/register.tsx`.

- [ ] **Step 6: Verificar gating manual (Expo Go)**

Run: `cd mobile && npx expo start`
En la pantalla de registro:
- Checkbox **desmarcado** → "Crear cuenta" se ve atenuado y no navega ni crea cuenta al tocarlo.
- Tap en "Términos y Condiciones" (el link) → abre `terms.tsx` **sin requerir sesión**.
- Back / "Entendido" → vuelve a registro con los campos del form intactos.
- Tap en el checkbox → aparece el check, botón se habilita.
- Con checkbox marcado + datos válidos → "Crear cuenta" completa el flujo (signUp → home) como antes.

- [ ] **Step 7: Commit**

```bash
git add mobile/app/\(auth\)/register.tsx
git commit -m "feat(auth): require accepting terms before creating account"
```

---

## Self-Review

**Spec coverage:**
- Pantalla T&C nueva (`terms.tsx`) con contenido es-PE de 7 secciones + disclaimer → Task 1. ✓
- Checkbox que habilita "Crear cuenta" → Task 2 Steps 2-4. ✓
- Link a la pantalla completa → Task 2 Step 3 (`router.push('/(auth)/terms')`). ✓
- Gate solo cliente, sin DB/backend → ningún task toca backend ni migración. ✓
- Alcanzable sin sesión → confirmado vía AuthGuard (`(auth)/*` es público); verificado en Task 2 Step 6. ✓
- Reuso de tema/componentes → `ScreenHeader`, `PrimaryButton`, `colors/spacing/typography/radius`. ✓

**Placeholder scan:** sin TBD/TODO; todo el código está completo. Verificación manual justificada (no hay test runner). ✓

**Type consistency:** `accepted`/`setAccepted` consistentes; `disabled` prop existe en `PrimaryButton`; `Check`, `router`, `useState` ya importados o agregados; tokens de tema (`colors.onPrimary`, `borderStrong`, `radius.sm`) verificados en componentes existentes. ✓
