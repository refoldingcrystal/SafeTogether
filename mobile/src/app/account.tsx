import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api, type ApiUser } from '@/services/api';
import { colors, radius } from '@/theme';

export default function AccountScreen() {
  const [loginId, setLoginId] = useState('');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.me().then((result) => setUser(result.user)).catch(() => {});
  }, []);

  async function signIn() {
    setLoading(true);
    setMessage('');
    try {
      const session = await api.login({ id: loginId.trim() });
      setUser(session.user);
      router.replace('/(tabs)');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign in. Check the ID and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await api.logout();
    setUser(null);
    setMessage('You are signed out.');
  }

  return (
    <View style={styles.page}>
      <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={styles.back}>‹ Back to map</Text></Pressable>
      <Text style={styles.title}>SafeTogether ID</Text>
      <Text style={styles.subtitle}>Enter your ID. If it is new, we will create your account.</Text>
      {user ? (
        <View style={styles.card}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.subtitle}>{user.role === 'authority' ? 'Authority account' : 'Signed in'}</Text>
          <Text style={styles.accountIdLabel}>Account ID · share this to connect (not for sign-in)</Text>
          <Text selectable style={styles.accountId}>{user.id}</Text>
          <Pressable style={styles.secondary} onPress={() => void signOut()}><Text style={styles.secondaryText}>Sign out</Text></Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <TextInput value={loginId} onChangeText={setLoginId} placeholder="Enter your ID" placeholderTextColor={colors.textDim} autoCapitalize="none" autoCorrect={false} style={styles.input} />
          {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
          <Pressable disabled={loading || !loginId.trim()} onPress={() => void signIn()} style={[styles.primary, (loading || !loginId.trim()) && styles.disabled]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Sign in</Text>}
          </Pressable>
        </View>
      )}
      {user && message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
      <Text style={styles.note}>Use the same ID next time. Keep it private; anyone with it can access your account.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 22, paddingTop: 26, backgroundColor: colors.bg },
  back: { color: colors.blue, fontSize: 16, fontWeight: '700', marginBottom: 28 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  card: { padding: 18, marginTop: 22, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: 12 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 13, color: colors.text, backgroundColor: colors.bg },
  primary: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.blue },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  message: { color: colors.red, lineHeight: 20, marginTop: 10 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 14 },
  name: { color: colors.text, fontWeight: '800', fontSize: 20 },
  secondary: { padding: 12, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center' },
  secondaryText: { color: colors.text, fontWeight: '700' },
  accountIdLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  accountId: { color: colors.text, fontSize: 13, fontWeight: '700' },
});
