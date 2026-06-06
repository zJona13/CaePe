# Pantalla de Términos y Condiciones en el registro

**Fecha:** 2026-06-06
**Estado:** Aprobado, pendiente de implementación

## Objetivo

Mostrar una pantalla de Términos y Condiciones (T&C) en el momento de crear la
cuenta. El usuario debe aceptar explícitamente antes de poder registrarse.

## Decisiones de diseño

| Decisión | Elección |
|----------|----------|
| Form factor | Checkbox "Acepto los Términos" en la pantalla de registro + link al texto completo en pantalla aparte |
| Gating | Botón "Crear cuenta" deshabilitado hasta marcar el checkbox |
| Persistencia | Solo cliente. No se guarda la aceptación en la DB. Sin migración ni cambios de backend |
| Contenido | T&C real de CaePe redactado en es-PE (borrador, no constituye asesoría legal) |

## Alcance

- **1 archivo nuevo:** `mobile/app/(auth)/terms.tsx`
- **1 archivo editado:** `mobile/app/(auth)/register.tsx`
- Sin dependencias nuevas (solo react-native primitives + lucide-react-native + expo-router, ya presentes).
- Sin cambios en `backend/`.

## Componente 1 — Nueva ruta `mobile/app/(auth)/terms.tsx`

Pantalla completa de solo lectura.

- `SafeAreaView` con `edges={['top', 'bottom']}`, fondo `colors.background`.
- Header: botón back (`←`, `ArrowLeft` de lucide) + título "Términos y Condiciones".
- `ScrollView` con el contenido en secciones (array de `{ title, body }` renderizado).
- Botón "Entendido" (`PrimaryButton`) al fondo → `router.back()`.
- Vive dentro del grupo `(auth)`, igual que `register`/`login`/`onboarding`, por lo
  que es alcanzable **sin sesión** durante el signup. Verificar en `(auth)/_layout.tsx`
  / AuthGuard que no haya un guard que la bloquee; si lo hay, añadirla a la lista pública.

### Contenido del T&C (es-PE, borrador)

Secciones, en este orden:

1. **Qué es CaePe** — app social para organizar salidas grupales, elegir un plan, dividir el presupuesto y confirmar pagos entre amigos.
2. **CaePe no retiene dinero** — los pagos se realizan directamente entre las personas vía Yape o Plin, **fuera de la app**. CaePe nunca recibe, custodia ni transfiere fondos.
3. **Edad mínima** — el servicio es para mayores de 18 años.
4. **Responsabilidad del usuario** — proporcionar datos veraces (nombre, correo, teléfono, número Yape/Plin) y coordinar y completar los pagos directamente con los demás participantes.
5. **Datos personales** — se usan correo y teléfono para identificar la cuenta y para facilitar los pagos Yape/Plin entre usuarios; no se venden a terceros.
6. **Disputas de pago** — CaePe no es parte de las transacciones y no se responsabiliza por desacuerdos, montos no pagados ni reembolsos entre usuarios.
7. **Cambios y contacto** — los términos pueden actualizarse; el uso continuado implica aceptación. Contacto de soporte.

Nota visible al pie: texto referencial, no constituye asesoría legal; reemplazable por la versión legal definitiva.

## Componente 2 — Editar `mobile/app/(auth)/register.tsx`

- Nuevo state local: `const [accepted, setAccepted] = useState(false)`.
- Nueva fila ubicada **encima** del botón "Crear cuenta" (dentro de `styles.form`):
  - Checkbox: `Pressable` cuadrado que togglea `accepted`. Marcado → muestra `Check` de lucide sobre fondo `colors.primary`; desmarcado → borde `colors.border`.
  - Texto: "Acepto los " + segmento tappable "Términos y Condiciones" (color `colors.primaryDark`, estilo link) que hace `router.push('/(auth)/terms')`.
- Botón "Crear cuenta": `disabled={!accepted}` (o `disabled={!accepted || loading}`).
  - Verificar que `PrimaryButton` acepte y respete una prop `disabled` (estilo atenuado + `onPress` inhibido). Si no existe, añadirla de forma mínima.
- Estilos nuevos reutilizan `colors/spacing/typography/radius` existentes; coherentes con la tarjeta actual.
- No cambia la lógica de `onSubmit` (signUp → provisionAccount → setSession → home).

## Verificación (manual, Expo Go)

- [ ] Checkbox desmarcado → "Crear cuenta" deshabilitado (no navega ni crea cuenta).
- [ ] Marcar checkbox → botón habilitado.
- [ ] Tap en "Términos y Condiciones" → abre `terms.tsx`.
- [ ] Back / "Entendido" → vuelve a registro conservando el estado del form.
- [ ] `terms.tsx` carga sin sesión iniciada (durante signup).
- [ ] Flujo completo de registro sigue funcionando tras marcar y crear cuenta.

## Fuera de alcance

- Persistir la aceptación en la DB (columnas `terms_accepted_at`, `terms_version`).
- Versionado de términos / re-aceptación al cambiar.
- Link a T&C desde la pantalla de perfil.
- Pantalla de Política de Privacidad separada.
