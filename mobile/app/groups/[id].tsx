import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Copy } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useGroup } from '../../lib/queries/groups';
import { useEventsByGroup } from '../../lib/queries/events';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(id);
  const events = useEventsByGroup(id);

  const shareWhatsapp = async () => {
    if (!group.data) return;
    const link = `caepe://groups/join/${group.data.invite_code}`;
    const msg = `¡Habla! Únete a "${group.data.name}" en CaePe: ${link}`;
    try { await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`); } catch { /* ignore */ }
  };

  const copyCode = async () => {
    if (group.data) await Clipboard.setStringAsync(group.data.invite_code);
  };

  if (group.isLoading) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  if (!group.data) return <SafeAreaView style={styles.center}><Text>{SLANG.errorGeneric}</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={styles.title}>{group.data.name}</Text>

        <View style={styles.codeRow}>
          <View>
            <Text style={styles.label}>código</Text>
            <Text style={styles.code}>{group.data.invite_code}</Text>
          </View>
          <Pressable onPress={copyCode} style={styles.copyBtn}>
            <Copy size={18} color={colors.primary} />
          </Pressable>
        </View>

        <PrimaryButton label={SLANG.ctaShare} onPress={shareWhatsapp} />

        <Text style={styles.section}>{SLANG.sectionEvents}</Text>
        {events.isLoading ? <ActivityIndicator color={colors.primary} /> :
          events.data && events.data.length > 0 ?
            events.data.map((e) => (
              <Pressable key={e.id} style={styles.eventRow} onPress={() => router.push({ pathname: '/events/[id]', params: { id: e.id } })}>
                <Text style={styles.eventName}>{e.name}</Text>
                <Text style={styles.eventMeta}>{e.date ?? 'sin fecha'} — {e.status}</Text>
              </Pressable>
            )) :
            <Text style={styles.empty}>{SLANG.emptyEvents}</Text>
        }

        <PrimaryButton variant="secondary" label={SLANG.ctaCreateEvent} onPress={() => router.push({ pathname: '/events/new', params: { groupId: id } })} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  label: { ...typography.caption, color: colors.textSecondary },
  code: { ...typography.h2, color: colors.primary, letterSpacing: 2 },
  copyBtn: { padding: spacing.sm },
  section: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md },
  empty: { ...typography.body, color: colors.textSecondary, fontStyle: 'italic' },
  eventRow: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  eventName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  eventMeta: { ...typography.caption, color: colors.textSecondary },
});
