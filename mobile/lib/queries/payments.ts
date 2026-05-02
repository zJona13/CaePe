import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api';
import type { EventParticipant } from './events';

export function useMarkPayment(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, status }: { participantId: string; status: 'pending' | 'paid' }) =>
      apiRequest<EventParticipant>(
        `/events/${eventId}/participants/${participantId}/payment`,
        { method: 'PATCH', body: { payment_status: status } },
      ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event', eventId] }); },
  });
}
