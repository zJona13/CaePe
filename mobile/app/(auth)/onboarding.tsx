import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Users, Wallet } from 'lucide-react-native';
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
      <View style={styles.heroWrap}>
        <View style={styles.shapeStack}>
          <View style={[styles.shape, styles.shapePurple]} />
          <View style={[styles.shape, styles.shapeLime]} />
          <View style={[styles.shape, styles.shapeTeal]}>
            <Users size={56} color={colors.surface} strokeWidth={2.4} />
          </View>
        </View>

        <Text style={styles.brand}>CaePe</Text>
        <Text style={styles.tagline}>{SLANG.tagline}</Text>

        <View style={styles.bullets}>
          <Bullet icon={<Sparkles size={18} color={colors.secondary} strokeWidth={2.4} />} bg={colors.secondarySoft} text="Ruleta planazo: cero indecisión" />
          <Bullet icon={<Users size={18} color={colors.primary} strokeWidth={2.4} />} bg={colors.primarySoft} text="Grupo, evento y participantes en 3 minutos" />
          <Bullet icon={<Wallet size={18} color={colors.accentDark} strokeWidth={2.4} />} bg={colors.accentSoft} text="Yape o Plin por fuera. Cero plata por la app" />
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label={SLANG.ctaCreateAccount} onPress={goRegister} />
        <PrimaryButton variant="ghost" label={SLANG.ctaHaveAccount} onPress={goLogin} />
      </View>
    </SafeAreaView>
  );
}

function Bullet({ icon, bg, text }: { icon: ReactNode; bg: string; text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={[styles.bulletIcon, { backgroundColor: bg }]}>{icon}</View>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, justifyContent: 'space-between' },
  heroWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  shapeStack: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  shape: { position: 'absolute', borderRadius: 60 },
  shapePurple: { width: 140, height: 140, backgroundColor: colors.secondary, top: 0, left: 0, transform: [{ rotate: '-12deg' }] },
  shapeLime: { width: 140, height: 140, backgroundColor: colors.accent, bottom: 0, right: 0, transform: [{ rotate: '14deg' }] },
  shapeTeal: { width: 130, height: 130, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  brand: { ...typography.display, fontSize: 56, color: colors.textPrimary, letterSpacing: -1 },
  tagline: { ...typography.body, color: colors.textSecondary, textAlign: 'center', maxWidth: 320 },
  bullets: { gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.md },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  bulletIcon: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  bulletText: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  actions: { gap: spacing.sm, paddingTop: spacing.md },
});
