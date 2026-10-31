import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MeshCompose } from '@/components/MeshCompose';
import { MeshFinder } from '@/components/MeshFinder';
import mock from '@/data/mock.json';
import type { IconName } from '@/icons';
import { useApp, type MeshStatus, type Route } from '@/state/app';
import { colors, radius } from '@/theme';

const STATUS: Record<MeshStatus, { icon: IconName; title: string; note?: string; color: string; bg: string }> = {
  standby: { icon: 'globe-outline', title: 'Online', color: colors.green, bg: colors.greenSoft },
  discovering: { icon: 'search', title: 'Offline · Searching nearby', color: colors.mesh, bg: colors.meshSoft },
  relaying: { icon: 'git-network-outline', title: 'Offline · Passed to nearby phones', color: colors.mesh, bg: colors.meshSoft },
};

const KIND_ICON: Record<string, { icon: IconName; color: string }> = {
  sos: { icon: 'alert-circle', color: colors.red },
  reply: { icon: 'heart', color: colors.green },
  official: { icon: 'megaphone', color: colors.blue },
  danger: { icon: 'warning', color: colors.red },
  shelter: { icon: 'home', color: colors.green },
  need: { icon: 'hand-left', color: colors.orange },
};

const ABOUT = [
  'Without internet, nearby phones pass your messages on over Bluetooth.',
  '“Passed on” means a nearby phone took a copy, not that help received it.',
  'Messages include your location so people nearby can find you. They are not encrypted yet.',
  'Close by, Bluetooth signal strength shows if you are getting closer.',
  'Bluetooth signals can show others that someone is nearby. Turn Bluetooth off in phone settings if that puts you at risk.',
];

export default function MeshScreen() {
  const app = useApp();
  const [about, setAbout] = useState(false);
  const status = STATUS[app.meshStatus];
  const searching = app.meshStatus === 'discovering' || app.meshStatus === 'relaying';
  const target = app.inbox.find((m) => m.id === app.helping);
  // People asking for help come first.
  const nearby = [...app.inbox].sort((a, b) => Number(b.kind === 'sos') - Number(a.kind === 'sos'));
  const familyNearby = mock.meshNearby.family
    .filter((f) => f.proximity)
    .map((f) => `${mock.family.find((p) => p.id === f.id)?.name}: ${f.proximity}`);

  // iOS screen readers don't pick up live regions, so announce changes explicitly.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(STATUS[app.meshStatus].title);
  }, [app.meshStatus]);

  const showOnMap = (route: Route) => {
    app.setRoute(route);
    router.navigate('/');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Offline
        </Text>
        <Pressable
          onPress={() => setAbout(!about)}
          accessibilityRole="button"
          accessibilityLabel="How offline messaging works"
          accessibilityState={{ expanded: about }}
          hitSlop={10}
        >
          <Ionicons name="information-circle-outline" size={26} color={colors.textMuted} />
        </Pressable>
      </View>

      <Text style={styles.small}>Send and receive messages through phones nearby.</Text>

      {about && (
        <View style={styles.section}>
          {ABOUT.map((line) => (
            <Text key={line} style={styles.small}>
              • {line}
            </Text>
          ))}
        </View>
      )}

      <View accessible accessibilityLiveRegion="polite" style={[styles.status, { backgroundColor: status.bg }]}>
        <Ionicons name={status.icon} size={20} color={status.color} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusTitle, { color: status.color }]}>{status.title}</Text>
          {status.note && <Text style={styles.small}>{status.note}</Text>}
        </View>
      </View>

      {target && <MeshFinder key={target.id} target={target} onStop={app.stopHelping} />}

      <MeshCompose />

      {app.queue.length > 0 && (
        <Section title="Outbox">
          {app.queue.map((q) => (
            <Row
              key={q.id}
              icon={q.status === 'queued' ? 'time-outline' : 'arrow-redo-outline'}
              color={q.status === 'queued' ? colors.orange : colors.mesh}
              title={q.label}
              meta={q.status === 'queued' ? 'Waiting · location added' : `Seen by ${q.seenBy} ${q.seenBy === 1 ? 'phone' : 'phones'}`}
            />
          ))}
          <Text style={styles.small}>Last sync: {app.lastSyncAt ? new Date(app.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'never'}</Text>
        </Section>
      )}

      {(app.inbox.length > 0 || searching) && (
        <Section title="Nearby">
          {searching && (
            <Text style={styles.small}>
              📡 {mock.meshNearby.phones} phones nearby{familyNearby.length ? ` · ${familyNearby.join(' · ')}` : ''}
            </Text>
          )}
          {nearby.map((m) => {
            const k = KIND_ICON[m.kind] ?? { icon: 'chatbubble', color: colors.textMuted };
            return (
              <Row
                key={m.id}
                icon={k.icon}
                color={k.color}
                title={m.title}
                meta={`${m.distance} · ${m.verified ? 'Verified' : 'Unverified'}`}
                verified={m.verified}
                onPress={m.route ? () => showOnMap(m.route as Route) : undefined}
                action={
                  m.kind === 'sos' || m.kind === 'need'
                    ? { label: app.helping === m.id ? 'Helping' : 'I can help', disabled: app.helping === m.id, onPress: () => app.respond(m) }
                    : undefined
                }
              />
            );
          })}
        </Section>
      )}

    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({
  icon,
  color,
  title,
  meta,
  verified,
  onPress,
  action,
}: {
  icon: IconName;
  color: string;
  title: string;
  meta: string;
  verified?: boolean;
  onPress?: () => void;
  action?: { label: string; disabled?: boolean; onPress: () => void };
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${title}. ${meta}${onPress ? '. Show on map' : ''}`}
        style={({ pressed }) => [styles.row, { flex: 1 }, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name={icon} size={20} color={color} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.small, verified && { color: colors.blue, fontWeight: '700' }]}>{meta}</Text>
        </View>
        {onPress && <Ionicons name="map-outline" size={18} color={colors.mesh} />}
      </Pressable>
      {action && (
        <Pressable
          onPress={action.onPress}
          disabled={action.disabled}
          accessibilityRole="button"
          style={[styles.help, action.disabled && { backgroundColor: colors.greenSoft }]}
        >
          <Text style={[styles.helpText, action.disabled && { color: colors.green }]}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 26, fontWeight: '900', color: colors.text },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, padding: 12 },
  statusTitle: { fontSize: 15, fontWeight: '800' },
  small: { fontSize: 12, color: colors.textMuted },
  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 12, gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.textDim },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  help: { backgroundColor: colors.green, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  helpText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
