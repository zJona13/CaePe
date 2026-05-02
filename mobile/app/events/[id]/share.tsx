import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Linking, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useShareMessage } from '../../../lib/queries/events';
import { SLANG } from '../../../lib/slang';
import { colors } from '../../../theme/colors';
import { radius } from '../../../theme/radius';
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
    <SafeAreaView style={styles.container}>
      <View style={{ padding: spacing.lg, gap: spacing.lg, flex: 1 }}>
        <Text style={styles.title}>{SLANG.ctaShare}</Text>
        <View style={styles.preview}><Text style={styles.previewText}>{share.data.message}</Text></View>
        <PrimaryButton label={SLANG.ctaShareWhatsapp} onPress={openWhatsapp} />
        <PrimaryButton variant="ghost" label={SLANG.ctaCopyMessage} onPress={copy} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary },
  preview: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  previewText: { ...typography.body, color: colors.textPrimary },
});
