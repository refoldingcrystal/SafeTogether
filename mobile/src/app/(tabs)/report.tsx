import { useState } from 'react';
import { Text, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChoiceGrid } from '@/components/ChoiceGrid';
import { Screen } from '@/components/Screen';
import { Button, Card, Pill } from '@/components/ui';
import { incidentCategories } from '@/shared/demo';
import type { IncidentCategory } from '@/shared/models';
import { useApp } from '@/state/app';
import { colors, shared } from '@/theme';

export default function ReportScreen() {
  const app = useApp();
  const [category, setCategory] = useState<IncidentCategory | ''>('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const valid = category !== '' && description.trim().length >= 5 && location.trim().length >= 2;

  function reset() {
    setSubmitted(null);
    setCategory('');
    setDescription('');
    setLocation('');
  }

  if (submitted) {
    return (
      <Screen>
        <Animated.View entering={FadeInDown}>
          <Card style={{ borderWidth: 2, borderColor: colors.green }}>
            {app.offline ? (
              <Pill icon="bluetooth" label="Queued · will be sent via Mesh" color={colors.mesh} bg={colors.meshSoft} />
            ) : (
              <Pill icon="checkmark-circle" label="Saved on this device" color={colors.green} bg={colors.greenSoft} />
            )}
            <Text style={shared.title}>Thank you for reporting</Text>
            <Text style={shared.cardTitle}>Reference {submitted}</Text>
            <Text style={shared.body}>This report is part of the demonstration. It has not been sent to authorities or emergency services.</Text>
          </Card>
        </Animated.View>
        <Text style={shared.notice}>In immediate danger, use the SOS button on the map or call 112.</Text>
        <Button icon="add" label="Submit another report" color={colors.text} onPress={reset} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={shared.title}>Report an emergency</Text>
      <Text style={shared.subtitle}>Share clear, approximate information. Do not include names, private contacts, or a home address.</Text>

      <Card>
        <Text style={shared.kicker}>INCIDENT CATEGORY</Text>
        <ChoiceGrid choices={incidentCategories} value={category} onChange={setCategory} accent={colors.red} />
      </Card>

      <Card>
        <Text style={shared.kicker}>WHAT IS HAPPENING?</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={400}
          placeholder="Describe what you can see"
          placeholderTextColor={colors.textDim}
          style={[shared.input, { minHeight: 110, textAlignVertical: 'top' }]}
        />
      </Card>

      <Card>
        <Text style={shared.kicker}>APPROXIMATE LOCATION</Text>
        <TextInput value={location} onChangeText={setLocation} placeholder="Neighbourhood or nearby landmark" placeholderTextColor={colors.textDim} style={shared.input} />
        <Pill icon="lock-closed" label="Your exact address is never public" color={colors.blue} bg={colors.blueSoft} />
      </Card>

      <Button
        icon="send"
        label={app.offline ? 'Send via Mesh' : 'Submit report'}
        color={colors.red}
        disabled={!valid}
        onPress={() => {
          if (!valid) return;
          if (app.offline) app.enqueue('report', `Report · ${category}`);
          setSubmitted(`ST-${Math.floor(3000 + Math.random() * 6000)}`);
        }}
      />
    </Screen>
  );
}
