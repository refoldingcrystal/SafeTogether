import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '@/theme';
import type { MapHelpOffer } from '@/shared/demo';

export function HelpOfferMapPopup({ offer, onClose }: { offer: MapHelpOffer; onClose: () => void }) {
  return (
    <View style={styles.popup}>
      <View style={styles.copy}>
        <Text style={styles.title}>{offer.title}</Text>
        <Text style={styles.meta}>{offer.author} · {offer.distance}</Text>
        {!!offer.description && <Text style={styles.description}>{offer.description}</Text>}
      </View>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close offer details" hitSlop={8}>
        <Text style={styles.close}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  popup: { position: 'absolute', zIndex: 1500, top: 58, left: 12, right: 62, flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, ...shadow },
  copy: { flex: 1, gap: 3 },
  title: { color: colors.text, fontSize: 15, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  description: { color: colors.text, fontSize: 13, marginTop: 4 },
  close: { color: colors.textMuted, fontSize: 23, lineHeight: 24, paddingHorizontal: 3 },
});
