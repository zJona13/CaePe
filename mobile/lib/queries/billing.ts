import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api';

export type BillingMe = {
  plan: 'free' | 'premium';
  is_premium: boolean;
  premium_until: string | null;
  event_credits: number;
  events_created: number;
  free_event_limit: number;
  // null = ilimitado (premium)
  events_remaining: number | null;
};

export type CreditPack = {
  code: string;
  credits: number;
  price: string;
  title: string;
};

export type BillingCatalog = {
  credit_packs: CreditPack[];
  premium_code: string;
  premium_price: string;
  premium_title: string;
  currency: string;
};

export type CheckoutResponse = {
  billing_payment_id: string;
  preference_id: string;
  init_point: string;
};

export function useBillingMe() {
  return useQuery({
    queryKey: ['billing', 'me'],
    queryFn: () => apiRequest<BillingMe>('/billing/me'),
  });
}

export function useBillingCatalog() {
  return useQuery({
    queryKey: ['billing', 'catalog'],
    queryFn: () => apiRequest<BillingCatalog>('/billing/catalog', { auth: false }),
    staleTime: 1000 * 60 * 60, // el catálogo cambia rara vez
  });
}

export function useCreditsCheckout() {
  return useMutation({
    mutationFn: (packCode: string) =>
      apiRequest<CheckoutResponse>('/billing/credits/checkout', {
        method: 'POST',
        body: { pack_code: packCode },
      }),
  });
}

export function usePremiumCheckout() {
  return useMutation({
    mutationFn: () =>
      apiRequest<CheckoutResponse>('/billing/premium/checkout', { method: 'POST' }),
  });
}

/** Refresca el estado del plan tras volver del checkout (la verdad la da el webhook). */
export function useRefreshBilling() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['billing'] });
}
