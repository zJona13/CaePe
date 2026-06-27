import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api';

export type Banner = {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
};

export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: () => apiRequest<Banner[]>('/banners'),
    staleTime: 1000 * 60 * 10,
  });
}
