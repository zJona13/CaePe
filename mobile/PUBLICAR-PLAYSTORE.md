# Publicar CaePe en Google Play Store

Guía paso a paso para generar el build de producción con **EAS Build** y subir la app a **Google Play Console**.

> App: **CaePe** · Package: `com.caepe.app` · Owner EAS: `whoisjonatan` · projectId: `c06f4112-71ea-4875-838e-4a0534506e9f`

---

## 0. Requisitos previos (una sola vez)

| Requisito | Detalle |
|-----------|---------|
| Cuenta Google Play Developer | Pago único de **$25 USD** en [play.google.com/console](https://play.google.com/console) |
| EAS CLI | `npm install -g eas-cli` |
| Sesión EAS | `eas login` (usuario owner: `whoisjonatan`) |
| Política de privacidad | URL pública obligatoria (la app pide email/teléfono y usa FCM) |
| Assets | Ícono 512×512, gráfico de cabecera 1024×500, mínimo 2 capturas de pantalla |

---

## 1. Preparar la versión

Antes del **primer release público**, subir la versión en `app.json`:

```jsonc
// mobile/app.json
"version": "1.0.0"   // hoy está en 0.1.0
```

> El `versionCode` de Android se incrementa **automáticamente** en cada build de producción
> (`autoIncrement: true` en `eas.json`), no hay que tocarlo a mano.

---

## 2. Crear la app en Google Play Console

1. Entrar a [Play Console](https://play.google.com/console) → **Crear app**.
2. Nombre: `CaePe` · Idioma: Español · Tipo: App · Gratis.
3. Aceptar las declaraciones de políticas.

---

## 3. Generar el AAB de producción

Desde la carpeta `mobile/`:

```bash
cd mobile
eas build --profile production --platform android
```

- Genera un **`.aab`** (Android App Bundle) en los servidores de Expo — no necesitas Android Studio.
- La primera vez, EAS pregunta por el **keystore**: elige que lo genere y administre EAS (recomendado).
- Al terminar entrega un link para descargar el `.aab`.

> El perfil `production` (en `eas.json`) ya apunta a la API y Supabase de prod vía variables `EXPO_PUBLIC_*`.

---

## 4. Subir el build a Play Store

### Opción A — Manual (recomendada la primera vez)
1. Descargar el `.aab` desde el link de EAS.
2. En Play Console → **Pruebas internas** (o **Producción**) → **Crear versión**.
3. Subir el `.aab`, completar notas de la versión y revisar.

> Empieza por **Pruebas internas**: es casi instantáneo y te deja probar el build real
> antes de mandar a Producción (que pasa por revisión y tarda días).

### Opción B — Automática con `eas submit`
Requiere una **Service Account** de Google Cloud con permisos en Play Console.

1. En Google Cloud → crear Service Account → descargar el JSON de credenciales.
2. En Play Console → **Usuarios y permisos** → invitar esa cuenta con permiso de release.
3. Guardar el JSON (p. ej. `mobile/google-play-service-account.json`, **no commitear**).
4. Referenciarlo en `eas.json`:

```jsonc
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-play-service-account.json",
      "track": "internal"   // internal | alpha | beta | production
    }
  }
}
```

5. Enviar:

```bash
eas submit --profile production --platform android --latest
```

---

## 5. Completar la ficha de Play Console (obligatorio antes de publicar)

- [ ] **Política de privacidad** (URL pública).
- [ ] **Data safety**: declarar datos recogidos (email, teléfono).
- [ ] **Clasificación de contenido** (cuestionario IARC).
- [ ] **Público objetivo** (18–30, no dirigida a niños).
- [ ] **Ficha principal**: descripción, ícono 512×512, capturas, gráfico de cabecera.
- [ ] **App de pago / gratuita** y países de distribución.

---

## 6. Publicar

1. Promover el build de **Pruebas internas** → **Producción** cuando esté validado.
2. Enviar a revisión de Google.
3. Esperar aprobación (normalmente 1–3 días el primer envío).

---

## Releases siguientes

```bash
# 1. Subir "version" en app.json (ej. 1.0.1)
# 2. Build (versionCode se autoincrementa)
eas build --profile production --platform android
# 3. Subir manual o con eas submit
eas submit --profile production --platform android --latest
```

---

## Notas

- ⚠️ Las claves en `eas.json` son `EXPO_PUBLIC_*` (públicas por diseño en cliente); aun así no agregues secretos privados ahí.
- El `package` `com.caepe.app` **no se puede cambiar** una vez publicado en Play Store.
- El keystore lo administra EAS: no lo pierdas, es la identidad de firma de la app. Verifícalo con `eas credentials`.
