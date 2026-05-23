import { Redirect } from 'expo-router';
import { useSession } from '../lib/store';

export default function Index() {
  const token = useSession((s) => s.token);
  const seenOnboarding = useSession((s) => s.seenOnboarding);

  if (token) return <Redirect href="/(tabs)/home" />;
  if (!seenOnboarding) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(auth)/login" />;
}
