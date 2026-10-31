import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '@/theme';
import type { MapPlaceItem } from '@/shared/mapPlaces';

const kindLabel = { incident: 'REPORT', danger: 'DANGER', site: 'SAFE POINT', offer: 'OFFER' } as const;

export function MapPlaceChooser({ items, onChoose, onClose }: {
  items: MapPlaceItem[];
  onChoose: (item: MapPlaceItem) => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.popup} accessibilityLabel="Choose a map item">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Several things are in this area</Text>
          <Text style={styles.subtitle}>Choose one to view details.</Text>
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>
      {items.map((item) => (
        <Pressable key={item.key} onPress={() => onChoose(item)} style={styles.choice} accessibilityRole="button">
          <Text style={styles.kind}>{kindLabel[item.kind]}</Text>
          <Text style={styles.choiceTitle} numberOfLines={2}>{item.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  popup: { position: 'absolute', zIndex: 1500, top: 58, left: 12, right: 62, gap: 7, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, ...shadow },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingBottom: 3 },
  title: { color: colors.text, fontSize: 14, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  close: { color: colors.textMuted, fontSize: 23, lineHeight: 24, paddingHorizontal: 3 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 9 },
  kind: { minWidth: 60, color: colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  choiceTitle: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' },
});
