import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image,
  Modal,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from "expo-audio";
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { streamAriChat, transcribeAriAudio, AriImageAttachment } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { ARI_CAPABILITIES } from "@/constants/ariCapabilities";
import { AriSession, loadSessions, saveSession, deleteSession } from "@/lib/ariHistory";
import * as Haptics from "expo-haptics";

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  streaming?: boolean;
  imageUris?: string[]; // data URIs shown in the user's bubble
}

interface AriBlock {
  type: "section" | "claim" | "step" | "citation" | "text";
  title?: string;
  source?: string;
  content: string;
}

function parseAriBlocks(text: string): AriBlock[] {
  const blocks: AriBlock[] = [];
  const patterns = [
    { type: "section" as const, re: /<ari_section title="([^"]*)">([\s\S]*?)<\/ari_section>/g },
    { type: "claim" as const, re: /<ari_claim>([\s\S]*?)<\/ari_claim>/g },
    { type: "step" as const, re: /<ari_step>([\s\S]*?)<\/ari_step>/g },
    { type: "citation" as const, re: /<ari_citation source="([^"]*)"[^>]*>([\s\S]*?)<\/ari_citation>/g },
  ];
  const allMatches: Array<{ index: number; end: number; block: AriBlock }> = [];
  for (const p of patterns) {
    const re = new RegExp(p.re.source, "g");
    let m;
    while ((m = re.exec(text)) !== null) {
      if (p.type === "section") allMatches.push({ index: m.index, end: m.index + m[0].length, block: { type: "section", title: m[1], content: m[2].trim() } });
      else if (p.type === "claim") allMatches.push({ index: m.index, end: m.index + m[0].length, block: { type: "claim", content: m[1].trim() } });
      else if (p.type === "step") allMatches.push({ index: m.index, end: m.index + m[0].length, block: { type: "step", content: m[1].trim() } });
      else if (p.type === "citation") allMatches.push({ index: m.index, end: m.index + m[0].length, block: { type: "citation", source: m[1], content: m[2].trim() } });
    }
  }
  allMatches.sort((a, b) => a.index - b.index);
  let cursor = 0;
  for (const m of allMatches) {
    if (m.index > cursor) { const t = text.slice(cursor, m.index).trim(); if (t) blocks.push({ type: "text", content: t }); }
    blocks.push(m.block);
    cursor = m.end;
  }
  if (cursor < text.length) { const t = text.slice(cursor).trim(); if (t) blocks.push({ type: "text", content: t }); }
  if (blocks.length === 0 && text.trim()) return [{ type: "text", content: text.trim() }];
  return blocks;
}

function AriMessageContent({ text, isDark, isStreaming }: { text: string; isDark: boolean; isStreaming: boolean }) {
  const txt = isDark ? "#eaf2fc" : "#0c1c2c";
  const primary = isDark ? "#4a90ff" : "#1e6bff";
  const accent = isDark ? "rgba(74,144,255,0.16)" : "rgba(30,107,255,0.10)";
  const muted = isDark ? "rgba(28,44,64,0.55)" : "rgba(255,255,255,0.55)";
  const mutedBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.72)";
  const mutedTxt = isDark ? "#9db0c2" : "#5a6c7d";

  const blocks = parseAriBlocks(text);
  if (isStreaming && blocks.length === 1 && blocks[0].type === "text") {
    return (
      <View>
        <Text style={[s.msgText, { color: txt }]}>{text}</Text>
        <ActivityIndicator size="small" color={primary} style={{ alignSelf: "flex-start", marginTop: 4 }} />
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {blocks.map((block, i) => {
        if (block.type === "section") return (
          <View key={i} style={[s.sectionBlock, { borderLeftColor: primary, backgroundColor: accent }]}>
            {block.title ? <Text style={[s.sectionTitle, { color: primary }]}>{block.title}</Text> : null}
            <Text style={[s.sectionText, { color: txt }]}>{block.content}</Text>
          </View>
        );
        if (block.type === "claim") return (
          <View key={i} style={[s.claimBlock, { backgroundColor: accent, borderColor: primary + "40" }]}>
            <Feather name="check-circle" size={16} color={primary} />
            <Text style={[s.claimText, { color: txt }]}>{block.content}</Text>
          </View>
        );
        if (block.type === "step") return (
          <View key={i} style={s.stepBlock}>
            <LinearGradient colors={["#2a7bff","#12b5c9"]} style={s.stepDot}>
              <Text style={s.stepNum}>{i + 1}</Text>
            </LinearGradient>
            <Text style={[s.stepText, { color: txt }]}>{block.content}</Text>
          </View>
        );
        if (block.type === "citation") return (
          <View key={i} style={[s.citationBlock, { backgroundColor: muted, borderColor: mutedBorder }]}>
            <Feather name="book-open" size={14} color={primary} />
            <View style={{ flex: 1 }}>
              {block.source ? <Text style={[s.citationSource, { color: primary }]}>{block.source}</Text> : null}
              <Text style={[s.citationText, { color: mutedTxt }]}>{block.content}</Text>
            </View>
          </View>
        );
        return <Text key={i} style={[s.msgText, { color: txt }]}>{block.content}</Text>;
      })}
      {isStreaming && <ActivityIndicator size="small" color={primary} style={{ alignSelf: "flex-start" }} />}
    </View>
  );
}

