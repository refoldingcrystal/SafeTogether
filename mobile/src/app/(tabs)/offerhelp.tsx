import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Pill } from '@/components/ui';
import { CoordinationChat } from '@/components/CoordinationChat';
import mock from '@/data/mock.json';
import { demonstrationIncidents, helpCategories } from '@/shared/demo';
import { useApp } from '@/state/app';
import { getApproximateCurrentLocation } from '@/shared/location';
import type { HelpCategory } from '@/shared/models';
import { api, type HelpFeedItem as ApiHelpFeedItem } from '@/services/api';
import { colors, radius, shadow } from '@/theme';

type HelpFeedItem = ApiHelpFeedItem;

function demonstrationHelpFeed(): HelpFeedItem[] {
  const demoRequests = demonstrationIncidents.map((incident) => ({
    id: incident.id,
    type: 'request' as const,
    kind: 'emergency',
    icon: incident.category === 'Injured' ? 'medkit' : incident.category === 'Stranded' ? 'walk' : incident.category === 'Lost' ? 'search' : 'help-circle',
    title: incident.category,
    author: incident.reporterName,
    distance: incident.approximateLocation.label,
    tags: [incident.category],
    description: incident.description,
    isMine: false,
    status: 'active',
    createdAt: incident.updatedAt,
    approximateLocation: incident.approximateLocation,
  }));
  return [...(mock.helpFeed as HelpFeedItem[]), ...demoRequests];
}
type HelpFeedFilter = 'all' | 'shelter' | 'food' | 'medical' | 'transport' | 'other';

const HELP_FILTERS: { id: HelpFeedFilter; label: string; emoji?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'shelter', label: 'Shelter', emoji: '🏠' },
  { id: 'food', label: 'Food / water', emoji: '🥫' },
  { id: 'medical', label: 'Medical', emoji: '🩹' },
  { id: 'transport', label: 'Transport', emoji: '🚐' },
  { id: 'other', label: 'Other', emoji: '🤝' },
];

const HELP_CATEGORY_EMOJI: Record<HelpCategory, string> = {
  Shelter: '🏠',
  'Food and water': '🥫',
  Transport: '🚐',
  'Qualified first aid': '🩹',
  Supplies: '📦',
  'Other practical help': '🤝',
};

const HELP_CATEGORY_LABELS: Record<HelpCategory, string> = {
  Shelter: 'Shelter',
  'Food and water': 'Food / water',
  Transport: 'Transport',
  'Qualified first aid': 'Medical',
  Supplies: 'Supplies',
  'Other practical help': 'Other',
};

function categoriesForItem(item: HelpFeedItem): Set<Exclude<HelpFeedFilter, 'all'>> {
  const text = [item.kind, item.title, item.description, ...item.tags].filter(Boolean).join(' ').toLowerCase();
  const categories = new Set<Exclude<HelpFeedFilter, 'all'>>();
  if (/shelter|safe zone|basement|accommodation|evacuation/.test(text)) categories.add('shelter');
  if (/food|water|meal|kitchen|grocer|bread/.test(text)) categories.add('food');
  if (/medical|medic|doctor|nurse|injur|wound|first aid|insulin|inhaler|pharmac/.test(text)) categories.add('medical');
  if (/transport|bus|ride|vehicle|drive|pick.?up/.test(text)) categories.add('transport');
  if (categories.size === 0) categories.add('other');
  return categories;
}

function displayHelpCategory(category: string) {
  return HELP_CATEGORY_LABELS[category as HelpCategory] ?? category;
}

