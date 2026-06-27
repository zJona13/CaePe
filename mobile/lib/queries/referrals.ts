import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api';

export type ReferralMe = {
  referral_code: string;
  link: string;
  pending: number;
  qualified: number;
  rewarded: number;
  reward_days: number;
};

export function useReferralsMe() {
  return useQuery({
    queryKey: ['referrals', 'me'],
    queryFn: () => apiRequest<ReferralMe>('/referrals/me'),
  });
}
