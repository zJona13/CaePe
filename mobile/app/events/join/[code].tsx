import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useJoinEvent } from '../../../lib/queries/events';
import { useSession } from '../../../lib/store';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function JoinEvent() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const token = useSession((s) => s.token);
  const joinEvent = useJoinEvent();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !code) return;
    let cancelled = false;
    (async () => {
      try {
        const part = await joinEvent.mutateAsync(code);
        if (!cancelled) router.replace({ pathname: '/events/[id]', params: { id: part.event_id } });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, code]);

  if (!token) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScreenHeader />
        <View style={styles.body}>
          <Text style={styles.title}>Únete al evento</Text>
          <Text style={styles.subtitle}>Inicia sesión o crea tu cuenta para unirte automáticamente al evento.</Text>
          <PrimaryButton label="Iniciar sesión" onPress={() => router.replace('/(auth)/login')} />
          <PrimaryButton variant="ghost" label="Crear cuenta" onPress={() => router.replace('/(auth)/register')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader />
      <View style={styles.body}>
        {error ? (
          <>
            <Text style={styles.title}>No pudimos unirte</Text>
            <Text style={styles.subtitle}>{error}</Text>
            <PrimaryButton label="Volver" onPress={() => router.replace('/(tabs)/home')} />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.subtitle}>Uniéndote al evento...</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
