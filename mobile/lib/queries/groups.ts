import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api';

export type Group = {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
  members_count: number;
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

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string | null;
  role: 'owner' | 'member' | 'guest';
  status: 'active' | 'invited' | 'removed';
  name: string | null;
  email: string | null;
  phone: string | null;
  payment_method: 'yape' | 'plin' | null;
};

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['groups', groupId, 'members'],
    enabled: !!groupId,
    queryFn: () => apiRequest<GroupMember[]>(`/groups/${groupId}/members`),
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
