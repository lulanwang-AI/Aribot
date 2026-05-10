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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { streamAriChat } from "@/lib/api";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AriMode = "ari" | "er";
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
  let remaining = text;

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
      if (p.type === "section") {
        allMatches.push({ index: m.index, end: m.index + m[0].length, block: { type: "section", title: m[1], content: m[2].trim() } });
      } else if (p.type === "claim") {
        allMatches.push({ index: m.index, end: m.index + m[0].length, block: { type: "claim", content: m[1].trim() } });
      } else if (p.type === "step") {
        allMatches.push({ index: m.index, end: m.index + m[0].length, block: { type: "step", content: m[1].trim() } });
      } else if (p.type === "citation") {
        allMatches.push({ index: m.index, end: m.index + m[0].length, block: { type: "citation", source: m[1], content: m[2].trim() } });
      }
    }
  }

  allMatches.sort((a, b) => a.index - b.index);
  let cursor = 0;
  for (const m of allMatches) {
    if (m.index > cursor) {
      const textContent = text.slice(cursor, m.index).trim();
      if (textContent) blocks.push({ type: "text", content: textContent });
    }
    blocks.push(m.block);
    cursor = m.end;
  }
  if (cursor < text.length) {
    const textContent = text.slice(cursor).trim();
    if (textContent) blocks.push({ type: "text", content: textContent });
  }

  if (blocks.length === 0 && text.trim()) {
    return [{ type: "text", content: text.trim() }];
  }
  return blocks;
}