const SUGGESTIONS = [
  "Differential for unexplained anemia",
  "Heart failure GDMT options",
  "Hyponatremia workup approach",
];

export default function AriScreen() {
  const colors = useColors();
  const { scheme, toggle: toggleTheme } = useTheme();
  const isDark = scheme === "dark";
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingIdRef = useRef<string | null>(null);
  const [attachments, setAttachments] = useState<Array<AriImageAttachment & { uri: string }>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { user } = useAuth();
  const userId = user?.id || "anonymous";
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<AriSession[]>([]);
  const sessionIdRef = useRef<string>(Date.now().toString());

  useEffect(() => {
    if (showHistory) loadSessions(userId).then(setSessions);
  }, [showHistory, userId]);

  function openSession(session: AriSession) {
    if (isStreaming) return;
    sessionIdRef.current = session.id;
    setMessages(session.messages.map(m => ({ ...m })));
    setShowHistory(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function removeSession(id: string) {
    await deleteSession(userId, id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (id === sessionIdRef.current) {
      sessionIdRef.current = Date.now().toString();
      setMessages([]);
    }
  }

  const txt = isDark ? "#eaf2fc" : "#0c1c2c";
  const txt2 = isDark ? "#9db0c2" : "#5a6c7d";
  const glassBg = isDark ? "rgba(28,44,64,0.55)" : "rgba(255,255,255,0.52)";
  const glassBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.72)";
  const inputBg = isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.88)";
  const primary = isDark ? "#4a90ff" : "#1e6bff";

  const MAX_ATTACHMENTS = 3;
  const MAX_IMAGE_B64_CHARS = 2.5 * 1024 * 1024; // keep in sync with the API's per-image cap

  async function pickImage() {
    if (attachments.length >= MAX_ATTACHMENTS) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.6,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    if (asset.base64.length > MAX_IMAGE_B64_CHARS) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "assistant",
        content: "That image is too large to send (max ~2 MB). Please pick a smaller one.",
      }]);
      return;
    }
    const mediaType = asset.mimeType && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(asset.mimeType)
      ? asset.mimeType
      : "image/jpeg";
    setAttachments(prev => [...prev, {
      mediaType,
      data: asset.base64!,
      // Use the picker's own URI for display (file:// on native, blob/data on
      // web) so we don't keep a second multi-MB base64 copy in chat state.
      uri: asset.uri,
    }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function toggleRecording() {
    if (isTranscribing) return;
    if (isRecording) {
      setIsRecording(false);
      setIsTranscribing(true);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
          const mime = Platform.OS === "web" ? "audio/webm" : "audio/m4a";
          const text = await transcribeAriAudio(uri, mime);
          if (text) setInput(prev => (prev ? prev + " " : "") + text);
        }
      } catch (e: any) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(), role: "assistant",
          content: e?.message || "Voice transcription failed. Please try again.",
        }]);
      } finally {
        setIsTranscribing(false);
      }
      return;
    }
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      setIsRecording(false);
    }
  }

  async function sendMessage(text?: string) {
    const q = (text ?? input).trim();
    if ((!q && attachments.length === 0) || isStreaming) return;
    const imgs = text ? [] : attachments;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: q || "(image)",
      imageUris: imgs.length ? imgs.map(a => a.uri) : undefined,
    };
    if (!text) { setInput(""); setAttachments([]); }
    setMessages(prev => [...prev, userMsg]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const assistantId = (Date.now() + 1).toString();
    streamingIdRef.current = assistantId;
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };
    setMessages(prev => [...prev, assistantMsg]);
    setIsStreaming(true);

    // Snapshot for persistence: capture the session id and message list now so
    // the save at stream completion is not affected by later navigation.
    const sessionId = sessionIdRef.current;
    const baseMsgs = [...messages, userMsg];

    let fullText = "";
    await streamAriChat(
      q, "ari", null,
      (delta) => {
        fullText += delta;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m));
      },
      () => {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m));
        setIsStreaming(false);
        if (fullText.trim()) {
          const finished = [...baseMsgs, { id: assistantId, role: "assistant" as const, content: fullText }]
            .filter(m => m.content)
            .map(({ id, role, content }) => ({ id, role, content }));
          const firstUser = finished.find(m => m.role === "user");
          saveSession(userId, {
            id: sessionId,
            title: (firstUser?.content || "Conversation").slice(0, 80),
            updatedAt: Date.now(),
            messages: finished,
          }).catch(() => {});
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      (err) => {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: err, streaming: false } : m));
        setIsStreaming(false);
      },
      imgs.length ? imgs.map(({ mediaType, data }) => ({ mediaType, data })) : undefined
    );
  }

  function clearChat() {
    sessionIdRef.current = Date.now().toString();
    setMessages([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <Animated.View entering={FadeInDown.duration(280).springify().damping(18)} style={[s.msgRow, isUser ? s.msgRowUser : s.msgRowAssistant]}>
        {!isUser && (
          <LinearGradient
            colors={["#2a7bff", "#12b5c9"]}
            style={s.ariAvatar}
          >
            <Text style={s.ariAvatarText}>Ari</Text>
          </LinearGradient>
        )}
        {isUser ? (
          <LinearGradient
            colors={["#2a7bff", "#12b5c9"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[s.msgBubble, s.msgBubbleUser]}
          >
            {item.imageUris?.length ? (
              <View style={s.msgImageRow}>
                {item.imageUris.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={s.msgImage} resizeMode="cover" />
                ))}
              </View>
            ) : null}
            {item.content !== "(image)" || !item.imageUris?.length ? (
              <Text style={s.msgTextUser}>{item.content}</Text>
            ) : null}
          </LinearGradient>
        ) : (
          <View style={[s.msgBubble, s.msgBubbleAssistant, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <AriMessageContent text={item.content} isDark={isDark} isStreaming={!!item.streaming} />
          </View>
        )}
      </Animated.View>
    );
  }, [isDark, glassBg, glassBorder]);

  const bgColors: [string, string, string] = isDark
    ? ["#0b2e4d", "#081a2c", "#03101d"]
    : ["#d8e8ff", "#f4f9ff", "#edfaff"];

  return (
    <View style={s.root}>
      {/* Background gradient */}
      <LinearGradient colors={bgColors} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      {/* Subtle radial glow */}
      <View style={[s.radialTL, { backgroundColor: isDark ? "rgba(18,58,90,0.45)" : "rgba(216,232,255,0.6)" }]} />
      <View style={[s.radialBR, { backgroundColor: isDark ? "rgba(11,73,72,0.25)" : "rgba(205,247,238,0.4)" }]} />

      {/* Header */}
      <View style={[s.header, { paddingTop: isWeb ? 67 : insets.top + 8 }]}>
        {isIOS ? (
          <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={[s.headerBlur, { borderBottomColor: glassBorder }]}>
            <HeaderContent txt={txt} txt2={txt2} isDark={isDark} messages={messages} clearChat={clearChat}
              onShowCapabilities={() => setShowCapabilities(true)} onShowHistory={() => setShowHistory(true)} onToggleTheme={toggleTheme} />
          </BlurView>
        ) : (
          <View style={[s.headerBlur, { backgroundColor: isDark ? "rgba(8,26,44,0.85)" : "rgba(244,249,255,0.85)", borderBottomColor: glassBorder }]}>
            <HeaderContent txt={txt} txt2={txt2} isDark={isDark} messages={messages} clearChat={clearChat}
              onShowCapabilities={() => setShowCapabilities(true)} onShowHistory={() => setShowHistory(true)} onToggleTheme={toggleTheme} />
          </View>
        )}
      </View>

      {/* Messages / empty state — both live in the same flex:1 region so the
          composer below never changes position between states */}
      {messages.length === 0 ? (
        <Animated.View entering={FadeIn.duration(350)} style={[s.emptyState, { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 }]}>
          {/* Glass logo chip with a gentle breathing pulse */}
          <PulsingLogo glassBg={glassBg} glassBorder={glassBorder} />
          <Animated.Text entering={FadeInDown.delay(80).duration(400)} style={[s.emptyTitle, { color: txt }]}>Ask Ari</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(160).duration(400)} style={[s.emptyDesc, { color: txt2 }]}>
            Evidence-based clinical decision support. Cited, fail-closed, multi-language.
          </Animated.Text>
          <View style={s.suggestionsGrid}>
            {SUGGESTIONS.map((sg, i) => (
              <Animated.View key={i} entering={FadeInDown.delay(240 + i * 90).duration(400)}>
              <TouchableOpacity
                onPress={() => sendMessage(sg)}
                activeOpacity={0.75}
              >
                {isIOS ? (
                  <BlurView intensity={45} tint={isDark ? "dark" : "light"} style={[s.suggestion, { borderColor: glassBorder }]}>
                    <Feather name="arrow-right-circle" size={15} color={primary} style={{ marginRight: 8 }} />
                    <Text style={[s.suggestionText, { color: txt }]}>{sg}</Text>
                  </BlurView>
                ) : (
                  <View style={[s.suggestion, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                    <Feather name="arrow-right-circle" size={15} color={primary} style={{ marginRight: 8 }} />
                    <Text style={[s.suggestionText, { color: txt }]}>{sg}</Text>
                  </View>
                )}
              </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={[...messages].reverse()}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={[s.messageList, {
            paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84,
            paddingTop: 12,
          }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        {isIOS ? (
          <BlurView intensity={70} tint={isDark ? "dark" : "light"} style={[s.inputBar, { borderTopColor: glassBorder, paddingBottom: isWeb ? 84 + 12 : insets.bottom + 82 + 8 }]}>
            <InputRow input={input} setInput={setInput} isStreaming={isStreaming} onSend={() => sendMessage()} isDark={isDark} glassBorder={glassBorder} inputBg={inputBg} txt={txt} txt2={txt2}
              attachments={attachments} onRemoveAttachment={(i: number) => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
              onPickImage={pickImage} onToggleRecording={toggleRecording} isRecording={isRecording} isTranscribing={isTranscribing} />
          </BlurView>
        ) : (
          <View style={[s.inputBar, { backgroundColor: isDark ? "rgba(8,26,44,0.92)" : "rgba(244,249,255,0.92)", borderTopColor: glassBorder, paddingBottom: isWeb ? 84 + 12 : insets.bottom + 82 + 8 }]}>
            <InputRow input={input} setInput={setInput} isStreaming={isStreaming} onSend={() => sendMessage()} isDark={isDark} glassBorder={glassBorder} inputBg={inputBg} txt={txt} txt2={txt2}
              attachments={attachments} onRemoveAttachment={(i: number) => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
              onPickImage={pickImage} onToggleRecording={toggleRecording} isRecording={isRecording} isTranscribing={isTranscribing} />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* What can Ari do */}
      <Modal visible={showCapabilities} animationType="slide" transparent onRequestClose={() => setShowCapabilities(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: isDark ? "#0c2036" : "#f4f9ff", paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: txt }]}>What can Ari do?</Text>
              <TouchableOpacity onPress={() => setShowCapabilities(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={22} color={txt2} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
              {ARI_CAPABILITIES.map(cap => (
                <View key={cap.id} style={[s.capCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                  <View style={s.capHeader}>
                    <LinearGradient colors={["#2a7bff", "#12b5c9"]} style={s.capIcon}>
                      <Feather name={cap.icon} size={16} color="#fff" />
                    </LinearGradient>
                    <Text style={[s.capName, { color: txt }]}>{cap.displayName}</Text>
                  </View>
                  <Text style={[s.capDesc, { color: txt2 }]}>{cap.shortDescription}</Text>
                  {cap.exampleQueries.map((q, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.capExample, { borderColor: glassBorder }]}
                      onPress={() => { setShowCapabilities(false); sendMessage(q); }}
                      activeOpacity={0.75}
                    >
                      <Feather name="arrow-right-circle" size={13} color={primary} style={{ marginRight: 7 }} />
                      <Text style={[s.capExampleText, { color: txt }]}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* History */}
      <Modal visible={showHistory} animationType="slide" transparent onRequestClose={() => setShowHistory(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: isDark ? "#0c2036" : "#f4f9ff", paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: txt }]}>History</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={22} color={txt2} />
              </TouchableOpacity>
            </View>
            {sessions.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
                <Feather name="clock" size={28} color={txt2} />
                <Text style={{ color: txt2, fontFamily: "Inter_400Regular", fontSize: 14 }}>No past conversations yet</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
                {sessions.map(session => (
                  <View key={session.id} style={[s.historyRow, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => openSession(session)} activeOpacity={0.75}>
                      <Text style={[s.historyTitle, { color: txt }]} numberOfLines={1}>{session.title}</Text>
                      <Text style={[s.historyMeta, { color: txt2 }]}>
                        {new Date(session.updatedAt).toLocaleDateString()} · {session.messages.length} messages
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeSession(session.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="trash-2" size={16} color={txt2} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PulsingLogo({ glassBg, glassBorder }: { glassBg: string; glassBorder: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[s.emptyIcon, { backgroundColor: glassBg, borderColor: glassBorder }, style]}>
      <LinearGradient colors={["#2a7bff","#12b5c9"]} style={s.emptyGrad}>
        <Image source={require("@/assets/images/aribot-mark.png")} style={{ width: 30, height: 30 }} resizeMode="contain" />
      </LinearGradient>
    </Animated.View>
  );
}

function RecordingDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.25, { duration: 500 }), withTiming(1, { duration: 500 })),
      -1
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[s.recDot, style]} />;
}

function HeaderContent({ txt, txt2, isDark, messages, clearChat, onShowCapabilities, onShowHistory, onToggleTheme }: any) {
  const hit = { top: 8, bottom: 8, left: 8, right: 8 };
  return (
    <View style={s.headerInner}>
      <View style={{ flex: 1 }}>
        <Text style={[s.headerTitle, { color: txt }]}>Ask Ari</Text>
        <Text style={[s.headerSub, { color: txt2 }]}>Clinical AI assistant · V4.0</Text>
      </View>
      <TouchableOpacity onPress={onShowCapabilities} style={s.clearBtn} hitSlop={hit} accessibilityLabel="What can Ari do">
        <Feather name="help-circle" size={19} color={txt2} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onShowHistory} style={s.clearBtn} hitSlop={hit} accessibilityLabel="Chat history">
        <Feather name="clock" size={19} color={txt2} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onToggleTheme} style={s.clearBtn} hitSlop={hit} accessibilityLabel="Toggle light or dark mode">
        <Feather name={isDark ? "sun" : "moon"} size={19} color={txt2} />
      </TouchableOpacity>
      {messages.length > 0 && (
        <TouchableOpacity onPress={clearChat} style={s.clearBtn} hitSlop={hit} accessibilityLabel="New chat">
          <Feather name="trash-2" size={18} color={txt2} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function InputRow({ input, setInput, isStreaming, onSend, isDark, glassBorder, inputBg, txt, txt2,
  attachments, onRemoveAttachment, onPickImage, onToggleRecording, isRecording, isTranscribing }: any) {
  const canSend = !isStreaming && (input.trim() || attachments?.length);
  return (
    <View>
      {attachments?.length ? (
        <View style={s.attachRow}>
          {attachments.map((a: any, i: number) => (
            <Animated.View key={i} entering={FadeIn.duration(200)} style={s.attachChip}>
              <Image source={{ uri: a.uri }} style={s.attachThumb} resizeMode="cover" />
              <TouchableOpacity style={s.attachRemove} onPress={() => onRemoveAttachment(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Feather name="x" size={11} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      ) : null}
      {isRecording ? (
        <View style={s.recBanner}>
          <RecordingDot />
          <Text style={{ color: txt2, fontSize: 12, fontFamily: "Inter_500Medium" }}>Listening... tap the mic to finish</Text>
        </View>
      ) : null}
      <View style={s.inputRow}>
        <TouchableOpacity onPress={onPickImage} disabled={isStreaming} style={s.utilBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} accessibilityLabel="Attach image">
          <Feather name="image" size={20} color={txt2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleRecording} disabled={isStreaming} style={s.utilBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} accessibilityLabel="Voice input">
          {isTranscribing
            ? <ActivityIndicator size="small" color={txt2} />
            : <Feather name="mic" size={20} color={isRecording ? "#e5484d" : txt2} />}
        </TouchableOpacity>
        <TextInput
          style={[s.inputField, { backgroundColor: inputBg, color: txt, borderColor: isRecording ? "#e5484d" : glassBorder }]}
          value={input}
          onChangeText={setInput}
          placeholder={isRecording ? "Listening..." : "Ask a clinical question..."}
          placeholderTextColor={isDark ? "#68798c" : "#93a2b1"}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity
          onPress={onSend}
          disabled={!canSend}
          activeOpacity={0.8}
          style={[!canSend && { opacity: 0.45 }]}
        >
          <LinearGradient
            colors={["#2a7bff","#12b5c9"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.sendBtn}
          >
            {isStreaming
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="send" size={18} color="#fff" />}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  radialTL: { position: "absolute", width: 320, height: 320, top: -60, left: -80, borderRadius: 999 },
  radialBR: { position: "absolute", width: 260, height: 260, bottom: 80, right: -60, borderRadius: 999 },
  header: { zIndex: 10 },
  headerBlur: { borderBottomWidth: 1 },
  headerInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14, paddingTop: 8, gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  clearBtn: { padding: 6 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 14 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, overflow: "hidden", borderWidth: 1, marginBottom: 4 },
  emptyGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 26, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, maxWidth: 280 },
  suggestionsGrid: { width: "100%", gap: 9, marginTop: 4 },
  suggestion: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  suggestionText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  messageList: { paddingHorizontal: 16 },
  msgRow: { flexDirection: "row", marginBottom: 14, gap: 10 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAssistant: { justifyContent: "flex-start" },
  ariAvatar: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", marginTop: 2 },
  ariAvatarText: { color: "#fff", fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  msgBubble: { maxWidth: "82%", borderRadius: 18, padding: 14 },
  msgBubbleUser: { borderBottomRightRadius: 5 },
  msgBubbleAssistant: { borderBottomLeftRadius: 5, borderWidth: 1 },
  msgText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  msgTextUser: { color: "#fff", fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  sectionBlock: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8, paddingRight: 8, borderRadius: 8, gap: 4 },
  sectionTitle: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  claimBlock: { flexDirection: "row", alignItems: "flex-start", padding: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  claimText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  stepBlock: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNum: { color: "#fff", fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  stepText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  citationBlock: { flexDirection: "row", padding: 10, borderRadius: 10, borderWidth: 1, gap: 8, alignItems: "flex-start" },
  citationSource: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  citationText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  inputBar: { borderTopWidth: 1 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 14, paddingTop: 12, gap: 10 },
  inputField: { flex: 1, borderRadius: 18, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13, fontSize: 15, maxHeight: 120, borderWidth: 1, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(3,16,29,0.45)" },
  modalSheet: { maxHeight: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 18 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  modalTitle: { fontSize: 19, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  capCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  capHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  capIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  capName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  capDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  capExample: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 },
  capExampleText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_400Regular", lineHeight: 17 },
  historyRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  msgImageRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  msgImage: { width: 120, height: 120, borderRadius: 12 },
  attachRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 10 },
  attachChip: { width: 54, height: 54, borderRadius: 12, overflow: "hidden" },
  attachThumb: { width: "100%", height: "100%" },
  attachRemove: { position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
  recBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingTop: 10 },
  recDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#e5484d" },
  utilBtn: { width: 38, height: 46, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },
  historyTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historyMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  sendBtn: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", alignSelf: "flex-end", shadowColor: "rgba(30,90,200,0.4)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 6 },
});
