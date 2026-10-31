import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import type { MeshMessage } from '@/state/app';
import { colors, radius } from '@/theme';

/** Bluetooth signal strength only gives a rough range, so we show bands rather than exact metres. */
function band(m: number) {
  if (m > 80) return { label: 'Far', bars: 1 };
  if (m > 40) return { label: 'Nearby', bars: 2 };
  if (m > 10) return { label: 'Close', bars: 3 };
  return { label: 'Very close', bars: 4 };
}

/** Simulated "hot / cold" finder: the other phone's signal gets stronger as you walk towards it. */
export function MeshFinder({ target, onStop }: { target: MeshMessage; onStop: () => void }) {
  const [metres, setMetres] = useState(() => parseInt(target.distance, 10) || 100);

  useEffect(() => {
    const t = setInterval(() => setMetres((m) => Math.max(2, Math.round(m * 0.7))), 1500);
    return () => clearInterval(t);
  }, []);

  const b = band(metres);
  return (
    <View style={styles.card} accessible accessibilityLiveRegion="polite" accessibilityLabel={`Finding ${target.title}. ${b.label}, about ${metres} metres`}>
      <Text style={styles.kicker}>FINDING</Text>
      <Text style={styles.title} numberOfLines={1}>
        {target.title}
      </Text>
      <View style={styles.row}>
        <View style={styles.bars}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.bar, { height: 8 + i * 8 }, i <= b.bars && { backgroundColor: colors.green }]} />
          ))}
        </View>
        <View>
          <Text style={styles.band}>{b.label}</Text>
          <Text style={styles.small}>~{metres} m · {target.direction}</Text>
        </View>
      </View>
      <Button label={b.bars === 4 ? 'Found them' : 'Stop'} color={b.bars === 4 ? colors.green : colors.textMuted} outline={b.bars < 4} onPress={onStop} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.greenSoft, borderRadius: radius.lg, padding: 12, gap: 8 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.green },
  title: { fontSize: 15, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  bar: { width: 10, borderRadius: 3, backgroundColor: colors.border },
  band: { fontSize: 22, fontWeight: '900', color: colors.text },
  small: { fontSize: 12, color: colors.textMuted },
});
