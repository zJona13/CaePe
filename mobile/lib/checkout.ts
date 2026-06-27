import * as WebBrowser from 'expo-web-browser';

// URL https a la que Mercado Pago redirige al terminar (back_urls). La página
// billing-return de la landing solo cierra el flujo; la confirmación real del
// pago llega por el webhook del backend.
const RETURN_URL =
  process.env.EXPO_PUBLIC_BILLING_RETURN_URL ?? 'https://caepe.lat/billing/return';

export type CheckoutOutcome = 'returned' | 'dismissed';

/**
 * Abre el checkout de Mercado Pago en una sesión de navegador y resuelve cuando
 * el usuario vuelve (redirige a RETURN_URL) o cierra el navegador.
 */
export async function openCheckout(initPoint: string): Promise<CheckoutOutcome> {
  try {
    const result = await WebBrowser.openAuthSessionAsync(initPoint, RETURN_URL);
    return result.type === 'success' ? 'returned' : 'dismissed';
  } finally {
    // En Android cierra cualquier sesión pendiente; no-op en iOS.
    WebBrowser.maybeCompleteAuthSession();
  }
}
