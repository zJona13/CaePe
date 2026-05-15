import { apiRequest } from '../api';
import type { SessionUser } from '../store';

export type RegisterBody = {
  email: string;
  name?: string;
  phone?: string;
  payment_method?: 'yape' | 'plin' | null;
  payment_number?: string | null;
};

export async function provisionAccount(body: RegisterBody, token: string): Promise<SessionUser> {
  const u = await apiRequest<SessionUser & { payment_method: 'yape' | 'plin' | null }>(
    '/auth/register',
    { method: 'POST', body, token },
  );
  return u;
}

export async function fetchMe(token: string): Promise<SessionUser> {
  return apiRequest<SessionUser>('/auth/me', { token });
}

export type UpdateMeBody = {
  name?: string | null;
  phone?: string | null;
  payment_method?: 'yape' | 'plin' | null;
  payment_number?: string | null;
};

export async function updateMe(body: UpdateMeBody, token: string): Promise<SessionUser> {
  return apiRequest<SessionUser>('/auth/me', { method: 'PATCH', body, token });
}
