import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { streamAriChat } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "ari";
  text: string;
  streaming?: boolean;
  error?: string;
}

/**
 * Ari answers in prose with occasional single-line JSON markers
 * ({"ari_section": ...}, {"ari_claim": ...}, {"ari_citation": ...},
 * {"ari_step": ...}). The renderer turns those into headings, steps and
 * sources and leaves everything else as text.
 */
function AriText({ text }: { text: string }) {
  const c = useColors();
  const blocks: React.ReactNode[] = [];
  let prose: string[] = [];
  const flush = () => {
    const body = prose.join("\n").trim();
    if (body) blocks.push(<Text key={`p${blocks.length}`} style={[styles.ariBody, { color: c.foreground }]}>{body}</Text>);
    prose = [];
  };
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = null;
      }
      if (parsed) {
        flush();
        if (typeof parsed.ari_section === "string") {
          blocks.push(<Text key={`s${blocks.length}`} style={[styles.ariSection, { color: c.primary }]}>{parsed.ari_section.replace(/_/g, " ")}</Text>);
        } else if (typeof parsed.ari_claim === "string") {
          blocks.push(<Text key={`c${blocks.length}`} style={[styles.ariBody, { color: c.foreground }]}>{parsed.ari_claim}</Text>);
        } else if (typeof parsed.ari_citation === "string") {
          blocks.push(<Text key={`t${blocks.length}`} style={[styles.ariCite, { color: c.mutedForeground }]}>Source: {parsed.ari_citation}{typeof parsed.evidence_class === "string" ? ` (${parsed.evidence_class})` : ""}</Text>);
        } else if (typeof parsed.ari_step === "number") {
          blocks.push(<Text key={`n${blocks.length}`} style={[styles.ariBody, { color: c.foreground }]}>{parsed.ari_step}. {typeof parsed.description === "string" ? parsed.description : ""}</Text>);
        }
        continue;
      }
    }
    prose.push(line.replace(/<\/?ari_section[^>]*>/g, ""));
  }
  flush();
  return <View style={{ gap: 6 }}>{blocks}</View>;
}

export default function AriScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState(typeof prompt === "string" ? prompt : "");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function send() {
    const query = draft.trim();
    if (!query || busy) return;
    setDraft("");
    setBusy(true);
    const ariId = `${Date.now()}-ari`;
    setMessages((prev) => [...prev, { id: `${Date.now()}-user`, role: "user", text: query }, { id: ariId, role: "ari", text: "", streaming: true }]);
    const update = (fn: (m: Message) => Message) => setMessages((prev) => prev.map((m) => (m.id === ariId ? fn(m) : m)));
    try {
      await streamAriChat(query, {
        onDelta: (delta) => update((m) => ({ ...m, text: m.text + delta })),
        onDone: () => update((m) => ({ ...m, streaming: false })),
        onError: (message) => update((m) => ({ ...m, streaming: false, error: message })),
      });
    } catch (err) {
      update((m) => ({ ...m, streaming: false, error: err instanceof Error ? err.message : "Ari is unavailable." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      back
      title="Ask Ari"
      subtitle="Stewardship questions, no patient identifiers"
      scroll={false}
      testID="screen-ari"
      footer={
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
          <View style={[styles.composer, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: insets.bottom + 10 }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask about dosing, spectrum, duration or de-escalation"
              placeholderTextColor={c.mutedForeground}
              multiline
              style={[styles.input, { backgroundColor: c.input, color: c.foreground, borderColor: c.border }]}
              testID="input-ari"
            />
            <Pressable onPress={send} disabled={busy || !draft.trim()} style={[styles.send, { backgroundColor: c.primary, opacity: busy || !draft.trim() ? 0.5 : 1 }]} accessibilityRole="button" testID="button-ari-send">
              <Feather name="send" size={18} color={c.primaryForeground} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      }
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
        {messages.length === 0 ? (
          <View style={[styles.hint, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.hintTitle, { color: c.foreground }]}>Ari knows the stewardship knowledge base</Text>
            <Text style={[styles.hintBody, { color: c.mutedForeground }]}>
              Try: "When can I switch IV ceftriaxone to oral therapy in community-acquired pneumonia?" or "Which beta-lactams are safe after a penicillin rash?" Keep names and record numbers out of the question.
            </Text>
          </View>
        ) : null}
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.role === "user"
                ? { alignSelf: "flex-end", backgroundColor: c.primary }
                : { alignSelf: "stretch", backgroundColor: c.card, borderColor: c.cardBorder, borderWidth: 1 },
            ]}
            testID={`message-${m.role}`}
          >
            {m.role === "user" ? (
              <Text style={[styles.userText, { color: c.primaryForeground }]}>{m.text}</Text>
            ) : m.text ? (
              <AriText text={m.text} />
            ) : m.streaming ? (
              <Text style={[styles.ariBody, { color: c.mutedForeground }]}>Ari is thinking…</Text>
            ) : null}
            {m.error ? <Text style={[styles.error, { color: c.bad }]}>{m.error}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  thread: { padding: 16, gap: 10, paddingBottom: 24 },
  hint: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
  hintTitle: { fontSize: 15, fontFamily: fonts.semibold },
  hintBody: { fontSize: 13, fontFamily: fonts.regular, lineHeight: 19 },
  bubble: { maxWidth: "92%", borderRadius: 16, padding: 12 },
  userText: { fontSize: 15, fontFamily: fonts.regular, lineHeight: 21 },
  ariBody: { fontSize: 14, fontFamily: fonts.regular, lineHeight: 21 },
  ariSection: { fontSize: 12, fontFamily: fonts.semibold, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 6 },
  ariCite: { fontSize: 12, fontFamily: fonts.regular, fontStyle: "italic" },
  error: { fontSize: 13, fontFamily: fonts.medium, marginTop: 6 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: fonts.regular },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
