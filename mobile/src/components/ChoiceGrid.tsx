import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoryIcons } from '@/icons';
import { colors, radius } from '@/theme';

export function ChoiceGrid<T extends string>({
  choices,
  value,
  onChange,
  accent = colors.blue,
}: {
  choices: T[];
  value: T | '';
  onChange: (choice: T) => void;
  accent?: string;
}) {
  return (
    <View style={styles.grid}>
      {choices.map((choice) => {
        const selected = value === choice;
        return (
          <Pressable
            key={choice}
            onPress={() => onChange(choice)}
            style={[styles.choice, selected && { borderColor: accent, backgroundColor: `${accent}12` }]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <View style={[styles.icon, { backgroundColor: selected ? accent : colors.bg }]}>
              <Ionicons name={categoryIcons[choice] ?? 'ellipse'} size={16} color={selected ? '#fff' : colors.textMuted} />
            </View>
            <Text style={[styles.label, selected && { color: accent }]}>{choice}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, minHeight: 52, paddingHorizontal: 10, flexGrow: 1, flexBasis: '46%' },
  icon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 13 },
});
