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

/** Pide permisos y devuelve el ExpoPushToken, o null si no se puede (Expo Go / emulador / sin permiso). */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

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
  if (finalStatus !== 'granted') return null;

  try {
    const projectId = getProjectId();
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenData.data;
  } catch {
    // En Expo Go (SDK 53+) o sin projectId no se puede obtener token remoto.
    return null;
  }
}

/** Registra el token del dispositivo en el backend. Best-effort: nunca lanza. */
export async function syncPushToken(): Promise<void> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) return;
    await apiRequest('/notifications/register-token', {
      method: 'POST',
      body: { token, platform: Platform.OS },
    });
  } catch {
    // sin push no pasa nada
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
