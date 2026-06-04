# CaePe — Despliegue a producción (paso a paso)

Guía para poner CaePe en línea y repartir un **APK de Android** a tus testers, con notificaciones push funcionando. **Sin Docker.**

## Qué vamos a montar

```
 Testers (APK Android)
        │  HTTPS
        ▼
  Backend FastAPI  ──────►  Supabase Postgres   (datos + Auth)
  (Render, gratis)
        │
        ▼  POST exp.host
   Expo Push  ──►  FCM (Firebase)  ──►  notificación en el celular
```

- **Backend** → Render (runtime Python nativo, HTTPS automático, plan gratis).
- **Base de datos + Auth** → tu proyecto Supabase actual.
- **App** → APK generado con **EAS Build** (Expo).
- **Push** → Expo Push, que en Android *standalone* necesita credenciales **FCM** (paso 4).

---

## 0. Prerrequisitos

**Cuentas (todas gratis):**
- [Supabase](https://supabase.com) — ya la tienes.
- [Render](https://render.com) — para el backend.
- [Expo](https://expo.dev) — para EAS Build.
- [Firebase](https://console.firebase.google.com) — solo para el push de Android.
- [GitHub](https://github.com) — Render despliega desde tu repo.

**En tu PC:**
- Node 20+ y Git.
- EAS CLI: `npm install -g eas-cli` (o usa `npx eas-cli ...`).

---

## 1. Base de datos y Auth (Supabase)

Ya tienes el proyecto `frneamlbfggajoafzijo`. Solo confirma la configuración:

1. **Cadena de conexión correcta.** En **Project Settings → Database → Connection string**, copia la del **Session pooler** (puerto **5432**), NO la del *Transaction pooler* (6543).
   - El backend de Render es un proceso *persistente*; con el transaction pooler (6543) + `psycopg3` aparecen errores de *prepared statements*. El **session pooler (5432)** evita eso.
   - Formato: `postgresql+psycopg://postgres.<ref>:<password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres`
   - Si tu contraseña tiene caracteres especiales (`#`, `@`, etc.) deben ir **URL-encoded** (ej. `#` → `%23`).

2. **Auth → para testers.** En **Authentication → Sign In / Providers → Email**, decide:
   - Para que entren al toque sin confirmar correo: **desactiva** "Confirm email".
   - Si lo dejas activado, los testers deben confirmar el email antes de iniciar sesión.

3. **JWT secret.** En **Project Settings → API → JWT Settings**, copia el `JWT Secret` (es el `SUPABASE_JWT_SECRET`).

> Las migraciones de la base de datos se aplican **solas** al desplegar el backend (paso 3). No necesitas correrlas a mano.

---

## 2. Subir el código a GitHub

Render despliega desde un repo. Desde la raíz del proyecto:

```bash
git add .
git commit -m "Preparar despliegue"
git push origin master
```

> ✅ Tu `backend/.env` está en `.gitignore` — los secretos **no** se suben. Render los recibe como variables de entorno (paso 3).

---

## 3. Backend en Render (sin Docker)

1. En Render: **New → Web Service** → conecta tu repo de GitHub.
2. Configura:
   | Campo | Valor |
   |---|---|
   | **Root Directory** | `backend` |
   | **Language / Runtime** | `Python 3` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
   | **Instance Type** | Free |

   El `alembic upgrade head` en el Start Command crea/actualiza las 9 tablas (incluida `device_tokens`) en cada deploy.

3. **Environment Variables** (sección Environment). Pega estas (los valores salen de tu `backend/.env` y de Supabase):

   ```
   DATABASE_URL=postgresql+psycopg://postgres.<ref>:<pass>@aws-1-us-east-1.pooler.supabase.com:5432/postgres
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_JWT_SECRET=<tu-jwt-secret>
   PUSH_ENABLED=true
   PYTHON_VERSION=3.11.9
   ```

   El backend deriva solo el JWKS URL (`/auth/v1/.well-known/jwks.json`) y el issuer (`/auth/v1`) a partir de `SUPABASE_URL`, así que **no** necesitas definir `SUPABASE_JWKS_URL` ni `SUPABASE_JWT_ISSUER`. El audience (`authenticated`) y los algoritmos también tienen defaults; solo agrégalos si necesitas sobreescribirlos.

   ⚠️ Usa el **puerto 5432** (session pooler) en `DATABASE_URL`.

4. **Create Web Service** y espera el deploy. Obtendrás una URL tipo
   `https://caepe-backend.onrender.com`. Anótala — la usarás en el paso 5.

5. **Cargar los 30 planes de Chiclayo** (una sola vez):
   ```bash
   curl -X POST https://caepe-backend.onrender.com/plans/seed
   # {"inserted":30,"total":30}
   ```

6. **Verificar:**
   ```bash
   curl https://caepe-backend.onrender.com/health
   # {"status":"ok"}
   ```

> **Plan gratis de Render:** el servicio se "duerme" tras ~15 min de inactividad; la primera petición luego tarda ~50 s en despertar. Para una demo sin esperas, sube a un plan pago o haz un "ping" periódico.

---

## 4. Firebase Cloud Messaging (push en el APK Android)

Aunque enviamos por Expo Push, un **APK standalone** necesita credenciales FCM para *recibir* (Expo Go usa las de Expo; tu APK usa las tuyas).

1. [Firebase Console](https://console.firebase.google.com) → **Add project** (nombre: CaePe).
2. Dentro del proyecto → **Add app → Android**:
   - **Android package name:** `com.caepe.app` (debe coincidir con `app.json`).
   - Descarga **`google-services.json`** y guárdalo en `mobile/google-services.json`.
3. En `mobile/app.json`, dentro de `"android"`, añade la referencia:
   ```json
   "android": {
     "package": "com.caepe.app",
     "googleServicesFile": "./google-services.json",
     "adaptiveIcon": { ... }
   }
   ```
   > Como `mobile/android/` está en `.gitignore`, asegúrate de que `google-services.json` **sí** se suba al repo (o súbelo como *file secret* en EAS). Ese archivo no es secreto: solo trae la config pública de Firebase.
4. Genera la **service account FCM V1**: Firebase → **⚙️ Project settings → Service accounts → Generate new private key** → descarga el JSON.
5. Súbela a Expo (paso 5.3 ya tendrás el proyecto EAS creado):
   ```bash
   cd mobile
   eas credentials
   # Platform: Android → Profile: preview
   # → Google Service Account → Manage FCM V1 → sube el JSON descargado
   ```

---

## 5. App móvil: generar el APK con EAS

```bash
cd mobile
npm install --legacy-peer-deps      # si no lo has hecho
eas login                           # con tu cuenta Expo
eas init                            # crea el projectId y lo escribe en app.json (extra.eas.projectId)
```

> `eas init` es **obligatorio**: sin `projectId` la app no puede obtener el ExpoPushToken.

1. Abre `mobile/eas.json` y reemplaza los `REEMPLAZA-...` en el perfil **preview** con:
   - `EXPO_PUBLIC_API_URL` → la URL de Render del paso 3 (ej. `https://caepe-backend.onrender.com`).
   - `EXPO_PUBLIC_SUPABASE_URL` → tu URL de Supabase.
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` → tu *anon key* (Supabase → Project Settings → API → `anon public`).

2. Haz el paso **4** (FCM) si aún no lo hiciste.

3. Genera el APK:
   ```bash
   eas build --profile preview --platform android
   ```
   EAS hace el `prebuild` solo (managed workflow), compila en la nube y te da un enlace al `.apk`.

4. **Repartir a testers:** comparte el enlace del build (o el QR que muestra EAS). Lo abren en el celular Android y instalan el APK (deben permitir "instalar apps de orígenes desconocidos").

---

## 6. Probar end-to-end

Con el APK instalado en 2 teléfonos (organizador + invitado):

- [ ] Abrir app → onboarding → **crear cuenta** (si activaste confirmación de email, confírmalo).
- [ ] Aceptar el permiso de **notificaciones**.
- [ ] Crear grupo → compartir `invite_code` → el otro se une → al organizador le llega push *"Nuevo en el grupo 👋"*.
- [ ] Crear evento → a los participantes les llega *"Te invitaron a un planazo 🎉 — sube tu comprobante"*.
- [ ] El invitado sube su comprobante (Yape/Plin) → el organizador ve **"Ver comprobante"** y marca el pago.
- [ ] Al confirmar el pago → al participante le llega *"¡Pago confirmado! ✅"*.
- [ ] Cuando todos pagan → a todos les llega *"¡Evento listo! 🎉"* y la pantalla pasa a *funded*.
- [ ] Botón **"Recordar pago a los pendientes"** del organizador → push de recordatorio.

---

## 7. Limitaciones conocidas (para una demo de testing)

- **Comprobantes (imágenes) son efímeros.** Se guardan en el disco del backend (`uploads/`), que en Render se borra al reiniciar o dormir. Para persistencia real: usar **Supabase Storage** o un **disco persistente** de Render (plan pago). Para una demo corta funciona mientras el servicio esté despierto.
- **Cold start** del plan gratis de Render (~50 s tras inactividad).
- **iOS no está cubierto:** requiere cuenta Apple Developer (US$99/año) y `eas build --platform ios`. Esta guía es para Android.

---

## 8. Troubleshooting

| Problema | Causa / Fix |
|---|---|
| Deploy de Render falla en migración | `DATABASE_URL` mal o con puerto 6543. Usa el **session pooler (5432)** y URL-encodea la contraseña. |
| `401` al iniciar sesión | `SUPABASE_JWT_SECRET` no coincide. Recópialo de Supabase → API → JWT Settings. |
| La app no conecta al backend | `EXPO_PUBLIC_API_URL` en `eas.json` mal o con `http`. Debe ser la URL **HTTPS** de Render. Reconstruye el APK tras cambiarlo. |
| No llegan las notificaciones | Falta el paso 4 (FCM): subir `google-services.json` + service account FCM V1 a EAS. Verifica que aceptaste el permiso de notificaciones. |
| `No projectId found` al pedir el token | Corre `eas init` en `mobile/`. |
| Primera petición tardísima | Cold start de Render free; normal. |
| Cambié env de `eas.json` y no aplica | Las `EXPO_PUBLIC_*` se hornean en el build: hay que **reconstruir** el APK. |
