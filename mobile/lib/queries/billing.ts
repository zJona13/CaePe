import { useQuery } from '@tanstack/react-query';
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

export function useBillingMe() {
  return useQuery({
    queryKey: ['billing', 'me'],
    queryFn: () => apiRequest<BillingMe>('/billing/me'),
  });
}
