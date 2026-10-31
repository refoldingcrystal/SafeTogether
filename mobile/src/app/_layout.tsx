import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider } from '@/state/app';
import { DemoBar, PhoneStatusBar } from '@/components/ui';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style={Platform.OS === 'web' ? 'dark' : 'light'} />
        <SafeAreaView style={styles.page} edges={['top']}>
          <DemoBar />
          <View style={styles.phone}>
            {Platform.OS === 'web' && <PhoneStatusBar />}
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="account" />
              <Stack.Screen name="guide/[id]" />
            </Stack>
          </View>
        </SafeAreaView>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#D0D5DD' : '#1D2939' },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
});
