import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api';

export type EventStatus = 'draft' | 'active' | 'funded' | 'cancelled';

export type EventParticipant = {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  amount_due: string;
  payment_status: 'pending' | 'paid';
  proof_image_url: string | null;
  has_proof: boolean;
  paid_at: string | null;
};

export type EventDetail = {
  id: string;
  group_id: string;
  organizer_id: string;
  plan_id: string | null;
  name: string;
  date: string | null;
  time: string | null;
  location: string | null;
  total_budget: string;
  amount_per_person: string;
  status: EventStatus;
  created_at: string;
  participants: EventParticipant[];
  organizer_payment_method: 'yape' | 'plin' | null;
  organizer_payment_number: string | null;
};

export type EventListItem = Omit<EventDetail, 'participants'>;

export type CreateEventBody = {
  group_id: string;
  plan_id?: string;
  name: string;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  total_budget: string;
  participants?: { name: string; phone?: string | null }[];
  member_user_ids?: string[];
};

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => apiRequest<EventListItem[]>('/events'),
  });
}

export function useEventsByGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ['events', 'group', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const all = await apiRequest<EventListItem[]>('/events');
      return all.filter((e) => e.group_id === groupId);
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    // Enviamos el token si existe (sin exigirlo): así el backend reconoce al
    // organizador/dueño y NO oculta las URLs de comprobantes. Los invitados sin
    // sesión siguen funcionando (sin header → lectura pública).
    queryFn: () => apiRequest<EventDetail>(`/events/${id}`),
    refetchInterval: 5_000,
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEventBody) => apiRequest<EventDetail>('/events', { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function useJoinEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) =>
      apiRequest<EventParticipant>(`/events/join/${inviteCode}`, { method: 'POST' }),
    onSuccess: (_d, code) => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['event'] });
    },
  });
}

export function useShareMessage(eventId: string | undefined) {
  return useMutation({
    mutationFn: () =>
      apiRequest<{ message: string; invite_code: string }>(
        `/events/${eventId}/share-message`,
        { method: 'POST' },
      ),
  });
}
