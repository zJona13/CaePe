import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  onHide: () => void;
  duration?: number;
};

/** Banner de éxito que baja desde arriba, se mantiene y se oculta solo. */
export function Toast({ visible, title, message, onHide, duration = 2800 }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => onHide());
    }, duration);
    return () => clearTimeout(t);
  }, [visible, anim, duration, onHide]);

  if (!visible) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { opacity: anim, transform: [{ translateY }] }]}
    >
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <CheckCircle2 size={22} color={colors.onPrimary} strokeWidth={2.6} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
        <Pressable hitSlop={10} onPress={onHide} style={styles.close}>
          <X size={18} color={colors.successDark} strokeWidth={2.4} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.elevated,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  title: { ...typography.bodyBold, color: colors.successDark },
  message: { ...typography.caption, color: colors.textSecondary },
  close: { padding: 2 },
});