function AriMessageContent({ text, colors, isStreaming }: { text: string; colors: any; isStreaming: boolean }) {
  const blocks = parseAriBlocks(text);
  if (isStreaming && blocks.length === 1 && blocks[0].type === "text") {
    return (
      <View>
        <Text style={[styles.msgText, { color: colors.foreground }]}>{text}</Text>
        <View style={styles.streamingDot}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {blocks.map((block, i) => {
        if (block.type === "section") return (
          <View key={i} style={[styles.sectionBlock, { borderLeftColor: colors.primary, backgroundColor: colors.accent }]}>
            {block.title ? <Text style={[styles.sectionTitle, { color: colors.primary }]}>{block.title}</Text> : null}
            <Text style={[styles.sectionText, { color: colors.foreground }]}>{block.content}</Text>
          </View>
        );
        if (block.type === "claim") return (
          <View key={i} style={[styles.claimBlock, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <Feather name="check-circle" size={14} color={colors.primary} />
            <Text style={[styles.claimText, { color: colors.foreground }]}>{block.content}</Text>
          </View>
        );
        if (block.type === "step") return (
          <View key={i} style={styles.stepBlock}>
            <View style={[styles.stepDot, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNum}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.foreground }]}>{block.content}</Text>
          </View>
        );
        if (block.type === "citation") return (
          <View key={i} style={[styles.citationBlock, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="book-open" size={12} color={colors.mutedForeground} />
            <View style={{ flex: 1 }}>
              {block.source ? <Text style={[styles.citationSource, { color: colors.primary }]}>{block.source}</Text> : null}
              <Text style={[styles.citationText, { color: colors.mutedForeground }]}>{block.content}</Text>
            </View>
          </View>
        );
        return <Text key={i} style={[styles.msgText, { color: colors.foreground }]}>{block.content}</Text>;
      })}
      {isStreaming && <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: "flex-start" }} />}
    </View>
  );
}

export default function AriScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [mode, setMode] = useState<AriMode>("ari");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingIdRef = useRef<string | null>(null);

  const isER = mode === "er";
  const gradientBg = isER
    ? ["#7F1D1D", "#DC2626", "#EA580C"]
    : ["#1E3A8A", "#2563EB", "#0EA5E9"];

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };
    const query = input.trim();
    setInput("");
    setMessages(prev => [...prev, userMsg]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const assistantId = (Date.now() + 1).toString();
    streamingIdRef.current = assistantId;
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };
    setMessages(prev => [...prev, assistantMsg]);
    setIsStreaming(true);

    let fullText = "";
    await streamAriChat(
      query,
      mode,
      null,
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
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
        {!isUser && (
          <View style={[styles.ariAvatar, { backgroundColor: isER ? colors.erGradientMid : colors.primary }]}>
            <Text style={styles.ariAvatarText}>{isER ? "ER" : "Ari"}</Text>
          </View>
        )}
        <View style={[
          styles.msgBubble,
          isUser
            ? [styles.msgBubbleUser, { backgroundColor: isER ? colors.erGradientMid : colors.primary }]
            : [styles.msgBubbleAssistant, { backgroundColor: colors.card, borderColor: colors.border }]
        ]}>
          {isUser
            ? <Text style={styles.msgTextUser}>{item.content}</Text>
            : <AriMessageContent text={item.content} colors={colors} isStreaming={!!item.streaming} />
          }
        </View>
      </View>
    );
  }, [colors, isER]);

  const modeBarBg = isER
    ? "rgba(220,38,38,0.15)"
    : "rgba(37,99,235,0.12)";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 4, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{isER ? "ER Mode" : "Ari"}</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {isER ? "Emergency decision support" : "Clinical AI assistant"}
          </Text>
        </View>
        <View style={[styles.modeToggle, { backgroundColor: colors.muted }]}>
          <TouchableOpacity
            style={[styles.modeBtn, !isER && { backgroundColor: colors.primary }]}
            onPress={() => { setMode("ari"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.modeBtnText, { color: !isER ? "#fff" : colors.mutedForeground }]}>Ari</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, isER && { backgroundColor: "#DC2626" }]}
            onPress={() => { setMode("er"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.modeBtnText, { color: isER ? "#fff" : colors.mutedForeground }]}>ER</Text>
          </TouchableOpacity>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
            <Feather name="trash-2" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {messages.length === 0 ? (
        <View style={[styles.emptyState, { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 }]}>
          <View style={[styles.emptyIcon, { backgroundColor: isER ? "#DC2626" + "18" : colors.accent }]}>
            <Feather name={isER ? "activity" : "cpu"} size={32} color={isER ? "#DC2626" : colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {isER ? "ER Mode Active" : "Ask Ari"}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            {isER
              ? "Rapid assessment. Life-threatening diagnoses first."
              : "Evidence-based clinical decision support for physicians."}
          </Text>
          <View style={styles.suggestionsGrid}>
            {(isER
              ? ["Chest pain rule-out protocol", "Sepsis criteria & management", "Stroke code protocol"]
              : ["Differential for unexplained anemia", "Heart failure GDMT options", "Hyponatremia workup approach"]
            ).map((s, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.suggestion, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setInput(s)}
              >
                <Text style={[styles.suggestionText, { color: colors.foreground }]}>{s}</Text>
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
          contentContainerStyle={[styles.messageList, {
            paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84,
            paddingTop: 12,
          }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!!messages.length}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.inputBar, {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: isWeb ? 34 : insets.bottom + 8,
        }]}>
          <TextInput
            style={[styles.inputField, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            value={input}
            onChangeText={setInput}
            placeholder={isER ? "Describe the emergency..." : "Ask a clinical question..."}
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: isER ? "#DC2626" : colors.primary }, (isStreaming || !input.trim()) && { opacity: 0.5 }]}
            onPress={sendMessage}
            disabled={isStreaming || !input.trim()}
            activeOpacity={0.8}
          >
            {isStreaming
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modeToggle: { flexDirection: "row", borderRadius: 10, padding: 3 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  modeBtnText: { fontSize: 13, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  clearBtn: { padding: 8 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 22, fontWeight: "700" as const, fontFamily: "Inter_700Bold", textAlign: "center" as const },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" as const, lineHeight: 21 },
  suggestionsGrid: { width: "100%", gap: 8, marginTop: 8 },
  suggestion: { padding: 14, borderRadius: 12, borderWidth: 1 },
  suggestionText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  messageList: { paddingHorizontal: 16 },
  msgRow: { flexDirection: "row", marginBottom: 12, gap: 10 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAssistant: { justifyContent: "flex-start" },
  ariAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", marginTop: 2 },
  ariAvatarText: { color: "#fff", fontSize: 10, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  msgBubble: { maxWidth: "82%", borderRadius: 16, padding: 14 },
  msgBubbleUser: { borderBottomRightRadius: 4 },
  msgBubbleAssistant: { borderBottomLeftRadius: 4, borderWidth: 1 },
  msgText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  msgTextUser: { color: "#fff", fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  streamingDot: { marginTop: 4 },
  sectionBlock: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8, paddingRight: 8, borderRadius: 6, gap: 4 },
  sectionTitle: { fontSize: 12, fontWeight: "700" as const, fontFamily: "Inter_700Bold", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  sectionText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  claimBlock: { flexDirection: "row", alignItems: "flex-start", padding: 10, borderRadius: 8, borderWidth: 1, gap: 8 },
  claimText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  stepBlock: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNum: { color: "#fff", fontSize: 11, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  stepText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  citationBlock: { flexDirection: "row", padding: 10, borderRadius: 8, borderWidth: 1, gap: 8, alignItems: "flex-start" },
  citationSource: { fontSize: 12, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  citationText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, gap: 10 },
  inputField: { flex: 1, borderRadius: 14, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 15, maxHeight: 120, borderWidth: 1, fontFamily: "Inter_400Regular" },
  sendBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },
});
