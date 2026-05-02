import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api';

export type PlanCategory = 'comida' | 'deporte' | 'fiesta' | 'cultura' | 'aire_libre' | 'otros';

export type Plan = {
  id: string;
  name: string;
  category: PlanCategory;
  price_min: string;
  price_max: string;
  location: string | null;
  description: string | null;
  city: string;
  is_active: boolean;
};

export type PlanFilters = {
  category?: PlanCategory;
  price_min?: number;
  price_max?: number;
  city?: string;
};

export function usePlans(filters: PlanFilters = {}) {
  return useQuery({
    queryKey: ['plans', filters],
    queryFn: () => apiRequest<Plan[]>('/plans', { auth: false, query: filters }),
  });
}

export async function fetchRandomPlan(filters: PlanFilters): Promise<Plan> {
  return apiRequest<Plan>('/plans/random', { auth: false, query: filters });
}
