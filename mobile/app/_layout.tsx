import {
  Stack,
  router,
  useNavigationContainerRef,
  useRootNavigationState,
  useSegments,
} from 'expo-router';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '../lib/queries/client';
import { useSession } from '../lib/store';

function AuthGuard() {
  const segments = useSegments();
  const navigationRef = useNavigationContainerRef();
  const rootNavigationState = useRootNavigationState();
  const token = useSession((s) => s.token);
  const seenOnboarding = useSession((s) => s.seenOnboarding);

  useEffect(() => {
    if (!rootNavigationState?.key) {
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const redirectWhenReady = () => {
      if (cancelled) {
        return;
      }

      if (!navigationRef.isReady()) {
        timeout = setTimeout(redirectWhenReady, 0);
        return;
      }

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
    };

    timeout = setTimeout(redirectWhenReady, 0);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [token, segments, seenOnboarding, rootNavigationState?.key, navigationRef]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
        <AuthGuard />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
