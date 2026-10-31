import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Pill } from '@/components/ui';
import mock from '@/data/mock.json';
import { helpCategories } from '@/shared/demo';
import { useApp } from '@/state/app';
import { colors, radius, shadow } from '@/theme';

type HelpFeedItem = {
  id: string;
  type: string;
  icon: string;
  title: string;
  author: string;
  distance: string;
  tags: string[];
  description?: string;
  photos?: string[];
};

const MAX_PHOTOS = 3;

export default function HelpScreen() {
  const app = useApp();
  const b = mock.basement;
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [localOffers, setLocalOffers] = useState<HelpFeedItem[]>([]);

  function closeOfferModal() {
    setOfferModalVisible(false);
    setSelectedCategories([]);
    setDescription('');
    setPhotos([]);
  }

  function toggleCategory(category: string) {
    setSelectedCategories((current) => current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]);
  }

  async function addPhotos() {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;
    const tooLarge = result.assets.some((asset) => asset.fileSize && asset.fileSize > 5 * 1024 * 1024);
    if (tooLarge) Alert.alert('Photo too large', 'Choose photos smaller than 5 MB each.');
    const accepted = result.assets.filter((asset) => !asset.fileSize || asset.fileSize <= 5 * 1024 * 1024);
    setPhotos((current) => [...current, ...accepted.map((asset) => asset.uri)].slice(0, MAX_PHOTOS));
  }

  function publishOffer() {
    if (selectedCategories.length === 0) {
      Alert.alert('Choose what you can offer', 'Select at least one type of help.');
      return;
    }
    const categoryTitle = selectedCategories.join(' · ');
    setLocalOffers((current) => [{
      id: `local-${Date.now()}`,
      type: 'offer',
      icon: 'hand-left',
      title: categoryTitle,
      author: 'You',
      distance: 'Location not shared',
      tags: selectedCategories,
      description: description.trim() || undefined,
      photos: photos.length ? photos : undefined,
    }, ...current]);
    closeOfferModal();
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>Help nearby</Text>
        <Text style={styles.sub}>Offers and requests from neighbours</Text>
      </View>

      <Button icon="hand-left" label="Offer help" color={colors.green} onPress={() => setOfferModalVisible(true)} />

      {app.p2pReceived && (
        <Animated.View entering={FadeInDown}>
          <Card style={{ borderWidth: 2, borderColor: colors.orange }}>
            <View style={styles.row}>
              <Pill icon="radio" label="NEW · P2P via Mesh" color={colors.mesh} bg={colors.meshSoft} />
              <Text style={styles.meta}>{b.distance}</Text>
            </View>
            <Text style={styles.cardTitle}>“{b.message}”</Text>
            <Text style={styles.body}>{b.details}</Text>
            <Text style={styles.meta}>
              {b.author} · {b.street}
            </Text>
            <Button
              icon="navigate"
              label="Navigate (avoids shelling zone)"
              color={colors.green}
              onPress={() => {
                app.setRoute('basement');
                router.navigate('/');
              }}
            />
          </Card>
        </Animated.View>
      )}

      {localOffers.map((item, i) => (
        <HelpItem key={item.id} item={item} index={i} />
      ))}

      {mock.helpFeed.map((item, i) => (
        <HelpItem key={item.id} item={item} index={i} />
      ))}

      <OfferHelpModal
        visible={offerModalVisible}
        selectedCategories={selectedCategories}
        description={description}
        photos={photos}
        onClose={closeOfferModal}
        onToggleCategory={toggleCategory}
        onChangeDescription={setDescription}
        onAddPhotos={addPhotos}
        onRemovePhoto={(uri) => setPhotos((current) => current.filter((photo) => photo !== uri))}
        onPublish={publishOffer}
      />
    </ScrollView>
  );
}

