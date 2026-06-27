import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'caepe.device_hash';

/**
 * Devuelve un identificador estable por instalación (anti-abuso de referidos).
 * Se genera una vez y se persiste; se renueva solo si se reinstala la app.
 */
export async function getDeviceHash(): Promise<string> {
  let hash = await AsyncStorage.getItem(KEY);
  if (!hash) {
    hash = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    await AsyncStorage.setItem(KEY, hash);
  }
  return hash;
}
