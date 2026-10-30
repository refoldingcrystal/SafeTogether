import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#F2F4F7',
  card: '#FFFFFF',
  border: '#E4E7EC',
  text: '#101828',
  textMuted: '#475467',
  textDim: '#98A2B3',

  red: '#D92D20',
  redDark: '#B42318',
  redSoft: '#FEE4E2',
  green: '#079455',
  greenSoft: '#DCFAE6',
  blue: '#1570EF',
  blueSoft: '#D1E9FF',
  orange: '#DC6803',
  orangeSoft: '#FEF0C7',
  violet: '#7A5AF8',
  mesh: '#0086C9',
  meshSoft: '#E0F2FE',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const shadow = {
  shadowColor: '#101828',
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
} as const;

export const shared = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.textDim },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  body: { fontSize: 14, lineHeight: 20, color: colors.text },
  muted: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  label: { fontSize: 14, fontWeight: '800', color: colors.text },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  notice: {
    backgroundColor: colors.orangeSoft,
    borderRadius: radius.md,
    padding: 12,
    color: colors.orange,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
});
