import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, SlideInUp, SlideOutUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import mock from '@/data/mock.json';
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

export function NeedHelpButton({ active, onPress }: { active: boolean; onPress: () => void }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: active ? 900 : 1600, easing: Easing.out(Easing.quad) }), -1));
  }, [t, active]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - t.value), transform: [{ scale: 1 + t.value * 0.7 }] }));

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Need help">
      <View style={styles.sosWrap}>
        <Animated.View style={[styles.sosRing, ring]} />
        <View style={[styles.sos, active && { backgroundColor: colors.redDark }]}>
          <Text style={styles.sosText}>NEED</Text>
          <Text style={styles.sosSub}>HELP</Text>
        </View>
      </View>
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
      <Text style={styles.demoLabel}>PRESENTER PANEL</Text>
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
          on={app.offline}
          onPress={() => {
            app.setOffline(!app.offline);
            if (!app.offline) setTimeout(() => router.navigate('/mesh'), 700);
          }}
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

export function P2PNotification() {
  const app = useApp();
  if (!app.notification) return null;
  const b = mock.basement;
  return (
    <Animated.View entering={SlideInUp.springify().damping(16)} exiting={SlideOutUp} style={styles.notif}>
      <View style={styles.notifHead}>
        <View style={styles.notifIcon}>
          <Ionicons name="radio" size={16} color="#fff" />
        </View>
        <Text style={styles.notifMeta}>
          P2P MESSAGE · VIA MESH · {b.author}, {b.street}
        </Text>
      </View>
      <Text style={styles.notifTitle}>“{b.message}”</Text>
      <Text style={styles.notifBody}>{b.details}</Text>
      <View style={styles.notifRow}>
        <View style={{ flex: 1 }}>
          <Button
            icon="navigate"
            label="Show route"
            color={colors.green}
            onPress={() => {
              app.setRoute('basement');
              app.dismissNotification();
              router.navigate('/');
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Later" color={colors.textMuted} outline onPress={app.dismissNotification} />
        </View>
      </View>
    </Animated.View>
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
  sosWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  sosRing: { position: 'absolute', width: 84, height: 84, borderRadius: 42, backgroundColor: colors.red },
  sos: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    ...shadow,
  },
  sosText: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  sosSub: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: -2 },
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
  demo: { backgroundColor: '#1D2939', paddingVertical: 8, paddingHorizontal: 12, gap: 6, alignItems: 'center' },
  demoLabel: { color: '#98A2B3', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
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
  notif: {
    position: 'absolute',
    top: 38,
    left: 10,
    right: 10,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderLeftWidth: 5,
    borderLeftColor: colors.orange,
    padding: 14,
    gap: 6,
    zIndex: 100,
    ...shadow,
    shadowOpacity: 0.25,
  },
  notifHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.mesh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifMeta: { flex: 1, fontSize: 10, fontWeight: '800', color: colors.mesh, letterSpacing: 0.5 },
  notifTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  notifBody: { fontSize: 13, color: colors.textMuted },
  notifRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
