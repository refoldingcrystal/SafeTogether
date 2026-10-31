import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import type { IconName } from '@/icons';
import { useApp } from '@/state/app';
import { colors, radius, shared } from '@/theme';

/** Mesh packets must stay small, so free text is capped. */
const MAX_TEXT = 140;

type FormKind = 'shelter' | 'need' | 'danger' | 'family';
const NEEDS: { label: string; icon: IconName }[] = [
  { label: 'Water', icon: 'water' },
  { label: 'Medical', icon: 'medkit' },
  { label: 'Food', icon: 'restaurant' },
  { label: 'Transport', icon: 'bus' },
];

const ACTIONS: { id: 'sos' | 'safe' | FormKind; icon: IconName; label: string; color: string }[] = [
  { id: 'sos', icon: 'alert-circle', label: 'SOS', color: colors.red },
  { id: 'safe', icon: 'shield-checkmark', label: 'I’m safe', color: colors.green },
  { id: 'shelter', icon: 'home', label: 'Shelter', color: colors.blue },
  { id: 'need', icon: 'hand-left', label: 'Need help', color: colors.orange },
  { id: 'danger', icon: 'warning', label: 'Danger', color: colors.redDark },
  { id: 'family', icon: 'chatbubble-ellipses', label: 'Family', color: colors.violet },
];

const PLACEHOLDER: Record<FormKind, string> = {
  shelter: 'Where? (optional)',
  need: 'Details (optional)',
  danger: 'What and where?',
  family: 'Your message',
};

export function MeshCompose() {
  const app = useApp();
  const [form, setForm] = useState<FormKind | null>(null);
  const [text, setText] = useState('');
  const [people, setPeople] = useState('');
  const [need, setNeed] = useState('');

  const open = (kind: FormKind) => {
    setForm(form === kind ? null : kind);
    setText('');
    setPeople('');
    setNeed('');
  };

  const press = (id: (typeof ACTIONS)[number]['id']) => {
    setForm(null);
    if (id === 'sos') app.setSos(true);
    else if (id === 'safe') {
      // An SOS that already left this phone gets an "I'm safe" follow-up from setSos itself.
      const sosPassedOn = app.queue.some((q) => q.kind === 'sos' && q.status === 'relayed');
      const sosOnPhone = app.queue.some((q) => q.kind === 'sos' && q.status === 'queued');
      if (app.sos) app.setSos(false);
      if (!sosPassedOn && !sosOnPhone) app.enqueue('safe', 'I’m safe');
    } else open(id);
  };

  const note = text.trim();
  const valid =
    form === 'shelter' ? Number(people) > 0 : form === 'need' ? need !== '' : note.length >= 3;

  const send = () => {
    if (!form || !valid) return;
    const suffix = note ? ` · ${note}` : '';
    const label =
      form === 'shelter'
        ? `Shelter for ${Number(people)}${suffix}`
        : form === 'need'
          ? `Need ${need.toLowerCase()}${suffix}`
          : form === 'danger'
            ? `Danger · ${note}`
            : `To family · ${note}`;
    app.enqueue(form, label);
    setForm(null);
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.grid}>
        {ACTIONS.map((a) => {
          const disabled = a.id === 'sos' && app.sos;
          const selected = form === a.id;
          return (
            <Pressable
              key={a.id}
              onPress={() => press(a.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected }}
              style={({ pressed }) => [
                styles.action,
                { borderColor: selected ? a.color : colors.border },
                (pressed || disabled) && { opacity: disabled ? 0.45 : 0.75 },
              ]}
            >
              <Ionicons name={a.icon} size={26} color={a.color} />
              <Text style={styles.actionText}>{disabled ? 'SOS on' : a.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {form && (
        <View style={styles.form}>
          {form === 'shelter' && (
            <TextInput
              style={shared.input}
              value={people}
              onChangeText={setPeople}
              keyboardType="number-pad"
              placeholder="How many people?"
              placeholderTextColor={colors.textDim}
              accessibilityLabel="How many people can you take"
            />
          )}
          {form === 'need' && (
            <View style={styles.chips}>
              {NEEDS.map((n) => {
                const on = need === n.label;
                return (
                  <Pressable
                    key={n.label}
                    onPress={() => setNeed(n.label)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && { backgroundColor: colors.orange, borderColor: colors.orange }]}
                  >
                    <Ionicons name={n.icon} size={16} color={on ? '#fff' : colors.textMuted} />
                    <Text style={[styles.chipText, on && { color: '#fff' }]}>{n.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <TextInput
            style={shared.input}
            value={text}
            onChangeText={setText}
            maxLength={MAX_TEXT}
            placeholder={PLACEHOLDER[form]}
            placeholderTextColor={colors.textDim}
            accessibilityLabel={PLACEHOLDER[form]}
          />
          <Button icon="paper-plane" label="Send" color={colors.mesh} disabled={!valid} onPress={send} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: {
    flexBasis: '30%',
    flexGrow: 1,
    height: 84,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
  },
  actionText: { fontSize: 14, fontWeight: '800', color: colors.text },
  form: { gap: 8, backgroundColor: colors.card, borderRadius: radius.lg, padding: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.text },
});
