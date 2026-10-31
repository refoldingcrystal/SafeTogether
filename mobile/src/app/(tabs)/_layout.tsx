import { useEffect } from 'react';
import { router, usePathname } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from '@/icons';
import { useApp } from '@/state/app';
import { colors } from '@/theme';

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={String(color)} size={size} />;
  };
}

export default function TabLayout() {
  const { offline, meshStatus } = useApp();
  const pathname = usePathname();

  // Mesh is only needed without internet: bring it to the front when offline, leave it when back online.
  useEffect(() => {
    if (offline) router.navigate('/mesh');
    else if (pathname === '/mesh') router.navigate('/');
    // Only react to connectivity changes, not to every tab switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 62 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Map', tabBarIcon: tabIcon('map') }} />
      <Tabs.Screen
        name="mesh"
        options={{
          title: 'Offline',
          href: offline ? undefined : null,
          tabBarBadge: meshStatus === 'discovering' || meshStatus === 'relaying' ? 'ON' : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.mesh, fontSize: 9 },
          tabBarIcon: tabIcon('radio'),
        }}
      />
      <Tabs.Screen name="offerhelp" options={{ title: 'Help', tabBarIcon: tabIcon('people') }} />
      <Tabs.Screen name="guides" options={{ title: 'Guides', tabBarIcon: tabIcon('book') }} />
      <Tabs.Screen name="offer" options={{ href: null }} />
    </Tabs>
  );
}
