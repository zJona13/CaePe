import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../api';
import { useSession } from '../store';
import type { EventParticipant } from './events';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

export function useSendReminder(eventId: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest<{ notified: number }>(
        `/notifications/send-reminder?event_id=${eventId}`,
        { method: 'POST' },
      ),
  });
}

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

export type ProofUpload = {
  eventId: string;
  participantId: string;
  amount: string;
  fileUri: string;
  fileName?: string;
  mimeType?: string;
};

export type PaymentRecord = {
  id: string;
  event_id: string;
  participant_id: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'rejected';
  proof_image_url: string | null;
};

export function useUploadProof(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProofUpload): Promise<PaymentRecord> => {
      const token = useSession.getState().token;
      const form = new FormData();
      form.append('event_id', input.eventId);
      form.append('participant_id', input.participantId);
      form.append('amount', input.amount);
      // React Native FormData accepts a { uri, name, type } object for files.
      form.append('file', {
        uri: input.fileUri,
        name: input.fileName ?? 'proof.jpg',
        type: input.mimeType ?? 'image/jpeg',
      } as unknown as Blob);

      const res = await fetch(`${BASE_URL}/payments/upload-proof`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
      });

      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = text; }
      }
      if (!res.ok) {
        const detail = (parsed && typeof parsed === 'object' && 'detail' in (parsed as object))
          ? String((parsed as { detail: unknown }).detail)
          : `HTTP ${res.status}`;
        throw new ApiError(res.status, detail, parsed);
      }
      return parsed as PaymentRecord;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event', eventId] }); },
  });
}

export function resolveProofUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path}`;
}
