import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api, type ApiUser } from '@/services/api';
import { colors, radius } from '@/theme';

export default function AccountScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.me().then((result) => setUser(result.user)).catch(() => {});
  }, []);

  async function submit() {
    setLoading(true);
    setMessage('');
    try {
      const session = mode === 'register'
        ? await api.register({ name, email, password })
        : await api.login({ email, password });
      setUser(session.user);
      router.replace('/(tabs)');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not connect to your account.');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await api.logout();
    setUser(null);
    setMessage('You are signed out.');
  }

  return (
    <View style={styles.page}>
      <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={styles.back}>‹ Back to map</Text></Pressable>
      <Text style={styles.title}>SafeTogether account</Text>
      <Text style={styles.subtitle}>Sign in to sync reports, map layers, and help requests with the server.</Text>
      {user ? (
        <View style={styles.card}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.subtitle}>{user.role === 'authority' ? 'Authority account' : 'Resident account'}</Text>
          <Pressable style={styles.secondary} onPress={() => void logout()}><Text style={styles.secondaryText}>Sign out</Text></Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.tabs}>
            <Pressable onPress={() => setMode('login')} style={[styles.tab, mode === 'login' && styles.activeTab]}><Text style={styles.tabText}>Sign in</Text></Pressable>
            <Pressable onPress={() => setMode('register')} style={[styles.tab, mode === 'register' && styles.activeTab]}><Text style={styles.tabText}>Create account</Text></Pressable>
          </View>
          {mode === 'register' && <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={colors.textDim} autoCapitalize="words" style={styles.input} />}
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.textDim} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
          <TextInput value={password} onChangeText={setPassword} placeholder={mode === 'register' ? 'Password (10+ characters)' : 'Password'} placeholderTextColor={colors.textDim} secureTextEntry style={styles.input} />
          {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
          <Pressable disabled={loading || !email || !password || (mode === 'register' && !name)} onPress={() => void submit()} style={[styles.primary, (loading || !email || !password || (mode === 'register' && !name)) && styles.disabled]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{mode === 'register' ? 'Create account' : 'Sign in'}</Text>}
          </Pressable>
          <Text style={styles.note}>Authority accounts are provisioned by the server operator.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 22, paddingTop: 26, backgroundColor: colors.bg },
  back: { color: colors.blue, fontSize: 16, fontWeight: '700', marginBottom: 28 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  card: { padding: 18, marginTop: 22, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: 12 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tab: { flex: 1, padding: 11, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.bg },
  activeTab: { backgroundColor: colors.blueSoft },
  tabText: { color: colors.text, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 13, color: colors.text, backgroundColor: colors.bg },
  primary: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.blue },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  message: { color: colors.red, lineHeight: 20 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  name: { color: colors.text, fontWeight: '800', fontSize: 20 },
  secondary: { marginTop: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center' },
  secondaryText: { color: colors.text, fontWeight: '700' },
});
