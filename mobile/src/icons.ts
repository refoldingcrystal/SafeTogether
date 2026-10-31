import type { Ionicons } from '@expo/vector-icons';
import type { IncidentCategory, VerificationStatus } from '@/shared/models';
import { colors } from '@/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export const categoryIcons: Record<string, IconName> = {
  Injured: 'medkit',
  Stranded: 'car',
  Lost: 'search',
  'Other personal assistance': 'hand-left',
  'Medical emergency': 'medkit',
  Fire: 'flame',
  Flooding: 'water',
  'Trapped person': 'person',
  'Missing person': 'search',
  'Road blockage': 'car',
  'Infrastructure damage': 'construct',
  Other: 'ellipsis-horizontal',
  Shelter: 'home',
  'Food and water': 'restaurant',
  Transport: 'bus',
  'Qualified first aid': 'medkit',
  Supplies: 'cube',
  'Other practical help': 'hand-left',
};

export const incidentColors: Record<string, string> = {
  Injured: colors.red,
  Stranded: colors.orange,
  Lost: colors.blue,
  'Other personal assistance': colors.blue,
  Fire: colors.red,
  'Medical emergency': colors.red,
  Flooding: colors.mesh,
  'Road blockage': colors.orange,
  'Infrastructure damage': colors.violet,
};

export const verificationMeta: Record<VerificationStatus, { label: string; color: string; bg: string; icon: IconName }> = {
  verified: { label: 'Verified', color: colors.green, bg: colors.greenSoft, icon: 'checkmark-circle' },
  unverified: { label: 'Unverified', color: colors.red, bg: colors.redSoft, icon: 'alert-circle' },
  rejected: { label: 'Rejected', color: colors.textMuted, bg: colors.bg, icon: 'close-circle' },
};

export const guideIcons: Record<string, { icon: IconName; color: string }> = {
  fire: { icon: 'flame', color: colors.red },
  flood: { icon: 'water', color: colors.mesh },
  weather: { icon: 'thunderstorm', color: colors.violet },
  'first-aid': { icon: 'medkit', color: colors.green },
  preparedness: { icon: 'bag-handle', color: colors.orange },
};

export const incidentGuide: Partial<Record<IncidentCategory, string>> = {
  Injured: 'first-aid',
  'Other personal assistance': 'first-aid',
  Fire: 'fire',
  Flooding: 'flood',
  'Medical emergency': 'first-aid',
  'Trapped person': 'first-aid',
};
