import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Pill } from '@/components/ui';
import mock from '@/data/mock.json';
import { useApp } from '@/state/app';
import { colors } from '@/theme';

export default function HelpScreen() {
  const app = useApp();
  const b = mock.basement;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>Help nearby</Text>
        <Text style={styles.sub}>Offers and requests from neighbours</Text>
      </View>

      <Button icon="hand-left" label="Offer help" color={colors.green} onPress={() => router.push('/offer')} />

      {app.p2pReceived && (
        <Animated.View entering={FadeInDown}>
          <Card style={{ borderWidth: 2, borderColor: colors.orange }}>
            <View style={styles.row}>
              <Pill icon="radio" label="NEW · P2P via Mesh" color={colors.mesh} bg={colors.meshSoft} />
              <Text style={styles.meta}>{b.distance}</Text>
            </View>
            <Text style={styles.cardTitle}>“{b.message}”</Text>
            <Text style={styles.body}>{b.details}</Text>
            <Text style={styles.meta}>
              {b.author} · {b.street}
            </Text>
            <Button
              icon="navigate"
              label="Navigate (avoids shelling zone)"
              color={colors.green}
              onPress={() => {
                app.setRoute('basement');
                router.navigate('/');
              }}
            />
          </Card>
        </Animated.View>
      )}

      {mock.helpFeed.map((item, i) => (
        <HelpItem key={item.id} item={item} index={i} />
      ))}
    </ScrollView>
  );
}

function HelpItem({ item, index }: { item: (typeof mock.helpFeed)[number]; index: number }) {
  const [done, setDone] = useState(false);
  const offer = item.type === 'offer';
  const color = offer ? colors.green : colors.red;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80)}>
      <Card>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: offer ? colors.greenSoft : colors.redSoft }]}>
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.type, { color }]}>{offer ? 'OFFERING' : 'NEEDED'}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.author} · {item.distance}
            </Text>
          </View>
        </View>
        <View style={styles.tags}>
          {item.tags.map((t) => (
            <Text key={t} style={styles.tag}>
              {t}
            </Text>
          ))}
        </View>
        <Button
          icon={done ? 'checkmark-circle' : offer ? 'navigate' : 'hand-left'}
          label={done ? 'Response sent' : offer ? 'I need this' : 'I can help'}
          color={done ? colors.green : color}
          outline={!done}
          onPress={() => setDone(true)}
        />
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  icon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  type: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  body: { fontSize: 13, color: colors.textMuted },
  meta: { fontSize: 12, color: colors.textMuted },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
