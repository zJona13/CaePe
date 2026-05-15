import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  payment_method?: 'yape' | 'plin' | null;
  payment_number?: string | null;
};

type SessionState = {
  user: SessionUser | null;
  token: string | null;
  seenOnboarding: boolean;
  setSession: (user: SessionUser, token: string) => void;
  clearSession: () => void;
  setSeenOnboarding: () => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      seenOnboarding: false,
      setSession: (user, token) => set({ user, token }),
      clearSession: () => set({ user: null, token: null }),
      setSeenOnboarding: () => set({ seenOnboarding: true }),
    }),
    {
      name: 'caepe.session',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
