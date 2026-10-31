import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Location from 'expo-location';
import { ChoiceGrid } from '@/components/ChoiceGrid';
import { Screen } from '@/components/Screen';
import { Button, Card, Pill } from '@/components/ui';
import { incidentCategories } from '@/shared/demo';
import type { IncidentCategory } from '@/shared/models';
import { useApp } from '@/state/app';
import { colors, shared } from '@/theme';

type SubmissionState = 'idle' | 'submitting' | 'failed';
type LocationState = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable';

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
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { category, description, location } = app.reportDraft;
  const rule = category ? rules[category] : null;
  const hasDescription = description.trim().length > 0;
  const descriptionValid = !hasDescription || Boolean(rule && description.trim().length >= rule.minDescription);
  const valid = category !== '' && descriptionValid;

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

  async function useCurrentLocation() {
    if (locationState === 'locating') return;

    setLocationState('locating');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationState('denied');
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = current.coords.latitude.toFixed(2);
      const longitude = current.coords.longitude.toFixed(2);
      app.updateReportDraft({ location: `Current location (approx. ${latitude}, ${longitude})` });
      setLocationState('ready');
    } catch {
      setLocationState('unavailable');
    }
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
      <Text style={shared.subtitle}>Choose a category to submit a demonstration report. Add safe, approximate details if you can; do not include names, private contacts, or a home address.</Text>
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
        {attempted && hasDescription && !descriptionValid && <Text style={styles.error}>{rule ? `Use at least ${rule.minDescription} characters, or clear this optional field to submit without details.` : 'Choose a category first.'}</Text>}
      </Card>

      <Card>
        <Text style={shared.kicker}>APPROXIMATE LOCATION</Text>
        <TextInput value={location} onChangeText={(value) => app.updateReportDraft({ location: value })} placeholder="Neighbourhood or nearby landmark" placeholderTextColor={colors.textDim} style={shared.input} accessibilityLabel="Approximate location" />
        <Button icon="locate" label={locationState === 'locating' ? 'Finding your location…' : 'Use my current location'} color={colors.blue} outline disabled={locationState === 'locating'} onPress={useCurrentLocation} />
        <Pill icon="lock-closed" label="Your exact address is never public" color={colors.blue} bg={colors.blueSoft} />
        <Text style={shared.muted}>We ask only while you use this button and round the result before placing it in this demonstration report.</Text>
        {locationState === 'ready' && <Text style={styles.locationSuccess}>Approximate current location added. You can edit it before submitting.</Text>}
        {locationState === 'denied' && <Text style={styles.error}>Location permission was not granted. You can still submit without it or enter an approximate landmark.</Text>}
        {locationState === 'unavailable' && <Text style={styles.error}>Current location is unavailable. You can still submit without it or enter an approximate landmark.</Text>}
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
  locationSuccess: { color: colors.green, fontSize: 12, fontWeight: '700', lineHeight: 17 },
});