export default function HelpScreen() {
  const app = useApp();
  const b = mock.basement;
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<HelpFeedFilter>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [feedItems, setFeedItems] = useState<HelpFeedItem[]>(demonstrationHelpFeed);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<HelpFeedItem | null>(null);
  const visibleFeedItems = useMemo(() => feedItems
    .filter((item) => item.type === 'offer' ? item.isMine === true : item.isMine !== true)
    .filter((item) => activeFilter === 'all' || categoriesForItem(item).has(activeFilter)), [activeFilter, feedItems]);

  useFocusEffect(useCallback(() => {
    let active = true;
    api.getHelpFeed().then((items) => { if (active) setFeedItems(items); }).catch(() => { if (active) setFeedItems(demonstrationHelpFeed()); });
    return () => { active = false; };
  }, []));

  function closeOfferModal() {
    setOfferModalVisible(false);
    setSelectedCategories([]);
    setDescription('');
    setEditingOfferId(null);
  }

  function toggleCategory(category: string) {
    setSelectedCategories((current) => current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]);
  }

  async function publishOffer() {
    if (selectedCategories.length === 0) {
      Alert.alert('Choose what you can offer', 'Select at least one type of help.');
      return;
    }
    try {
      const approximateLocation = await getApproximateCurrentLocation();
      const offer = editingOfferId
        ? await api.updateOffer(editingOfferId, { categories: selectedCategories, description: description.trim(), approximateLocation })
        : await api.createOffer({ categories: selectedCategories, description: description.trim(), approximateLocation });
      setEditingOfferId(offer.id);
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
    setOfferModalVisible(true);
  }

  function stopOffering(offerId: string) {
    Alert.alert('Stop offering?', 'This offer will be removed from your Help feed.', [
      { text: 'Keep offering', style: 'cancel' },
      { text: 'Stop offering', style: 'destructive', onPress: () => { void api.stopOffering(offerId).then(async () => setFeedItems(await api.getHelpFeed())).catch((error) => Alert.alert('Could not stop offering', error instanceof Error ? error.message : 'Please try again.')); } },
    ]);
  }

  function openChat(item: HelpFeedItem) {
    setActiveChat(item);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="always">
      <View>
        <Text style={styles.title}>Help nearby</Text>
        <Text style={styles.sub}>Community offers and requests</Text>
      </View>

      <Button icon="add" label="I can offer help" color={colors.green} onPress={() => setOfferModalVisible(true)} />

      <View style={styles.filters} accessibilityLabel="Filter help by category">
        {HELP_FILTERS.map((filter) => {
          const selected = activeFilter === filter.id;
          return (
            <Pressable
              key={filter.id}
              onPress={() => setActiveFilter(filter.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.filterChip, selected && styles.filterChipSelected]}
            >
              {filter.emoji && <Text style={styles.filterEmoji}>{filter.emoji}</Text>}
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </View>

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
      {visibleFeedItems.length === 0 && (
        <Text style={styles.emptyFeed}>
          {activeFilter === 'all'
            ? 'No help posts nearby yet.'
            : `No ${HELP_FILTERS.find((filter) => filter.id === activeFilter)?.label.toLowerCase()} posts nearby yet.`}
        </Text>
      )}

      <OfferHelpModal
        visible={offerModalVisible}
        editing={editingOfferId !== null}
        selectedCategories={selectedCategories}
        description={description}
        onClose={closeOfferModal}
        onToggleCategory={toggleCategory}
        onChangeDescription={setDescription}
        onPublish={publishOffer}
      />
      <CoordinationChat
        request={activeChat}
        onClose={() => setActiveChat(null)}
      />
    </ScrollView>
  );
}

function OfferHelpModal({
  visible,
  editing,
  selectedCategories,
  description,
  onClose,
  onToggleCategory,
  onChangeDescription,
  onPublish,
}: {
  visible: boolean;
  editing: boolean;
  selectedCategories: string[];
  description: string;
  onClose: () => void;
  onToggleCategory: (category: string) => void;
  onChangeDescription: (value: string) => void;
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
                    <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{HELP_CATEGORY_EMOJI[category]} {displayHelpCategory(category)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.mapLocationHint}>We’ll use your current location, shifted randomly by up to 500 m.</Text>

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

          </ScrollView>

          <View style={styles.modalActions}>
            <Button label={editing ? 'Save changes' : 'Publish offer'} icon={editing ? 'checkmark' : 'hand-left'} color={colors.green} disabled={!selectedCategories.length} onPress={onPublish} />
            <Pressable onPress={onClose} style={styles.cancelButton} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function HelpItem({ item, index, onEdit, onStop, onChat }: { item: HelpFeedItem; index: number; onEdit?: (item: HelpFeedItem) => void; onStop?: (id: string) => void; onChat?: (item: HelpFeedItem) => void }) {
  const offer = item.type === 'offer';
  const filters = [...categoriesForItem(item)].map((category) => HELP_FILTERS.find((filter) => filter.id === category));
  const categoryHeading = offer
    ? item.tags.map(displayHelpCategory).join(' · ') || 'Other'
    : filters.map((filter) => filter?.label).filter(Boolean).join(' · ') || 'Other';
  const emoji = (offer ? HELP_CATEGORY_EMOJI[item.tags[0] as HelpCategory] : undefined) ?? filters[0]?.emoji ?? '🤝';
  const cardTitle = offer && item.description ? item.description : item.title;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80)}>
      <Card>
        <View style={{ gap: 6 }}>
          <Text style={styles.heading}>{emoji} {categoryHeading}</Text>
          <Text style={styles.cardTitle}>{cardTitle}</Text>
          <Text style={styles.meta}>
            {offer ? `Offered by ${item.author}` : `Requested by ${item.author}`} · {item.distance}
          </Text>
        </View>
        {!offer && item.tags.length > 0 && (
          <View style={styles.tags}>
            {item.tags.map((t) => (
              <Text key={t} style={styles.tag}>
                {displayHelpCategory(t)}
              </Text>
            ))}
          </View>
        )}
        {!offer && item.description && <Text style={styles.body}>{item.description}</Text>}
        {offer && item.isMine ? (
          <View style={styles.offerActions}>
            <Button icon="create-outline" label="Edit offering" color={colors.green} outline onPress={() => onEdit?.(item)} />
            <Button icon="close-circle-outline" label="Stop offering" color={colors.red} outline onPress={() => onStop?.(item.id)} />
          </View>
        ) : !offer && !item.isMine ? (
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
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 15, backgroundColor: colors.card },
  filterChipSelected: { borderColor: colors.blue, backgroundColor: colors.blue },
  filterEmoji: { fontSize: 16 },
  filterText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  filterTextSelected: { color: '#fff' },
  emptyFeed: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 28 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  heading: { fontSize: 17, fontWeight: '800', color: colors.text },
  cardTitle: { fontSize: 15, color: colors.text },
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
  mapLocationHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.card },
  categoryOptionSelected: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  categoryText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  categoryTextSelected: { color: colors.green, fontWeight: '800' },
  fieldGroup: { gap: 2 },
  descriptionInput: { minHeight: 92, backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  characterCount: { alignSelf: 'flex-end', color: colors.textDim, fontSize: 11, marginTop: 4 },
  modalActions: { paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
  cancelButton: { height: 38, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  offerActions: { gap: 8 },
});
