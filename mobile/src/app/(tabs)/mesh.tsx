import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { MeshRadar } from '@/components/MeshRadar';
import { Button, Card, Pill } from '@/components/ui';
import mock from '@/data/mock.json';
import { useApp } from '@/state/app';
import { colors } from '@/theme';

export default function MeshScreen() {
  const app = useApp();
  const { width } = useWindowDimensions();
  const size = Math.min(width, 430) - 64;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mesh network</Text>
          <Text style={styles.sub}>Phones relay your SOS – no internet needed</Text>
        </View>
        {app.offline ? (
          <Pill icon="bluetooth" label="Offline · Mesh" color={colors.mesh} bg={colors.meshSoft} />
        ) : (
          <Pill icon="globe-outline" label="Online" color={colors.green} bg={colors.greenSoft} />
        )}
      </View>

      {app.offline && (
        <Animated.View entering={FadeIn} style={styles.banner}>
          <Ionicons name="cloud-offline" size={18} color="#fff" />
          <Text style={styles.bannerText}>No internet – switched to the Mesh network (Bluetooth)</Text>
        </Animated.View>
      )}

      <Card style={{ alignItems: 'center' }}>
        <MeshRadar size={size} active={app.offline} step={app.meshStep} />
        {!app.offline && (
          <Text style={styles.idle}>Mesh on standby. If the internet goes down, your SOS travels through nearby phones.</Text>
        )}
      </Card>

      {app.offline ? (
        <Card>
          <Text style={styles.kicker}>SOS PACKET ROUTE</Text>
          {mock.meshChain.map((hop, i) => {
            const done = app.meshStep >= i;
            const last = i === mock.meshChain.length - 1;
            return (
              <View key={hop.name} style={styles.hop}>
                <View style={[styles.hopDot, done && { backgroundColor: last ? colors.green : colors.mesh }]}>
                  <Ionicons name={done ? (last ? 'checkmark' : 'arrow-down') : 'ellipse-outline'} size={14} color={done ? '#fff' : colors.textDim} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hopName, !done && { color: colors.textDim }]}>{hop.name}</Text>
                  <Text style={styles.hopDetail}>{done ? hop.detail : 'waiting…'}</Text>
                </View>
              </View>
            );
          })}
          <View style={styles.secure}>
            <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
            <Text style={styles.secureText}>End-to-end encrypted · relays cannot read the content</Text>
          </View>
        </Card>
      ) : (
        <Button icon="airplane" label="Simulate internet outage" color={colors.mesh} onPress={() => app.setOffline(true)} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.mesh,
    borderRadius: 12,
    padding: 12,
  },
  bannerText: { color: '#fff', fontWeight: '700', fontSize: 13, flex: 1 },
  idle: { textAlign: 'center', color: colors.textMuted, fontSize: 13 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.textDim },
  hop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hopDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hopName: { fontSize: 14, fontWeight: '700', color: colors.text },
  hopDetail: { fontSize: 12, color: colors.textMuted },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  secureText: { fontSize: 12, color: colors.textMuted },
});
