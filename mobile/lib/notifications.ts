import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { apiRequest } from './api';

// Cómo se muestran las notificaciones con la app abierta.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId(): string | undefined {
  const fromExpo = (Constants.expoConfig as { extra?: { eas?: { projectId?: string } } } | null)
    ?.extra?.eas?.projectId;
  // easConfig existe en builds EAS.
  const fromEas = (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  return fromExpo ?? fromEas;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Pide permisos y devuelve el ExpoPushToken, o null si no se puede (Expo Go / emulador / sin permiso). */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[push] omitido: no es dispositivo fisico');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'CaePe',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF8775',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[push] permiso no concedido:', finalStatus);
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.log('[push] sin projectId (extra.eas.projectId) — token remoto no disponible');
  }
  // Tras conceder permiso por primera vez, FCM/APNs puede no estar listo y el primer
  // getExpoPushTokenAsync falla. Reintentar evita perder el token en cuentas nuevas.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      return tokenData.data;
    } catch (e) {
      console.log(`[push] getExpoPushTokenAsync intento ${attempt}/3 fallo:`, e);
      if (attempt < 3) await delay(1500);
    }
  }
  return null;
}

/** Registra el token del dispositivo en el backend. Best-effort: nunca lanza. */
export async function syncPushToken(): Promise<void> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) {
      console.log('[push] sin token; no se registra en backend');
      return;
    }
    await apiRequest('/notifications/register-token', {
      method: 'POST',
      body: { token, platform: Platform.OS },
    });
    console.log('[push] token registrado en backend OK');
  } catch (e) {
    console.log('[push] error registrando token:', e);
  }
}

/** Quita el token del backend (llamar ANTES de cerrar sesión). Best-effort. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) return;
    await apiRequest('/notifications/unregister-token', {
      method: 'POST',
      body: { token, platform: Platform.OS },
    });
  } catch {
    // ignore
  }
}
