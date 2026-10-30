import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

export function ChoiceGrid({ choices, value, onChange }: { choices: string[]; value: string; onChange: (choice: string) => void }) {
  return <View style={styles.grid}>{choices.map((choice) => <Pressable key={choice} onPress={() => onChange(choice)} style={[styles.choice, value === choice && styles.selected]} accessibilityRole="radio" accessibilityState={{ selected: value === choice }}><Text style={[styles.label, value === choice && styles.selectedLabel]}>{choice}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, flexGrow: 1, flexBasis: '46%' },
  selected: { borderColor: colors.blue, borderWidth: 2, backgroundColor: colors.paleBlue },
  label: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  selectedLabel: { color: colors.blue },
});
