import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, type HelpMessage } from '@/services/api';
import { colors, shadow } from '@/theme';

export type CoordinationRequest = { id: string; author: string; title: string };

export function CoordinationChat({ request, onClose }: { request: CoordinationRequest | null; onClose: () => void }) {
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!request) { setMessages([]); setDraft(''); return; }
    let active = true;
    const refresh = () => api.getMessages(request.id).then((result) => { if (active) setMessages(result); }).catch(() => {});
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 4000);
    return () => { active = false; clearInterval(timer); };
  }, [request]);

  async function send() {
    const text = draft.trim();
    if (!request || !text) return;
    setDraft('');
    try {
      await api.sendMessage(request.id, text);
      setMessages(await api.getMessages(request.id));
    } catch (error) {
      setDraft(text);
      Alert.alert('Message not sent', error instanceof Error ? error.message : 'Please sign in and try again.');
    }
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
                <View key={message.id} style={[styles.messageRow, message.isMine ? styles.mineRow : styles.theirRow]}>
                  <View style={[styles.messageBubble, message.isMine ? styles.outgoingBubble : styles.incomingBubble]}>
                    {!message.isMine && <Text style={styles.senderName}>{message.senderName}</Text>}
                    <Text style={styles.messageText}>{message.text}</Text>
                    <Text style={styles.messageTime}>{new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.chatComposer}>
              <Text style={styles.chatNote}>Messages sync through the server. Avoid sharing sensitive personal details.</Text>
              <View style={styles.composerRow}>
                <TextInput value={draft} onChangeText={setDraft} placeholder="Write a message…" placeholderTextColor={colors.textDim} style={styles.messageInput} maxLength={500} multiline />
                <Pressable onPress={() => void send()} disabled={!draft.trim()} style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]} accessibilityRole="button" accessibilityLabel="Send message">
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

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(16, 24, 40, 0.48)' },
  chatSheet: { height: '78%', maxHeight: '88%', backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 18, paddingBottom: Platform.OS === 'ios' ? 26 : 16, ...shadow },
  chatHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  chatHeaderText: { flex: 1, gap: 4 },
  modalTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  modalSubtitle: { color: colors.textMuted, fontSize: 12 },
  closeButton: { padding: 6 },
  chatConversation: { flex: 1 },
  chatConversationContent: { flexGrow: 1, justifyContent: 'space-between' },
  messagesContent: { flexGrow: 1, justifyContent: 'flex-end', padding: 16, gap: 10 },
  emptyChat: { alignItems: 'center', alignSelf: 'center', maxWidth: 260, gap: 8, paddingVertical: 24 },
  emptyChatTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  emptyChatBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  messageRow: { width: '100%' },
  mineRow: { alignItems: 'flex-end' },
  theirRow: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '84%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, gap: 4 },
  outgoingBubble: { backgroundColor: colors.blue, borderBottomRightRadius: 5 },
  incomingBubble: { backgroundColor: colors.bg, borderBottomLeftRadius: 5 },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 19 },
  senderName: { color: colors.blue, fontSize: 11, fontWeight: '800' },
  messageTime: { color: colors.textDim, fontSize: 10, alignSelf: 'flex-end' },
  chatComposer: { paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, gap: 7 },
  chatNote: { color: colors.textDim, fontSize: 11, textAlign: 'center' },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageInput: { flex: 1, maxHeight: 100, minHeight: 44, backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 14 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  sendButtonDisabled: { opacity: 0.45 },
});
