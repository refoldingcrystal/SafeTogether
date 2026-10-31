import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ChoiceGrid } from '@/components/ChoiceGrid';
import { Screen } from '@/components/Screen';
import { Button, Card, Pill } from '@/components/ui';
import { helpCategories } from '@/shared/demo';
import type { HelpCategory } from '@/shared/models';
import { colors, shared } from '@/theme';

export default function OfferScreen() {
  const [category, setCategory] = useState<HelpCategory | ''>('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);
  const valid = category !== '';

  function reset() {
    setPublished(false);
    setCategory('');
    setDescription('');
  }

  const back = (
    <Pressable onPress={() => router.navigate('../offerhelp')} style={styles.back}>
      <Ionicons name="chevron-back" size={18} color={colors.blue} />
      <Text style={styles.backText}>Help nearby</Text>
    </Pressable>
  );

  if (published) {
    return (
      <Screen>
        {back}
        <Animated.View entering={FadeInDown}>
          <Card style={{ borderWidth: 2, borderColor: colors.green }}>
            <Pill icon="checkmark-circle" label="Saved on this device" color={colors.green} bg={colors.greenSoft} />
            <Text style={shared.title}>Offer ready</Text>
            <Text style={shared.body}>This is a local demonstration. The offer is not publicly listed and no contact details are shared.</Text>
          </Card>
        </Animated.View>
        <Button icon="add" label="Create another offer" color={colors.text} onPress={reset} />
      </Screen>
    );
  }

  return (
    <Screen>
      {back}
      <View>
        <Text style={shared.title}>Offer help</Text>
        <Text style={shared.subtitle}>Offer practical help only when you can do so safely. Volunteers are not emergency services.</Text>
      </View>

      <Card>
        <Text style={shared.kicker}>WHAT CAN YOU SAFELY PROVIDE?</Text>
        <ChoiceGrid choices={helpCategories} value={category} onChange={setCategory} accent={colors.green} />
      </Card>

      <Card>
        <Text style={shared.kicker}>DESCRIBE YOUR OFFER</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={400}
          placeholder="For example, bottled water for 10 people"
          placeholderTextColor={colors.textDim}
          style={[shared.input, { minHeight: 110, textAlignVertical: 'top' }]}
        />
      </Card>

      <Card>
        <Pill icon="locate" label="Your approximate current location is used automatically" color={colors.blue} bg={colors.blueSoft} />
      </Card>

      <Text style={shared.notice}>Do not enter a dangerous area to provide help. Offer medical help only within your actual training.</Text>
      <Button icon="hand-left" label="Publish offer" color={colors.green} disabled={!valid} onPress={() => valid && setPublished(true)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: colors.blue, fontWeight: '700', fontSize: 14 },
});
