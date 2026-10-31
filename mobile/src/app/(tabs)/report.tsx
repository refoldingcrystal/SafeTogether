import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChoiceGrid } from '@/components/ChoiceGrid';
import { Screen } from '@/components/Screen';
import { Button, Card, Pill } from '@/components/ui';
import { incidentCategories } from '@/shared/demo';
import type { IncidentCategory } from '@/shared/models';
import { useApp } from '@/state/app';
import { colors, shared } from '@/theme';

type SubmissionState = 'idle' | 'submitting' | 'failed';

const rules: Record<IncidentCategory, { minDescription: number; prompt: string }> = {
  'Medical emergency': { minDescription: 15, prompt: 'Include the person’s condition and what help is needed. Do not include their name.' },
  Fire: { minDescription: 12, prompt: 'Include what is burning or visible, and whether people can leave safely.' },
  Flooding: { minDescription: 12, prompt: 'Include water depth or access conditions if you can observe them safely.' },
  'Trapped person': { minDescription: 15, prompt: 'Include the likely location and any safe details about access or hazards.' },
  'Missing person': { minDescription: 20, prompt: 'Include a description and last known public place. Do not include a name or private contact details.' },
  'Road blockage': { minDescription: 10, prompt: 'Include the nearest landmark, direction of travel, and whether the route is blocked.' },
  'Infrastructure damage': { minDescription: 12, prompt: 'Include the type of damage and any visible danger, such as fallen lines or a gas smell.' },
  Other: { minDescription: 15, prompt: 'Include what happened, what is unsafe, and the nearest public landmark.' },
};

export default function ReportScreen() {
  const app = useApp();
  const [attempted, setAttempted] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { category, description, location } = app.reportDraft;
  const rule = category ? rules[category] : null;
  const descriptionValid = Boolean(rule && description.trim().length >= rule.minDescription);
  const locationValid = location.trim().length >= 3;
  const valid = category !== '' && descriptionValid && locationValid;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function reset() {
    setAttempted(false);
    setSubmission('idle');
    app.clearReportDraft();
    app.setReportReceipt(null);
  }

  function submit() {
    setAttempted(true);
    if (!valid || submission === 'submitting') return;

    setSubmission('submitting');
    timer.current = setTimeout(() => {
      try {
        app.setReportReceipt({ reference: `ST-${Math.floor(3000 + Math.random() * 6000)}`, queued: app.offline });
        app.clearReportDraft();
        setSubmission('idle');
      } catch {
        // Keep the draft unchanged so a future API failure can be retried safely.
        setSubmission('failed');
      }
    }, 650);
  }

  if (app.reportReceipt) {
    return (
      <Screen>
        <Animated.View entering={FadeInDown}>
          <Card style={{ borderWidth: 2, borderColor: colors.green }}>
            {app.reportReceipt.queued ? (
              <Pill icon="time" label="Queued on this device" color={colors.mesh} bg={colors.meshSoft} />
            ) : (
              <Pill icon="checkmark-circle" label="Saved on this device" color={colors.green} bg={colors.greenSoft} />
            )}
            <Text style={shared.title}>Thank you for reporting</Text>
            <Text style={shared.cardTitle}>Reference {app.reportReceipt.reference}</Text>
            <Text style={shared.body}>
              {app.reportReceipt.queued
                ? 'This demonstration report is queued on this device. It has not been sent through a mesh network, to authorities, or to emergency services.'
                : 'This demonstration report was saved on this device only. It has not been sent to authorities or emergency services.'}
            </Text>
          </Card>
        </Animated.View>
        <Text style={shared.notice}>If anyone is in immediate danger, call your local emergency number now. Do not wait for an in-app report.</Text>
        <Button icon="add" label="Submit another report" color={colors.text} onPress={reset} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={shared.title}>Report an emergency</Text>
      <Text style={shared.subtitle}>Share clear, approximate information. Do not include names, private contacts, or a home address.</Text>
      <Text style={shared.notice}>If anyone is in immediate danger, call your local emergency number now. This demonstration does not contact emergency services.</Text>

      <Card>
        <Text style={shared.kicker}>INCIDENT CATEGORY</Text>
        <ChoiceGrid choices={incidentCategories} value={category} onChange={(value) => app.updateReportDraft({ category: value })} accent={colors.red} />
        {attempted && !category && <Text style={styles.error}>Choose the incident category.</Text>}
      </Card>

      <Card>
        <Text style={shared.kicker}>WHAT IS HAPPENING?</Text>
        <TextInput
          value={description}
          onChangeText={(value) => app.updateReportDraft({ description: value })}
          multiline
          maxLength={400}
          placeholder="Describe what you can see"
          placeholderTextColor={colors.textDim}
          style={[shared.input, { minHeight: 110, textAlignVertical: 'top' }]}
          accessibilityLabel="What is happening?"
        />
        <View style={styles.fieldMeta}>
          <Text style={shared.muted}>{rule?.prompt ?? 'Choose a category for guidance on the useful details to include.'}</Text>
          <Text style={shared.muted}>{description.length}/400</Text>
        </View>
        {attempted && !descriptionValid && <Text style={styles.error}>{rule ? `Add at least ${rule.minDescription} characters for this category.` : 'Choose a category first.'}</Text>}
      </Card>

      <Card>
        <Text style={shared.kicker}>APPROXIMATE LOCATION</Text>
        <TextInput value={location} onChangeText={(value) => app.updateReportDraft({ location: value })} placeholder="Neighbourhood or nearby landmark" placeholderTextColor={colors.textDim} style={shared.input} accessibilityLabel="Approximate location" />
        <Pill icon="lock-closed" label="Your exact address is never public" color={colors.blue} bg={colors.blueSoft} />
        {attempted && !locationValid && <Text style={styles.error}>Add a neighbourhood or nearby landmark (at least 3 characters).</Text>}
      </Card>

      {submission === 'failed' && (
        <Card style={{ borderWidth: 1, borderColor: colors.red }}>
          <Text style={shared.cardTitle}>Your report was not saved</Text>
          <Text style={shared.muted}>Your details are still here. Check your connection and retry when it is safe.</Text>
          <Button icon="refresh" label="Retry submission" onPress={submit} />
        </Card>
      )}

      <Button
        icon="send"
        label={submission === 'submitting' ? 'Saving report…' : app.offline ? 'Queue report on this device' : 'Save demonstration report'}
        color={colors.red}
        disabled={submission === 'submitting'}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fieldMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  error: { color: colors.redDark, fontSize: 12, fontWeight: '700', lineHeight: 17 },
});
