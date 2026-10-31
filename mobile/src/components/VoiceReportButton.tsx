import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream } from 'expo-audio';
import { api } from '@/services/api';
import type { PersonalHelpCategory } from '@/shared/models';
import { colors, radius } from '@/theme';

type VoiceState = 'idle' | 'recording' | 'finishing';
type ScribeMessage = { message_type: string; text?: string; error?: string };

const REALTIME_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';
const SAMPLE_RATE = 16000;
// After stop, wait this long at most for the last words from the live stream.
const FINAL_WAIT_MS = 1200;

type VoiceHelpKind = 'Emergency' | 'Request resources';
type ResourceChoice = 'Food or water' | 'Shelter' | 'Transport';

// Emergencies are listed first so "I'm trapped and need water" stays an emergency.
const helpKeywords: [VoiceHelpKind, PersonalHelpCategory | ResourceChoice, RegExp][] = [
  ['Emergency', 'Injured', /injur|hurt|bleed|blood|broken|wound|pain|unconscious|breath|burn|fainted/i],
  ['Emergency', 'Stranded', /stuck|trapped|stranded|can'?t (get )?out|cut off|flood(ed)? in|no way out/i],
  ['Emergency', 'Lost', /\blost\b|missing|can'?t find|don'?t know where/i],
  ['Request resources', 'Food or water', /water|thirst|drink|food|hungry|\beat\b|starv/i],
  ['Request resources', 'Shelter', /shelter|place to (stay|sleep)|somewhere to (stay|sleep)|\broof\b|homeless|blanket/i],
  ['Request resources', 'Transport', /transport|\bride\b|\blift\b|\bcar\b|\bbus\b|evacuat|drive me/i],
];

/**
 * Picks the help type and quick choice that best match what the person said.
 * With `kind`, only choices of that type are considered (the person already picked it).
 */
export function guessHelpRequest(text: string, kind?: VoiceHelpKind) {
  const match = helpKeywords.find(([matchKind, , pattern]) => (!kind || matchKind === kind) && pattern.test(text));
  if (match) return { kind: match[0], choice: match[1] };
  return kind ? null : { kind: 'Emergency' as const, choice: 'Other personal assistance' as const };
}

function toBase64(data: ArrayBuffer) {
  const bytes = new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function withTimeout(promise: Promise<unknown>, ms: number) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]).catch(() => undefined);
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Streams the microphone to ElevenLabs Scribe Realtime so the text is ready the moment the person stops.
 * A WAV copy is saved alongside the stream and uploaded instead if the live stream returns nothing.
 */
