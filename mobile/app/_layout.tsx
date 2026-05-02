import { Stack, router, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '../lib/queries/client';
import { useSession } from '../lib/store';

function AuthGuard() {
  const segments = useSegments();
  const token = useSession((s) => s.token);
  const seenOnboarding = useSession((s) => s.seenOnboarding);

  useEffect(() => {
    const segs = segments as unknown as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const isPublicEvent =
      segs[0] === 'events' &&
      (segs[2] === undefined || segs[2] === 'funded');
    // Expo router for /events/[id]/index resolves to segments = ['events', '<id>'] (index is collapsed)

    if (!token) {
      if (!seenOnboarding && !inAuthGroup) {
        router.replace('/(auth)/onboarding');
      } else if (seenOnboarding && !inAuthGroup && !isPublicEvent) {
        router.replace('/(auth)/login');
      }
    } else if (inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [token, segments, seenOnboarding]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
