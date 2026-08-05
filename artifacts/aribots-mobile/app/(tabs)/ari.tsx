import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useColorScheme,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { streamAriChat } from "@/lib/api";
import * as Haptics from "expo-haptics";

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  streaming?: boolean;
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingIdRef = useRef<string | null>(null);

  const txt = isDark ? "#eaf2fc" : "#0c1c2c";
  const txt2 = isDark ? "#9db0c2" : "#5a6c7d";
  const glassBg = isDark ? "rgba(28,44,64,0.55)" : "rgba(255,255,255,0.52)";
  const glassBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.72)";
  const inputBg = isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.88)";
  const primary = isDark ? "#4a90ff" : "#1e6bff";

  async function sendMessage(text?: string) {
    const q = (text ?? input).trim();
    if (!q || isStreaming) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: q };
    if (!text) setInput("");
    setMessages(prev => [...prev, userMsg]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const assistantId = (Date.now() + 1).toString();
    streamingIdRef.current = assistantId;
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };
    setMessages(prev => [...prev, assistantMsg]);
    setIsStreaming(true);

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      (err) => {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: err, streaming: false } : m));
        setIsStreaming(false);
      }
    );
  }

  function clearChat() {
    setMessages([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[s.msgRow, isUser ? s.msgRowUser : s.msgRowAssistant]}>
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
            <Text style={s.msgTextUser}>{item.content}</Text>
          </LinearGradient>
        ) : (
          <View style={[s.msgBubble, s.msgBubbleAssistant, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <AriMessageContent text={item.content} isDark={isDark} isStreaming={!!item.streaming} />
          </View>
        )}
      </View>
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
            <HeaderContent txt={txt} txt2={txt2} glassBg={glassBg} glassBorder={glassBorder} isDark={isDark} messages={messages} clearChat={clearChat} />
          </BlurView>
        ) : (
          <View style={[s.headerBlur, { backgroundColor: isDark ? "rgba(8,26,44,0.85)" : "rgba(244,249,255,0.85)", borderBottomColor: glassBorder }]}>
            <HeaderContent txt={txt} txt2={txt2} glassBg={glassBg} glassBorder={glassBorder} isDark={isDark} messages={messages} clearChat={clearChat} />
          </View>
        )}
      </View>

      {/* Messages / empty state */}
      {messages.length === 0 ? (
        <View style={[s.emptyState, { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 }]}>
          {/* Glass logo chip */}
          <View style={[s.emptyIcon, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <LinearGradient colors={["#2a7bff","#12b5c9"]} style={s.emptyGrad}>
              <Image source={require("@/assets/images/aribot-mark.png")} style={{ width: 30, height: 30 }} resizeMode="contain" />
            </LinearGradient>
          </View>
          <Text style={[s.emptyTitle, { color: txt }]}>Ask Ari</Text>
          <Text style={[s.emptyDesc, { color: txt2 }]}>
            Evidence-based clinical decision support. Cited, fail-closed, multi-language.
          </Text>
          <View style={s.suggestionsGrid}>
            {SUGGESTIONS.map((sg, i) => (
              <TouchableOpacity
                key={i}
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
            ))}
          </View>
        </View>
      ) : (
        <FlatList
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
          <BlurView intensity={70} tint={isDark ? "dark" : "light"} style={[s.inputBar, { borderTopColor: glassBorder, paddingBottom: isWeb ? 34 : insets.bottom + 8 }]}>
            <InputRow input={input} setInput={setInput} isStreaming={isStreaming} onSend={() => sendMessage()} isDark={isDark} glassBorder={glassBorder} inputBg={inputBg} txt={txt} txt2={txt2} />
          </BlurView>
        ) : (
          <View style={[s.inputBar, { backgroundColor: isDark ? "rgba(8,26,44,0.92)" : "rgba(244,249,255,0.92)", borderTopColor: glassBorder, paddingBottom: isWeb ? 34 : insets.bottom + 8 }]}>
            <InputRow input={input} setInput={setInput} isStreaming={isStreaming} onSend={() => sendMessage()} isDark={isDark} glassBorder={glassBorder} inputBg={inputBg} txt={txt} txt2={txt2} />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function HeaderContent({ txt, txt2, messages, clearChat }: any) {
  return (
    <View style={s.headerInner}>
      <View style={{ flex: 1 }}>
        <Text style={[s.headerTitle, { color: txt }]}>Ask Ari</Text>
        <Text style={[s.headerSub, { color: txt2 }]}>Clinical AI assistant · V4.0</Text>
      </View>
      {messages.length > 0 && (
        <TouchableOpacity onPress={clearChat} style={s.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="trash-2" size={18} color={txt2} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function InputRow({ input, setInput, isStreaming, onSend, isDark, glassBorder, inputBg, txt, txt2 }: any) {
  return (
    <View style={s.inputRow}>
      <TextInput
        style={[s.inputField, { backgroundColor: inputBg, color: txt, borderColor: glassBorder }]}
        value={input}
        onChangeText={setInput}
        placeholder="Ask a clinical question..."
        placeholderTextColor={isDark ? "#68798c" : "#93a2b1"}
        multiline
        maxLength={2000}
        returnKeyType="default"
      />
      <TouchableOpacity
        onPress={onSend}
        disabled={isStreaming || !input.trim()}
        activeOpacity={0.8}
        style={[(isStreaming || !input.trim()) && { opacity: 0.45 }]}
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
  sendBtn: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", alignSelf: "flex-end", shadowColor: "rgba(30,90,200,0.4)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 6 },
});
