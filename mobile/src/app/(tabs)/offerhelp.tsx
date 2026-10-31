import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Button, Card, Pill } from '@/components/ui';
import mock from '@/data/mock.json';
import { helpCategories } from '@/shared/demo';
import { useApp } from '@/state/app';
import type { ApproximateLocation } from '@/shared/models';
import { api, type HelpFeedItem as ApiHelpFeedItem } from '@/services/api';
import { colors, radius, shadow } from '@/theme';

type HelpFeedItem = ApiHelpFeedItem;

type ChatMessage = { id: string; text: string; sentAt: string };

const MAX_PHOTOS = 3;
const toChatMessage = (message: { id: string; text: string; sentAt: string }): ChatMessage => ({
  id: message.id,
  text: message.text,
  sentAt: new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

export default function HelpScreen() {
  const app = useApp();
  const b = mock.basement;
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [offerLocation, setOfferLocation] = useState<ApproximateLocation | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [feedItems, setFeedItems] = useState<HelpFeedItem[]>(mock.helpFeed as HelpFeedItem[]);
  const [photoData, setPhotoData] = useState<Record<string, string>>({});
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<HelpFeedItem | null>(null);
  const [chatThreads, setChatThreads] = useState<Record<string, ChatMessage[]>>({});
  const visibleFeedItems = useMemo(() => feedItems.filter((item) => item.type === 'offer' ? item.isMine === true : item.isMine !== true), [feedItems]);

  useFocusEffect(useCallback(() => {
    let active = true;
    api.getHelpFeed().then((items) => { if (active) setFeedItems(items); }).catch(() => { if (active) setFeedItems(mock.helpFeed as HelpFeedItem[]); });
    return () => { active = false; };
  }, []));

  useEffect(() => {
    if (!activeChat) return;
    const refresh = () => api.getMessages(activeChat.id)
      .then((messages) => setChatThreads((current) => ({ ...current, [activeChat.id]: messages.map(toChatMessage) })))
      .catch(() => {});
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 4000);
    return () => clearInterval(timer);
  }, [activeChat]);

  function closeOfferModal() {
    setOfferModalVisible(false);
    setSelectedCategories([]);
    setDescription('');
    setOfferLocation(null);
    setPhotos([]);
    setPhotoData({});
    setEditingOfferId(null);
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
      base64: true,
    });
    if (result.canceled) return;
    const tooLarge = result.assets.some((asset) => asset.fileSize && asset.fileSize > 5 * 1024 * 1024);
    if (tooLarge) Alert.alert('Photo too large', 'Choose photos smaller than 5 MB each.');
    const accepted = result.assets.filter((asset) => (!asset.fileSize || asset.fileSize <= 5 * 1024 * 1024) && !!asset.base64);
    if (accepted.length < result.assets.filter((asset) => !asset.fileSize || asset.fileSize <= 5 * 1024 * 1024).length) Alert.alert('Photo unavailable', 'The selected photo could not be prepared for upload.');
    setPhotos((current) => [...current, ...accepted.map((asset) => asset.uri)].slice(0, MAX_PHOTOS));
    setPhotoData((current) => ({ ...current, ...Object.fromEntries(accepted.map((asset) => [asset.uri, `data:image/jpeg;base64,${asset.base64}`])) }));
  }

  async function publishOffer() {
    if (selectedCategories.length === 0) {
      Alert.alert('Choose what you can offer', 'Select at least one type of help.');
      return;
    }
    try {
      const offer = editingOfferId
        ? await api.updateOffer(editingOfferId, { categories: selectedCategories, description: description.trim(), approximateLocation: offerLocation })
        : await api.createOffer({ categories: selectedCategories, description: description.trim(), approximateLocation: offerLocation });
      setEditingOfferId(offer.id);
      for (const uri of photos) {
        const data = photoData[uri];
        if (data) {
          await api.uploadOfferPhoto(offer.id, data);
          setPhotoData((current) => { const next = { ...current }; delete next[uri]; return next; });
        }
      }
      setFeedItems(await api.getHelpFeed());
      closeOfferModal();
    } catch (error) {
      Alert.alert('Could not publish offer', error instanceof Error ? error.message : 'Please sign in and try again.');
    }
  }

  function editOffer(offer: HelpFeedItem) {
    setEditingOfferId(offer.id);
    setSelectedCategories(offer.tags);
    setDescription(offer.description || '');
    setOfferLocation(offer.approximateLocation || null);
    setPhotos(offer.photos || []);
    setPhotoData({});
    setOfferModalVisible(true);
  }

  async function shareOfferLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow location access to place your offer on the map.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setOfferLocation({ label: 'Approximate current area', latitude: current.coords.latitude, longitude: current.coords.longitude, precision: 'neighborhood' });
    } catch {
      Alert.alert('Could not get location', 'Try again or publish without a map location.');
    }
  }

  function stopOffering(offerId: string) {
    Alert.alert('Stop offering?', 'This offer will be removed from your Help feed.', [
      { text: 'Keep offering', style: 'cancel' },
      { text: 'Stop offering', style: 'destructive', onPress: () => { void api.stopOffering(offerId).then(async () => setFeedItems(await api.getHelpFeed())).catch((error) => Alert.alert('Could not stop offering', error instanceof Error ? error.message : 'Please try again.')); } },
    ]);
  }

  async function sendChatMessage(requestId: string, text: string) {
    const message = text.trim();
    if (!message) return;
    try {
      await api.sendMessage(requestId, message);
      const messages = await api.getMessages(requestId);
      setChatThreads((current) => ({ ...current, [requestId]: messages.map(toChatMessage) }));
    } catch (error) {
      Alert.alert('Message not sent', error instanceof Error ? error.message : 'Please sign in and try again.');
    }
  }

  function openChat(item: HelpFeedItem) {
    setActiveChat(item);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="always">
      <View>
        <Text style={styles.title}>Help nearby</Text>
        <Text style={styles.sub}>Your offers and requests you can respond to</Text>
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

      {visibleFeedItems.map((item, i) => (
        <HelpItem key={item.id} item={item} index={i} onEdit={editOffer} onStop={stopOffering} onChat={openChat} />
      ))}

      <OfferHelpModal
        visible={offerModalVisible}
        editing={editingOfferId !== null}
        selectedCategories={selectedCategories}
        description={description}
        offerLocation={offerLocation}
        photos={photos}
        onClose={closeOfferModal}
        onToggleCategory={toggleCategory}
        onChangeDescription={setDescription}
        onSetLocation={shareOfferLocation}
        onClearLocation={() => setOfferLocation(null)}
        onAddPhotos={addPhotos}
        onRemovePhoto={(uri) => setPhotos((current) => current.filter((photo) => photo !== uri))}
        onPublish={publishOffer}
      />
      <CoordinationChat
        request={activeChat}
        messages={activeChat ? chatThreads[activeChat.id] || [] : []}
        onClose={() => setActiveChat(null)}
        onSend={(text) => activeChat && void sendChatMessage(activeChat.id, text)}
      />
    </ScrollView>
  );
}

