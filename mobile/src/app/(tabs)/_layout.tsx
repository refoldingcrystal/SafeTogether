import { Tabs } from 'expo-router';
import { colors } from '@/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.blue, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 11, fontWeight: '700' }, tabBarStyle: { borderTopColor: colors.border, height: 66, paddingTop: 6 } }}>
      <Tabs.Screen name="index" options={{ title: 'Map' }} />
      <Tabs.Screen name="report" options={{ title: 'Report' }} />
      <Tabs.Screen name="offer" options={{ title: 'Offer Help' }} />
      <Tabs.Screen name="guides" options={{ title: 'Guides' }} />
    </Tabs>
  );
}
