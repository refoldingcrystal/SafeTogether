import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ChoiceGrid } from '@/components/ChoiceGrid';
import { incidentCategories } from '@/shared/demo';
import { colors, shared } from '@/theme';

export default function ReportScreen() {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const valid = category && description.trim().length >= 5 && location.trim().length >= 2;

  function submit() {
    if (!valid) { Alert.alert('Complete the report', 'Choose a category and add a short description and approximate location.'); return; }
    setSubmitted(`ST-${Math.floor(3000 + Math.random() * 6000)}`);
  }

  if (submitted) return <Screen><Text style={shared.eyebrow}>REPORT SAVED ON THIS DEVICE</Text><Text style={shared.title}>Thank you for reporting</Text><View style={shared.card}><Text style={styles.successTitle}>Reference {submitted}</Text><Text style={shared.body}>This report is part of the mobile demonstration. It has not been sent to authorities or emergency services.</Text></View><Text style={shared.notice}>For immediate danger, contact your local emergency number. A report in SafeTogether is not a substitute for emergency services.</Text><Pressable style={shared.primaryButton} onPress={() => { setSubmitted(null); setCategory(''); setDescription(''); setLocation(''); }}><Text style={shared.primaryButtonText}>Submit another report</Text></Pressable></Screen>;

  return <Screen>
    <Text style={shared.eyebrow}>REPORT AN EMERGENCY</Text><Text style={shared.title}>What is happening?</Text><Text style={shared.subtitle}>Share clear, approximate information. Do not include names, private contacts, or a home address.</Text>
    <View style={shared.card}><Text style={shared.label}>Incident category</Text><ChoiceGrid choices={incidentCategories} value={category} onChange={setCategory} /></View>
    <View style={shared.card}><Text style={shared.label}>Short description</Text><TextInput value={description} onChangeText={setDescription} multiline maxLength={400} placeholder="Describe what you can see" placeholderTextColor={colors.muted} style={[shared.input, styles.textarea]} /><Text style={shared.muted}>Avoid personal or sensitive information.</Text></View>
    <View style={shared.card}><Text style={shared.label}>Approximate location</Text><TextInput value={location} onChangeText={setLocation} placeholder="Neighborhood or nearby landmark" placeholderTextColor={colors.muted} style={shared.input} /><Text style={shared.muted}>Location sharing is optional. Never enter a private home address.</Text></View>
    <Text style={shared.notice}>Submitting does not guarantee a response. For immediate danger, contact local emergency services.</Text>
    <Pressable style={[shared.primaryButton, shared.urgentButton, !valid && styles.disabled]} onPress={submit} accessibilityState={{ disabled: !valid }}><Text style={shared.primaryButtonText}>Submit report</Text></Pressable>
  </Screen>;
}

const styles = StyleSheet.create({ textarea: { minHeight: 120, textAlignVertical: 'top' }, disabled: { opacity: .58 }, successTitle: { color: colors.green, fontSize: 18, fontWeight: '800' } });
