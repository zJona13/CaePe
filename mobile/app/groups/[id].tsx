import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Calendar, Copy, MapPin, Plus, Share2, Wallet } from 'lucide-react-native';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useGroup, useGroupMembers } from '../../lib/queries/groups';
import { useEventsByGroup } from '../../lib/queries/events';
import { SLANG } from '../../lib/slang';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(id);
  const events = useEventsByGroup(id);
  const members = useGroupMembers(id);

  const shareWhatsapp = async () => {
    if (!group.data) return;
    const code = group.data.invite_code;
    const link = `caepe://groups/join/${code}`;
    const msg =
      `¡Habla! Únete a "${group.data.name}" en CaePe 🎉\n\n` +
      `📲 Si ya tienes la app, abre: ${link}\n` +
      `🔑 O entra a CaePe y mete el código: ${code}`;
    try { await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`); } catch { /* ignore */ }
  };

  const copyCode = async () => {
    if (group.data) await Clipboard.setStringAsync(group.data.invite_code);
  };

  if (group.isLoading) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  if (!group.data) return <SafeAreaView style={styles.center}><Text style={styles.err}>{SLANG.errorGeneric}</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroBlock}>
          <Text style={styles.title}>{group.data.name}</Text>
          <Text style={styles.subtitle}>Tu mancha en CaePe</Text>
        </View>

        <View style={styles.codeCard}>
          <View style={styles.codeLeft}>
            <Text style={styles.codeLabel}>Código</Text>
            <Text style={styles.code}>{group.data.invite_code}</Text>
          </View>
          <Pressable
            onPress={copyCode}
            style={({ pressed }) => [styles.copyBtn, pressed && { transform: [{ scale: 0.95 }] }]}
            hitSlop={8}
          >
            <Copy size={18} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
        </View>

        <PrimaryButton
          label={SLANG.ctaShare}
          onPress={shareWhatsapp}
          icon={<Share2 size={18} color={colors.onPrimary} strokeWidth={2.5} />}
        />

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Miembros</Text>
          {group.data.members_count ? <Text style={styles.sectionCount}>{group.data.members_count}</Text> : null}
        </View>

        {members.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.md }} />
        ) : members.data && members.data.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {members.data.map((m) => {
              const displayName = m.name ?? m.email ?? 'Invitado';
              const roleLabel = m.role === 'owner' ? 'Organizador' : m.role === 'guest' ? 'Sin cuenta' : null;
              return (
                <View key={m.id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.memberName} numberOfLines={1}>{displayName}</Text>
                  {roleLabel ? (
                    <Text style={[styles.memberRole, m.role === 'owner' ? styles.roleOwner : styles.roleGuest]}>
                      {roleLabel}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.muted}>Aún nadie en el grupo.</Text>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.section}>{SLANG.sectionEvents}</Text>
        </View>

        {events.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
        ) : events.data && events.data.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {events.data.map((e) => (
              <Pressable
                key={e.id}
                style={({ pressed }) => [styles.eventRow, pressed && { transform: [{ scale: 0.98 }] }]}
                onPress={() => router.push({ pathname: '/events/[id]', params: { id: e.id } })}
              >
                <View style={styles.eventIcon}>
                  <Calendar size={20} color={colors.primary} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.eventName}>{e.name}</Text>
                  <View style={styles.eventMetaRow}>
                    <MapPin size={12} color={colors.textMuted} />
                    <Text style={styles.eventMeta}>{e.date ?? 'sin fecha'}</Text>
                    <Wallet size={12} color={colors.textMuted} />
                    <Text style={styles.eventMeta}>S/ {e.amount_per_person}</Text>
                  </View>
                </View>
                <StatusBadge status={e.status} />
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<Calendar size={32} color={colors.primary} strokeWidth={2.2} />}
            title={SLANG.emptyEvents}
            body="Crea uno para empezar a juntar la cuota"
          />
        )}

        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton
            variant="accent"
            label={SLANG.ctaCreateEvent}
            onPress={() => router.push({ pathname: '/events/new', params: { groupId: id } })}
            icon={<Plus size={18} color={colors.onAccent} strokeWidth={2.6} />}
          />
        </View>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  heroBlock: { gap: 4 },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },

  codeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.lg, ...shadows.elevated },
  codeLeft: { gap: 4 },
  codeLabel: { ...typography.captionBold, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' },
  code: { fontSize: 28, fontWeight: '800', color: colors.surface, letterSpacing: 4 },
  copyBtn: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  section: { ...typography.h2, color: colors.textPrimary },
  sectionCount: { ...typography.bodyBold, color: colors.textMuted, marginLeft: spacing.xs },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  memberAvatar: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { ...typography.bodyBold, color: colors.primary },
  memberName: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  memberRole: { ...typography.caption, fontWeight: '700' },
  roleOwner: { color: colors.primary },
  roleGuest: { color: colors.textMuted },
  muted: { ...typography.body, color: colors.textMuted },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  eventIcon: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  eventName: { ...typography.bodyBold, color: colors.textPrimary },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  eventMeta: { ...typography.caption, color: colors.textSecondary },
  err: { ...typography.body, color: colors.error },
});
