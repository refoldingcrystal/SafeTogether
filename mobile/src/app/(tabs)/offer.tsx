import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ChoiceGrid } from '@/components/ChoiceGrid';
import { helpCategories } from '@/shared/demo';
import { colors, shared } from '@/theme';

export default function OfferScreen() {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [published, setPublished] = useState(false);
  const valid = category && description.trim().length >= 5 && location.trim().length >= 2;

  function publish() {
    if (!valid) { Alert.alert('Complete the offer', 'Choose a category and add a short description and approximate location.'); return; }
    setPublished(true);
  }

  if (published) return <Screen><Text style={shared.eyebrow}>OFFER SAVED ON THIS DEVICE</Text><Text style={shared.title}>Offer ready</Text><View style={shared.card}><Text style={styles.successTitle}>Community offer created</Text><Text style={shared.body}>This is a local mobile demonstration. It is not publicly listed and no contact details are shared.</Text></View><Pressable style={shared.primaryButton} onPress={() => { setPublished(false); setCategory(''); setDescription(''); setLocation(''); }}><Text style={shared.primaryButtonText}>Create another offer</Text></Pressable></Screen>;

  return <Screen>
    <Text style={shared.eyebrow}>OFFER HELP</Text><Text style={shared.title}>What can you safely provide?</Text><Text style={shared.subtitle}>Offer practical help only when you can do so safely. Community volunteers are not emergency services.</Text>
    <View style={shared.card}><Text style={shared.label}>Help category</Text><ChoiceGrid choices={helpCategories} value={category} onChange={setCategory} /></View>
    <View style={shared.card}><Text style={shared.label}>Describe your offer</Text><TextInput value={description} onChangeText={setDescription} multiline maxLength={400} placeholder="For example, bottled water for 10 people" placeholderTextColor={colors.muted} style={[shared.input, styles.textarea]} /></View>
    <View style={shared.card}><Text style={shared.label}>Approximate location</Text><TextInput value={location} onChangeText={setLocation} placeholder="Neighborhood or nearby landmark" placeholderTextColor={colors.muted} style={shared.input} /><Text style={shared.muted}>Your exact address and private contact details are never public.</Text></View>
    <Text style={shared.notice}>Do not enter a dangerous area to provide help. Medical assistance must reflect your actual training and qualifications.</Text>
    <Pressable style={[shared.primaryButton, !valid && styles.disabled]} onPress={publish} accessibilityState={{ disabled: !valid }}><Text style={shared.primaryButtonText}>Publish offer</Text></Pressable>
  </Screen>;
}

const styles = StyleSheet.create({ textarea: { minHeight: 120, textAlignVertical: 'top' }, disabled: { opacity: .58 }, successTitle: { color: colors.green, fontSize: 18, fontWeight: '800' } });
