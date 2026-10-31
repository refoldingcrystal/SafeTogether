import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Need help" style={({ pressed }) => [styles.needHelpButton, pressed && { opacity: 0.8 }]}>
      <Text style={styles.needHelpTitle}>Need help</Text>
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

/** Presenter controls, rendered outside the phone frame. */
export function DemoBar() {
  const app = useApp();
  return (
    <View style={styles.demo}>
      <View style={styles.demoRow}>
        <DemoToggle
          icon="flame"
          label="Shelling"
          on={app.shelling}
          onPress={() => {
            app.setShelling(!app.shelling);
            router.navigate('/');
          }}
        />
        <DemoToggle
          icon="airplane"
          label="Airplane mode"
          on={app.offlineSource === 'demo'}
          onPress={() => app.setOffline(app.offlineSource !== 'demo')}
        />
        <DemoToggle
          icon="refresh"
          label="Reset"
          on={false}
          onPress={() => {
            app.reset();
            router.navigate('/');
          }}
        />
      </View>
    </View>
  );
}

function DemoToggle({ icon, label, on, onPress }: { icon: IconName; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.demoBtn, on && styles.demoBtnOn]}>
      <Ionicons name={icon} size={14} color={on ? '#101828' : '#fff'} />
      <Text style={[styles.demoBtnText, on && { color: '#101828' }]}>{label}</Text>
    </Pressable>
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
  needHelpButton: { alignItems: 'center', justifyContent: 'center', minWidth: 176, backgroundColor: colors.blue, paddingHorizontal: 24, paddingVertical: 16, borderRadius: radius.lg, ...shadow },
  needHelpTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
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
  demo: { backgroundColor: '#1D2939', paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  demoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#344054',
  },
  demoBtnOn: { backgroundColor: '#FDB022' },
  demoBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