function OfferHelpModal({
  visible,
  selectedCategories,
  description,
  photos,
  onClose,
  onToggleCategory,
  onChangeDescription,
  onAddPhotos,
  onRemovePhoto,
  onPublish,
}: {
  visible: boolean;
  selectedCategories: string[];
  description: string;
  photos: string[];
  onClose: () => void;
  onToggleCategory: (category: string) => void;
  onChangeDescription: (value: string) => void;
  onAddPhotos: () => void;
  onRemovePhoto: (uri: string) => void;
  onPublish: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close offer form" />
        <View style={styles.sheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>Offer help</Text>
              <Text style={styles.modalSubtitle}>Choose what you can safely provide.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
            <Text style={styles.sectionLabel}>WHAT CAN YOU OFFER?</Text>
            <View style={styles.categoryGrid}>
              {helpCategories.map((category) => {
                const selected = selectedCategories.includes(category);
                return (
                  <Pressable
                    key={category}
                    onPress={() => onToggleCategory(category)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    style={[styles.categoryOption, selected && styles.categoryOptionSelected]}
                  >
                    <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={19} color={selected ? colors.green : colors.textDim} />
                    <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{category}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>DESCRIPTION <Text style={styles.optional}>(OPTIONAL)</Text></Text>
              <TextInput
                value={description}
                onChangeText={onChangeDescription}
                multiline
                maxLength={400}
                placeholder="Add details people may need to know"
                placeholderTextColor={colors.textDim}
                style={styles.descriptionInput}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>{description.length}/400</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>PHOTOS <Text style={styles.optional}>(OPTIONAL · UP TO {MAX_PHOTOS})</Text></Text>
              <View style={styles.photoRow}>
                {photos.map((uri) => (
                  <View key={uri} style={styles.photoWrap}>
                    <Image source={{ uri }} style={styles.photoPreview} />
                    <Pressable onPress={() => onRemovePhoto(uri)} style={styles.removePhoto} accessibilityRole="button" accessibilityLabel="Remove photo">
                      <Ionicons name="close" size={14} color="#fff" />
                    </Pressable>
                  </View>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <Pressable onPress={onAddPhotos} style={styles.addPhotoButton} accessibilityRole="button">
                    <Ionicons name="camera-outline" size={22} color={colors.green} />
                    <Text style={styles.addPhotoText}>Add photos</Text>
                  </Pressable>
                )}
              </View>
              <Text style={styles.photoHint}>Photos stay on this device in this demo.</Text>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button label="Publish offer" icon="hand-left" color={colors.green} onPress={onPublish} />
            <Pressable onPress={onClose} style={styles.cancelButton} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function HelpItem({ item, index }: { item: HelpFeedItem; index: number }) {
  const [done, setDone] = useState(false);
  const offer = item.type === 'offer';
  const color = offer ? colors.green : colors.red;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80)}>
      <Card>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: offer ? colors.greenSoft : colors.redSoft }]}>
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.type, { color }]}>{offer ? 'OFFERING' : 'NEEDED'}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.author} · {item.distance}
            </Text>
          </View>
        </View>
        <View style={styles.tags}>
          {item.tags.map((t) => (
            <Text key={t} style={styles.tag}>
              {t}
            </Text>
          ))}
        </View>
        {item.description && <Text style={styles.body}>{item.description}</Text>}
        {item.photos && item.photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listingPhotos}>
            {item.photos.map((uri) => <Image key={uri} source={{ uri }} style={styles.listingPhoto} />)}
          </ScrollView>
        )}
        <Button
          icon={done ? 'checkmark-circle' : offer ? 'navigate' : 'hand-left'}
          label={done ? 'Response sent' : offer ? 'I need this' : 'I can help'}
          color={done ? colors.green : color}
          outline={!done}
          onPress={() => setDone(true)}
        />
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  icon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  type: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  body: { fontSize: 13, color: colors.textMuted },
  meta: { fontSize: 12, color: colors.textMuted },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(16, 24, 40, 0.48)' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    ...shadow,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  modalTitleWrap: { flex: 1, gap: 3 },
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: '900' },
  modalSubtitle: { color: colors.textMuted, fontSize: 13 },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  modalContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 18 },
  sectionLabel: { color: colors.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 0.7, marginBottom: 9 },
  optional: { color: colors.textDim, fontWeight: '600', letterSpacing: 0.2 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.card },
  categoryOptionSelected: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  categoryText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  categoryTextSelected: { color: colors.green, fontWeight: '800' },
  fieldGroup: { gap: 2 },
  descriptionInput: { minHeight: 92, backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  characterCount: { alignSelf: 'flex-end', color: colors.textDim, fontSize: 11, marginTop: 4 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  photoWrap: { position: 'relative' },
  photoPreview: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.bg },
  removePhoto: { position: 'absolute', right: -5, top: -5, width: 23, height: 23, borderRadius: 12, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card },
  addPhotoButton: { width: 100, height: 76, borderRadius: radius.md, borderWidth: 1, borderColor: colors.green, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.greenSoft },
  addPhotoText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  photoHint: { color: colors.textDim, fontSize: 11, marginTop: 6 },
  modalActions: { paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
  cancelButton: { height: 38, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  listingPhotos: { gap: 8, paddingVertical: 2 },
  listingPhoto: { width: 88, height: 72, borderRadius: radius.md, backgroundColor: colors.bg },
});
