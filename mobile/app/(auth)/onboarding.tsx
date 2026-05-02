import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function Onboarding() {
  const setSeen = useSession((s) => s.setSeenOnboarding);

  const goRegister = () => { setSeen(); router.replace('/(auth)/register'); };
  const goLogin = () => { setSeen(); router.replace('/(auth)/login'); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.brand}>CaePe</Text>
        <Text style={styles.tagline}>{SLANG.tagline}</Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton label={SLANG.ctaCreateAccount} onPress={goRegister} />
        <PrimaryButton variant="ghost" label={SLANG.ctaHaveAccount} onPress={goLogin} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'space-between' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  brand: { ...typography.display, color: colors.primary, fontSize: 56 },
  tagline: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  actions: { gap: spacing.md },
});
