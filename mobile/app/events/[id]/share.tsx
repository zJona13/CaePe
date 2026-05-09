import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Linking, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Copy, MessageCircle, Send } from 'lucide-react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useShareMessage } from '../../../lib/queries/events';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { radius } from '../../../theme/radius';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const share = useShareMessage(id);
  const trigger = share.mutate;

  useEffect(() => {
    if (id) trigger();
  }, [id, trigger]);

  const openWhatsapp = async () => {
    if (!share.data) return;
    const url = `whatsapp://send?text=${encodeURIComponent(share.data.message)}`;
    try { await Linking.openURL(url); }
    catch { await Share.share({ message: share.data.message }); }
  };

  const copy = async () => {
    if (share.data) await Clipboard.setStringAsync(share.data.message);
  };

  if (share.isPending || !share.data) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={SLANG.ctaShare} subtitle="Pasa la voz por WhatsApp" />
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <View style={styles.iconBlob} />
          <View style={styles.iconCircle}>
            <Send size={40} color={colors.surface} strokeWidth={2.4} />
          </View>
        </View>

        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <MessageCircle size={14} color={colors.textSecondary} strokeWidth={2.5} />
            <Text style={styles.previewLabel}>Mensaje</Text>
          </View>
          <Text style={styles.previewText}>{share.data.message}</Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={SLANG.ctaShareWhatsapp}
            onPress={openWhatsapp}
            icon={<MessageCircle size={18} color={colors.onPrimary} strokeWidth={2.5} />}
          />
          <PrimaryButton
            variant="ghost"
            label={SLANG.ctaCopyMessage}
            onPress={copy}
            icon={<Copy size={16} color={colors.primary} strokeWidth={2.5} />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.lg, flex: 1 },

  iconWrap: { width: 140, height: 140, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: spacing.md },
  iconBlob: { position: 'absolute', width: 130, height: 130, borderRadius: radius.full, backgroundColor: colors.accent, opacity: 0.85, top: 0, right: 0, transform: [{ rotate: '12deg' }] },
  iconCircle: { width: 110, height: 110, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.elevated },

  preview: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm, ...shadows.card },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewLabel: { ...typography.captionBold, color: colors.textSecondary, textTransform: 'uppercase' },
  previewText: { ...typography.body, color: colors.textPrimary },

  actions: { gap: spacing.sm, marginTop: 'auto' },
});