export function VoiceReportButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [heard, setHeard] = useState('');
  const socket = useRef<WebSocket | null>(null);
  const socketOpen = useRef<Promise<void> | null>(null);
  // Audio captured while the token request and socket are still connecting.
  const queued = useRef<{ audio: string; sampleRate: number }[]>([]);
  const committed = useRef<string[]>([]);
  const partial = useRef('');
  const onCommitted = useRef<(() => void) | null>(null);
  const liveProblem = useRef<string | null>(null);
  const chunksCaptured = useRef(0);
  const chunksSent = useRef(0);
  const savingFile = useRef(false);

  const { stream } = useAudioStream({
    sampleRate: SAMPLE_RATE,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer) => {
      chunksCaptured.current += 1;
      sendAudio(toBase64(buffer.data), buffer.sampleRate, false);
    },
  });

  useEffect(() => () => { socket.current?.close(); }, []);

  // useAudioStream has no web implementation.
  if (!stream) return null;

  function currentText() {
    return [...committed.current, partial.current].map((part) => part.trim()).filter(Boolean).join(' ');
  }

  function sendAudio(audio: string, sampleRate: number, commit: boolean) {
    const ws = socket.current;
    if (ws?.readyState !== WebSocket.OPEN) { if (!commit) queued.current.push({ audio, sampleRate }); return; }
    ws.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: audio, commit, sample_rate: sampleRate }));
    if (audio) chunksSent.current += 1;
  }

  function handleMessage(message: ScribeMessage) {
    if (message.message_type === 'partial_transcript') partial.current = message.text ?? '';
    else if (message.message_type === 'committed_transcript') {
      if (message.text?.trim()) committed.current.push(message.text);
      partial.current = '';
      onCommitted.current?.();
    } else if (message.error) {
      console.warn('Scribe realtime error', message);
      liveProblem.current = `${message.message_type}: ${message.error}`;
    }
    setHeard(currentText());
  }

  async function connect() {
    const { token } = await api.realtimeTranscriptionToken();
    const rate = stream!.sampleRate || SAMPLE_RATE;
    const ws = new WebSocket(`${REALTIME_URL}?model_id=scribe_v2_realtime&audio_format=pcm_${rate}&commit_strategy=vad&token=${encodeURIComponent(token)}`);
    socket.current = ws;
    ws.onmessage = (event) => { try { handleMessage(JSON.parse(String(event.data))); } catch { /* Ignore malformed frames. */ } };
    ws.onclose = (event) => {
      // stop() clears socket.current before closing, so this only reports closes we didn't ask for.
      if (socket.current !== ws) return;
      console.warn('Scribe realtime closed', event.code, event.reason);
      liveProblem.current = `disconnected (${event.code}${event.reason ? `: ${event.reason}` : ''})`;
    };
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        for (const chunk of queued.current.splice(0)) sendAudio(chunk.audio, chunk.sampleRate, false);
        resolve();
      };
      ws.onerror = () => reject(new Error('could not connect to ElevenLabs'));
    });
  }

  async function start() {
    setError(null);
    setHeard('');
    committed.current = [];
    partial.current = '';
    queued.current = [];
    liveProblem.current = null;
    chunksCaptured.current = 0;
    chunksSent.current = 0;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) { setError('Allow microphone access to record your report.'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await stream!.start();
      savingFile.current = await stream!.startFileRecordingAsync({ format: 'wav' }).then(() => true, () => false);
      setState('recording');
      // Connect while the person is already speaking; early audio is queued.
      socketOpen.current = connect();
      socketOpen.current.catch((e: unknown) => { liveProblem.current = errorText(e, 'could not start live transcription'); });
    } catch (e) {
      setError(`Could not start recording: ${errorText(e, 'unknown error')}`);
      setState('idle');
    }
  }

  async function stop() {
    setState('finishing');
    const recording = savingFile.current ? await stream!.stopFileRecordingAsync().catch(() => null) : null;
    stream!.stop();
    void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);

    await withTimeout(socketOpen.current ?? Promise.resolve(), FINAL_WAIT_MS);
    if (socket.current?.readyState === WebSocket.OPEN && partial.current) {
      await withTimeout(new Promise<void>((resolve) => {
        onCommitted.current = resolve;
        sendAudio('', stream!.sampleRate || SAMPLE_RATE, true);
      }), FINAL_WAIT_MS);
    }
    onCommitted.current = null;
    const ws = socket.current;
    socket.current = null;
    ws?.close();

    let text = currentText();
    let uploadProblem: string | null = null;
    if (!text && recording?.uri) {
      try { text = (await api.transcribeRecording(recording.uri)).text.trim(); }
      catch (e) { uploadProblem = errorText(e, 'upload failed'); }
    }

    if (text) onTranscript(text);
    else if (chunksCaptured.current === 0) setError('The microphone did not pick up any audio. Check microphone access in Settings.');
    else {
      const details = [liveProblem.current && `Live: ${liveProblem.current}`, uploadProblem && `Upload: ${uploadProblem}`].filter(Boolean).join(' · ');
      setError(details ? `Could not transcribe. ${details}` : 'Could not hear any words. Try again closer to the phone.');
    }
    console.log('Voice report', { chunksCaptured: chunksCaptured.current, chunksSent: chunksSent.current, liveProblem: liveProblem.current, uploadProblem, usedUpload: !currentText() && !!text });
    setHeard('');
    setState('idle');
  }

  const recording = state === 'recording';
  const busy = state === 'finishing';
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => { void (recording ? stop() : start()); }}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Stop recording and fill the form' : 'Record your report by voice'}
        style={({ pressed }) => [styles.button, recording && styles.buttonRecording, (pressed || busy) && { opacity: 0.8 }]}
      >
        {busy ? <ActivityIndicator color={colors.red} /> : <Ionicons name={recording ? 'stop' : 'mic'} size={20} color={recording ? colors.card : colors.red} />}
        <Text style={[styles.label, recording && styles.labelRecording]}>
          {busy ? 'Filling in the form…' : recording ? 'Listening… tap to stop' : 'Speak instead of typing'}
        </Text>
      </Pressable>
      {recording && !!heard && <Text style={styles.heard}>{heard}</Text>}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  button: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.red, borderRadius: radius.md, backgroundColor: colors.redSoft, paddingHorizontal: 14 },
  buttonRecording: { backgroundColor: colors.red },
  label: { fontSize: 15, fontWeight: '800', color: colors.red },
  labelRecording: { color: colors.card },
  heard: { fontSize: 15, color: colors.text, fontStyle: 'italic' },
  error: { color: colors.red, fontSize: 13, fontWeight: '700' },
});
