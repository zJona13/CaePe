import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api';

export type Group = {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
};

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => apiRequest<Group[]>('/groups'),
  });
}

export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: ['groups', id],
    enabled: !!id,
    queryFn: () => apiRequest<Group>(`/groups/${id}`),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiRequest<Group>('/groups', { method: 'POST', body: { name } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) =>
      apiRequest<{ id: string; group_id: string }>(`/groups/join/${inviteCode}`, { method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
}
