import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verificationMeta, type IconName } from '@/icons';
import type { VerificationStatus } from '@/shared/models';
import { useApp } from '@/state/app';
import { colors, radius, shadow } from '@/theme';

export function StatusBadge({ status }: { status: VerificationStatus }) {
  const meta = verificationMeta[status];
  return <Pill icon={meta.icon} label={meta.label} color={meta.color} bg={meta.bg} />;
}

export function Pill({ icon, label, color, bg }: { icon: IconName; label: string; color: string; bg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function Button({
  icon,
  label,
  color = colors.red,
  outline,
  disabled,
  onPress,
}: {
  icon?: IconName;
  label: string;
  color?: string;
  outline?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        outline ? { borderColor: color, borderWidth: 1.5 } : { backgroundColor: color },
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.8 },
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={outline ? color : '#fff'} />}
      <Text style={[styles.buttonText, { color: outline ? color : '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function NeedHelpButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Help me!" style={({ pressed }) => [styles.needHelpButton, pressed && { opacity: 0.8 }]}>
      <Text style={styles.needHelpTitle}>Help{'\n'}me!</Text>
    </Pressable>
  );
}

/** Fake phone status bar – shows the airplane icon when the demo goes offline. */
export function PhoneStatusBar() {
  const { offline } = useApp();
  return (
    <View style={styles.status}>
      <Text style={styles.statusTime}>22:41</Text>
      <View style={styles.statusIcons}>
        {offline ? (
          <Ionicons name="airplane" size={14} color={colors.text} />
        ) : (
          <>
            <Ionicons name="cellular" size={13} color={colors.text} />
            <Ionicons name="wifi" size={14} color={colors.text} />
          </>
        )}
        <Ionicons name="battery-half" size={18} color={colors.text} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  button: {
    height: 46,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  buttonText: { fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 10, ...shadow },
  needHelpButton: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.red, borderRadius: 9, ...shadow },
  needHelpTitle: { color: '#fff', fontSize: 12, lineHeight: 15, fontWeight: '900', textAlign: 'center' },
  status: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    backgroundColor: colors.card,
  },
  statusTime: { fontWeight: '700', fontSize: 14, color: colors.text },
  statusIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
