import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useBanners } from '../lib/queries/banners';
import { useBillingMe } from '../lib/queries/billing';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';

/**
 * Banner promocional en Home. Se oculta para usuarios Premium y cuando no hay
 * banners activos. El backend ya filtra por audiencia/vigencia.
 */
export function AdBanner() {
  const billing = useBillingMe();
  const banners = useBanners();

  if (billing.data?.is_premium) return null;
  const banner = banners.data?.[0];
  if (!banner) return null;

  const onPress = () => {
    if (banner.link_url) Linking.openURL(banner.link_url).catch(() => undefined);
  };

  const content = (
    <Image source={{ uri: banner.image_url }} style={styles.image} resizeMode="cover" />
  );

  return (
    <View style={styles.wrap}>
      {banner.link_url ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.99 }] }]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.card}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    ...shadows.card,
  },
  image: { width: '100%', aspectRatio: 16 / 6 },
});
