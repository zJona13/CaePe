import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, PartyPopper } from 'lucide-react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { radius } from '../../../theme/radius';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function Funded() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.confettiTop}>
        <View style={[styles.confettiDot, { backgroundColor: colors.secondary, top: 20, left: '15%' }]} />
        <View style={[styles.confettiDot, { backgroundColor: colors.surface, top: 60, left: '40%', width: 14, height: 14 }]} />
        <View style={[styles.confettiDot, { backgroundColor: colors.primary, top: 30, right: '20%', width: 18, height: 18 }]} />
        <View style={[styles.confettiDot, { backgroundColor: colors.surface, top: 90, right: '38%', width: 10, height: 10 }]} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <View style={[styles.ring, styles.ringPurple]} />
          <View style={[styles.ring, styles.ringTeal]} />
          <View style={styles.iconCircle}>
            <Check size={72} color={colors.onAccent} strokeWidth={3.5} />
          </View>
        </View>

        <View style={styles.popper}>
          <PartyPopper size={20} color={colors.onAccent} strokeWidth={2.4} />
          <Text style={styles.popperText}>FONDEADO</Text>
        </View>

        <Text style={styles.title}>{SLANG.fundedTitle}</Text>
        <Text style={styles.subtitle}>{SLANG.fundedSubtitle}</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton variant="primary" label={SLANG.ctaBackHome} onPress={() => router.replace('/(tabs)/home')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.accent, padding: spacing.xl, justifyContent: 'space-between' },
  confettiTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  confettiDot: { position: 'absolute', width: 16, height: 16, borderRadius: radius.full },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },

  iconWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  ring: { position: 'absolute', borderRadius: radius.full },
  ringPurple: { width: 200, height: 200, backgroundColor: colors.secondary, opacity: 0.85, transform: [{ rotate: '-15deg' }], top: 0, left: 0 },
  ringTeal: { width: 200, height: 200, backgroundColor: colors.primary, opacity: 0.9, transform: [{ rotate: '20deg' }], bottom: 0, right: 0 },
  iconCircle: { width: 150, height: 150, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.elevated },

  popper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full },
  popperText: { ...typography.captionBold, color: colors.onAccent, letterSpacing: 1 },

  title: { ...typography.display, color: colors.onAccent, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.onAccent, textAlign: 'center', opacity: 0.85, maxWidth: 320 },

  actions: { gap: spacing.sm },
});
