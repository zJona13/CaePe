import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Info } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useSession } from '../../lib/store';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function Onboarding() {
  const setSeen = useSession((s) => s.setSeenOnboarding);

  const goRegister = () => { setSeen(); router.replace('/(auth)/register'); };
  const goLogin = () => { setSeen(); router.replace('/(auth)/login'); };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="CaePe"
        />
        <Text style={styles.brand}>CaePe</Text>
        <Text style={styles.tagline}>Arma planes con tu grupo y divide cuentas fácilmente.</Text>

        <View style={styles.chip}>
          <Info size={16} color={colors.textSecondary} strokeWidth={2.2} />
          <Text style={styles.chipText}>Sin mover plata por la app – solo para organizarse.</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton size="lg" label={SLANG.ctaStartNow} onPress={goRegister} />
        <PrimaryButton variant="text" label={SLANG.ctaHaveAccount} onPress={goLogin} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  logo: { width: 220, height: 220 },
  brand: { ...typography.display, color: colors.primaryDark, textAlign: 'center' },
  tagline: { ...typography.body, color: colors.textPrimary, textAlign: 'center', maxWidth: 280, marginTop: -spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    maxWidth: 320,
  },
  chipText: { ...typography.caption, color: colors.textSecondary, flexShrink: 1 },
  actions: { gap: spacing.xs, paddingTop: spacing.md },
});
