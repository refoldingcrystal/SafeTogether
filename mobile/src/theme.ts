import { StyleSheet } from 'react-native';

export const colors = {
  navy: '#102B3F',
  ink: '#193245',
  muted: '#627887',
  border: '#DCE5E9',
  surface: '#FFFFFF',
  background: '#F5F7F8',
  blue: '#246B88',
  paleBlue: '#EAF3F6',
  red: '#A84036',
  paleRed: '#FFF0ED',
  amber: '#8A5A11',
  paleAmber: '#FFF7E7',
  green: '#347254',
  paleGreen: '#E8F4EC',
};

export const shared = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 34, gap: 16 },
  eyebrow: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: colors.navy, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { color: colors.navy, fontSize: 17, fontWeight: '800' },
  body: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  notice: { backgroundColor: colors.paleAmber, borderColor: '#F0E2BD', borderWidth: 1, borderRadius: 12, padding: 14, color: colors.amber, fontSize: 13, lineHeight: 19 },
  primaryButton: { backgroundColor: colors.navy, minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  urgentButton: { backgroundColor: colors.red },
  primaryButtonText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  secondaryButton: { backgroundColor: colors.surface, minHeight: 44, borderColor: colors.border, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  secondaryButtonText: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#CBD8DE', borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 13, paddingVertical: 11, fontSize: 15 },
});
