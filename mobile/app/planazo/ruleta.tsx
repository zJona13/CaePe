import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Beer, Drumstick, Mountain, Music, Palette, Sparkles, Trophy, Users } from 'lucide-react-native';
import { Input } from '../../components/Input';
import { PlanCard } from '../../components/PlanCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { fetchRandomPlan, type Plan, type PlanCategory } from '../../lib/queries/plans';
import { SLANG } from '../../lib/slang';
import { categoryColors, colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const CATEGORIES: { key: PlanCategory; label: string; Icon: typeof Drumstick }[] = [
  { key: 'comida', label: 'Comida', Icon: Drumstick },
  { key: 'deporte', label: 'Deporte', Icon: Trophy },
  { key: 'fiesta', label: 'Fiesta', Icon: Music },
  { key: 'cultura', label: 'Cultura', Icon: Palette },
  { key: 'aire_libre', label: 'Aire libre', Icon: Mountain },
  { key: 'otros', label: 'Otros', Icon: Beer },
];

export default function Ruleta() {
  const [selected, setSelected] = useState<PlanCategory | null>(null);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [people, setPeople] = useState('');
  const [result, setResult] = useState<Plan | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const rotate = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;

  const spin = async () => {
    setErr(null); setResult(null); setSpinning(true);
    rotate.setValue(0);
    reveal.setValue(0);
    Animated.timing(rotate, {
      toValue: 4,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    try {
      const plan = await fetchRandomPlan({
        category: selected ?? undefined,
        price_min: priceMin ? Number(priceMin) : undefined,
        price_max: priceMax ? Number(priceMax) : undefined,
      });
      setTimeout(() => {
        setResult(plan);
        setSpinning(false);
        Animated.timing(reveal, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      }, 1500);
    } catch (e) {
      setErr((e as Error).message);
      setSpinning(false);
    }
  };

  const useThis = () => {
    if (!result) return;
    router.push({ pathname: '/events/new', params: { planId: result.id, people } });
  };

  const rotateInterpolate = rotate.interpolate({ inputRange: [0, 4], outputRange: ['0deg', '1440deg'] });
  const revealScale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Planazo" subtitle="Tira la ruleta y arma tu plan" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <Text style={styles.label}>Categoría</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map(({ key, label, Icon }) => {
            const isActive = selected === key;
            const palette = categoryColors[key];
            const bg = isActive ? palette.bg : colors.surface;
            const fg = isActive ? palette.fg : colors.textPrimary;
            return (
              <Pressable
                key={key}
                onPress={() => setSelected((s) => (s === key ? null : key))}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: bg, borderColor: isActive ? palette.bg : colors.border },
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
              >
                <Icon size={16} color={fg} strokeWidth={2.4} />
                <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.priceRow}>
          <View style={{ flex: 1 }}>
            <Input label="Precio min (S/)" placeholder="0" keyboardType="number-pad" value={priceMin} onChangeText={setPriceMin} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Precio max (S/)" placeholder="100" keyboardType="number-pad" value={priceMax} onChangeText={setPriceMax} />
          </View>
        </View>

        <Input
          label="# personas"
          placeholder="ej. 4"
          keyboardType="number-pad"
          value={people}
          onChangeText={setPeople}
          helper="Para calcular el monto luego"
        />

        <View style={styles.diceWrap}>
          <View style={styles.dicePurpleBlob} />
          <View style={styles.diceLimeBlob} />
          <Animated.View style={[styles.diceCircle, { transform: [{ rotate: rotateInterpolate }] }]}>
            <Sparkles size={56} color={colors.surface} strokeWidth={2.4} />
          </Animated.View>
        </View>

        <PrimaryButton
          variant="primary"
          size="lg"
          label={SLANG.ctaSpinRoulette}
          onPress={spin}
          loading={spinning}
          icon={<Sparkles size={18} color={colors.onPrimary} strokeWidth={2.6} />}
        />

        {err ? <Text style={styles.err}>{err}</Text> : null}

        {result ? (
          <Animated.View style={[styles.resultWrap, { opacity: reveal, transform: [{ scale: revealScale }] }]}>
            <View style={styles.resultBadge}>
              <Sparkles size={14} color={colors.onAccent} strokeWidth={2.6} />
              <Text style={styles.resultBadgeText}>{SLANG.rouletteResult}</Text>
            </View>
            <PlanCard plan={result} selected />
            <PrimaryButton variant="accent" label={SLANG.ctaUseThisPlan} onPress={useThis} icon={<Users size={18} color={colors.onAccent} strokeWidth={2.6} />} />
            <PrimaryButton variant="ghost" label={SLANG.ctaSpinAgain} onPress={spin} />
          </Animated.View>
        ) : null}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  label: { ...typography.captionBold, color: colors.textPrimary, textTransform: 'uppercase' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.full, borderWidth: 1.5 },
  chipText: { ...typography.bodyBold, fontSize: 14 },
  priceRow: { flexDirection: 'row', gap: spacing.sm },

  diceWrap: { alignSelf: 'center', width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.md },
  dicePurpleBlob: { position: 'absolute', width: 160, height: 160, borderRadius: radius.full, backgroundColor: colors.secondary, opacity: 0.6, top: 4, left: 4, transform: [{ rotate: '-15deg' }] },
  diceLimeBlob: { position: 'absolute', width: 160, height: 160, borderRadius: radius.full, backgroundColor: colors.accent, opacity: 0.65, bottom: 4, right: 4, transform: [{ rotate: '20deg' }] },
  diceCircle: { width: 130, height: 130, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.elevated },

  err: { ...typography.caption, color: colors.error, textAlign: 'center' },

  resultWrap: { gap: spacing.sm, marginTop: spacing.lg },
  resultBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  resultBadgeText: { ...typography.captionBold, color: colors.onAccent, letterSpacing: 0.4 },
});