function OfferHelpModal({
  visible,
  editing,
  selectedCategories,
  description,
  offerLocation,
  photos,
  onClose,
  onToggleCategory,
  onChangeDescription,
  onSetLocation,
  onClearLocation,
  onAddPhotos,
  onRemovePhoto,
  onPublish,
}: {
  visible: boolean;
  editing: boolean;
  selectedCategories: string[];
  description: string;
  offerLocation: ApproximateLocation | null;
  photos: string[];
  onClose: () => void;
  onToggleCategory: (category: string) => void;
  onChangeDescription: (value: string) => void;
  onSetLocation: () => void;
  onClearLocation: () => void;
  onAddPhotos: () => void;
  onRemovePhoto: (uri: string) => void;
  onPublish: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close offer form" />
        <View style={styles.sheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>{editing ? 'Edit offer' : 'Offer help'}</Text>
              <Text style={styles.modalSubtitle}>Choose what you can safely provide.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={styles.modalContent}>
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
              <Text style={styles.sectionLabel}>MAP LOCATION <Text style={styles.optional}>(OPTIONAL)</Text></Text>
              {offerLocation ? (
                <View style={styles.locationRow}>
                  <Text style={styles.locationText}>Shown near {offerLocation.label}</Text>
                  <Pressable onPress={onClearLocation} accessibilityRole="button"><Text style={styles.clearLocation}>Remove</Text></Pressable>
                </View>
              ) : (
                <Pressable onPress={onSetLocation} style={styles.locationButton} accessibilityRole="button">
                  <Ionicons name="location-outline" size={18} color={colors.green} />
                  <Text style={styles.addPhotoText}>Add approximate current location</Text>
                </Pressable>
              )}
              <Text style={styles.photoHint}>The map shows an approximate neighborhood location.</Text>
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
              <Text style={styles.photoHint}>New photos are reviewed before they appear to others.</Text>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button label={editing ? 'Save changes' : 'Publish offer'} icon={editing ? 'checkmark' : 'hand-left'} color={colors.green} onPress={onPublish} />
            <Pressable onPress={onClose} style={styles.cancelButton} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CoordinationChat({ request, messages, onClose, onSend }: {
  request: HelpFeedItem | null;
  messages: ChatMessage[];
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');

  function send() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  return (
    <Modal visible={request !== null} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close chat" />
        <View style={styles.chatSheet}>
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderText}>
              <Text style={styles.modalTitle}>Coordinate help</Text>
              <Text style={styles.modalSubtitle}>{request?.author} · {request?.title}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close chat">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.chatConversation} contentContainerStyle={styles.chatConversationContent} keyboardShouldPersistTaps="always">
            <View style={styles.messagesContent}>
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubbles-outline" size={28} color={colors.blue} />
                <Text style={styles.emptyChatTitle}>Start coordinating</Text>
                <Text style={styles.emptyChatBody}>Ask what is needed and agree on a safe way to help. Avoid sharing sensitive personal details.</Text>
              </View>
            ) : messages.map((message) => (
              <View key={message.id} style={styles.messageRow}>
                <View style={styles.outgoingBubble}>
                  <Text style={styles.outgoingText}>{message.text}</Text>
                  <Text style={styles.messageTime}>{message.sentAt}</Text>
                </View>
              </View>
            ))}
            </View>

            <View style={styles.chatComposer}>
              <Text style={styles.chatDemoNote}>Messages sync through the server. Avoid sharing sensitive personal details.</Text>
              <View style={styles.composerRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Write a message…"
                  placeholderTextColor={colors.textDim}
                  style={styles.messageInput}
                  maxLength={500}
                  multiline
                />
                <Pressable onPress={send} disabled={!draft.trim()} style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]} accessibilityRole="button" accessibilityLabel="Send message">
                  <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function HelpItem({ item, index, onEdit, onStop, onChat }: { item: HelpFeedItem; index: number; onEdit?: (item: HelpFeedItem) => void; onStop?: (id: string) => void; onChat?: (item: HelpFeedItem) => void }) {
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
        {item.isMine ? (
          <View style={styles.offerActions}>
            <Button icon="create-outline" label="Edit offering" color={colors.green} outline onPress={() => onEdit?.(item)} />
            <Button icon="close-circle-outline" label="Stop offering" color={colors.red} outline onPress={() => onStop?.(item.id)} />
          </View>
        ) : !offer ? (
          <Button icon="chatbubble-ellipses" label="Chat" color={colors.blue} onPress={() => onChat?.(item)} />
        ) : null}
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
  locationButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12 },
  locationRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12 },
  locationText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  clearLocation: { color: colors.red, fontSize: 13, fontWeight: '700' },
  modalActions: { paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
  cancelButton: { height: 38, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  chatSheet: { height: '78%', maxHeight: '88%', backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 18, paddingBottom: Platform.OS === 'ios' ? 26 : 16, ...shadow },
  chatHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  chatHeaderText: { flex: 1, gap: 4 },
  chatConversation: { flex: 1 },
  chatConversationContent: { flexGrow: 1, justifyContent: 'space-between' },
  messagesContent: { flexGrow: 1, justifyContent: 'flex-end', padding: 16, gap: 10 },
  emptyChat: { alignItems: 'center', alignSelf: 'center', maxWidth: 260, gap: 8, paddingVertical: 24 },
  emptyChatTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  emptyChatBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  messageRow: { alignItems: 'flex-end' },
  outgoingBubble: { maxWidth: '84%', backgroundColor: colors.blue, borderRadius: 16, borderBottomRightRadius: 5, paddingHorizontal: 12, paddingVertical: 9, gap: 4 },
  outgoingText: { color: '#fff', fontSize: 14, lineHeight: 19 },
  messageTime: { color: '#D1E9FF', fontSize: 10, alignSelf: 'flex-end' },
  chatComposer: { paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, gap: 7 },
  chatDemoNote: { color: colors.textDim, fontSize: 11, textAlign: 'center' },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageInput: { flex: 1, maxHeight: 100, minHeight: 44, backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 14 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  sendButtonDisabled: { opacity: 0.45 },
  listingPhotos: { gap: 8, paddingVertical: 2 },
  listingPhoto: { width: 88, height: 72, borderRadius: radius.md, backgroundColor: colors.bg },
  offerActions: { gap: 8 },
});
