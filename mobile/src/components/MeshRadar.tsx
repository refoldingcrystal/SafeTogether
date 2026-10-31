import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ZoomIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type Node = { id: string; label: string; icon?: keyof typeof Ionicons.glyphMap; initials?: string; color: string; angle: number; d: number };

/** chain[0..2] are relays on the way to the rescuers; the rest are just nearby phones. */
const NODES: Node[] = [
  { id: 'neighbor', label: 'Neighbour · floor below', initials: 'N', color: '#7A5AF8', angle: 205, d: 0.32 },
  { id: 'marek', label: 'Mark', initials: 'M', color: '#DC6803', angle: 250, d: 0.62 },
  { id: 'psp', label: 'Fire Service', icon: 'shield-checkmark', color: colors.red, angle: 292, d: 0.9 },
  { id: 'ania', label: 'Anna K.', initials: 'A', color: '#DD2590', angle: 60, d: 0.55 },
  { id: 'p5', label: 'Phone #7F2', initials: '?', color: '#667085', angle: 125, d: 0.8 },
];

export function MeshRadar({ size, active, step }: { size: number; active: boolean; step: number }) {
  const R = size / 2;
  const sweep = useSharedValue(0);
  const packet = useSharedValue(0);

  useEffect(() => {
    sweep.set(withRepeat(withTiming(360, { duration: 3500, easing: Easing.linear }), -1));
    packet.set(0);
    packet.set(withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1));
  }, [sweep, packet]);

  const pos = (n: Node) => {
    const a = (n.angle * Math.PI) / 180;
    const d = n.d * (R - 26);
    return { x: R + Math.sin(a) * d, y: R - Math.cos(a) * d };
  };
  const chain = [{ x: R, y: R }, pos(NODES[0]), pos(NODES[1]), pos(NODES[2])];

  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sweep.value}deg` }] }));
  const packetStyle = useAnimatedStyle(() => {
    const k = [0, 1 / 3, 2 / 3, 1];
    return {
      opacity: interpolate(packet.value, [0, 0.05, 0.95, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(packet.value, k, chain.map((c) => c.x)) - 11 },
        { translateY: interpolate(packet.value, k, chain.map((c) => c.y)) - 11 },
      ],
    };
  });

  return (
    <View style={{ width: size, height: size, opacity: active ? 1 : 0.45 }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={R} cy={R} r={R - 1} fill={colors.meshSoft} stroke={colors.mesh} strokeOpacity={0.4} />
        {[0.33, 0.66].map((f) => (
          <Circle key={f} cx={R} cy={R} r={R * f} fill="none" stroke={colors.mesh} strokeOpacity={0.25} strokeDasharray="4 5" />
        ))}
        {active &&
          chain.slice(1).map((c, i) => (
            <Line
              key={i}
              x1={chain[i].x}
              y1={chain[i].y}
              x2={c.x}
              y2={c.y}
              stroke={step > i ? colors.green : colors.mesh}
              strokeWidth={step > i ? 3 : 1.5}
              strokeDasharray={step > i ? undefined : '4 4'}
            />
          ))}
      </Svg>

      {active && (
        <Animated.View style={[StyleSheet.absoluteFill, sweepStyle]} pointerEvents="none">
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id="sw" x1="1" y1="0" x2="0" y2="0.6">
                <Stop offset="0" stopColor={colors.mesh} stopOpacity={0.35} />
                <Stop offset="1" stopColor={colors.mesh} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path
              d={`M ${R} ${R} L ${R} 0 A ${R} ${R} 0 0 0 ${R - Math.sin(0.8) * R} ${R - Math.cos(0.8) * R} Z`}
              fill="url(#sw)"
            />
          </Svg>
        </Animated.View>
      )}

      {active &&
        NODES.map((n, i) => {
          const p = pos(n);
          return (
            <Animated.View
              key={n.id}
              entering={ZoomIn.delay(300 + i * 250).springify()}
              style={[styles.node, { left: p.x - 70, top: p.y - 18 }]}
            >
              <View style={[styles.avatar, { backgroundColor: n.color }, i < 3 && step > i && styles.avatarDone]}>
                {n.icon ? (
                  <Ionicons name={n.icon} size={18} color="#fff" />
                ) : (
                  <Text style={styles.initials}>{n.initials}</Text>
                )}
              </View>
              <Text style={styles.label}>{n.label}</Text>
            </Animated.View>
          );
        })}

      {active && step < 3 && (
        <Animated.View style={[styles.packet, packetStyle]} pointerEvents="none">
          <Ionicons name="lock-closed" size={11} color="#fff" />
        </Animated.View>
      )}

      <View style={[styles.me, { left: R - 26, top: R - 26 }]}>
        <Ionicons name="phone-portrait" size={22} color="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  me: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.blue,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  node: { position: 'absolute', width: 140, alignItems: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarDone: { borderColor: colors.green },
  initials: { color: '#fff', fontWeight: '800', fontSize: 13 },
  label: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 5,
    borderRadius: 6,
    overflow: 'hidden',
  },
  packet: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
