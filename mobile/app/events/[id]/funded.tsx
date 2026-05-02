import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function Funded() {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.success }]}>
      <View style={styles.body}>
        <View style={styles.iconWrap}><Check size={80} color={colors.surface} strokeWidth={3} /></View>
        <Text style={styles.title}>{SLANG.fundedTitle}</Text>
        <Text style={styles.subtitle}>{SLANG.fundedSubtitle}</Text>
      </View>
      <PrimaryButton variant="ghost" label={SLANG.ctaBackHome} onPress={() => router.replace('/(tabs)/home')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, justifyContent: 'space-between' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  iconWrap: { width: 140, height: 140, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.display, color: colors.surface, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.surface, textAlign: 'center', opacity: 0.95 },
});
