import type { Ionicons } from '@expo/vector-icons';
import type { IncidentCategory, VerificationStatus } from '@/shared/models';
import { colors } from '@/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export const categoryIcons: Record<string, IconName> = {
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
  Fire: colors.red,
  'Medical emergency': colors.red,
  Flooding: colors.mesh,
  'Road blockage': colors.orange,
  'Infrastructure damage': colors.violet,
};

export const verificationMeta: Record<VerificationStatus, { label: string; color: string; bg: string; icon: IconName }> = {
  verified: { label: 'Verified', color: colors.green, bg: colors.greenSoft, icon: 'checkmark-circle' },
  awaiting_review: { label: 'Awaiting review', color: colors.orange, bg: colors.orangeSoft, icon: 'time' },
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
  Fire: 'fire',
  Flooding: 'flood',
  'Medical emergency': 'first-aid',
  'Trapped person': 'first-aid',
};
