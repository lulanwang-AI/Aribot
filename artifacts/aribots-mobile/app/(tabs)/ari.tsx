import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetch as expoFetch } from "expo/fetch";
import { Feather } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { ModeGradient, BrandMark } from "@/components/Brand";
import { API_BASE, getCookie } from "@/lib/api";

type Mode = "ari" | "er";
type Role = "user" | "assistant";
type Msg = { id: string; role: Role; text: string; mode: Mode };

const newId = () => Date.now().toString() + Math.random().toString(36).slice(2, 9);

export default function AriScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("ari");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const aborterRef = useRef<AbortController | null>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: Msg = { id: newId(), role: "user", text, mode };
    const aiMsg: Msg = { id: newId(), role: "assistant", text: "", mode };
    const history = [...messages, userMsg];
    setMessages([...history, aiMsg]);
    setStreaming(true);

    const ac = new AbortController();
    aborterRef.current = ac;

    try {
      const cookie = await getCookie();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      };
      if (cookie) headers["Cookie"] = cookie;

      const body = {
        capability: "auto",
        mode,
        messages: history.map((m) => ({ role: m.role, content: m.text })),
      };

      const res = await expoFetch(`${API_BASE}/api/ari/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Ari request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            const delta: string =
              evt.delta || evt.text || evt.content || evt.token || "";
            if (delta) {
              setMessages((cur) =>
                cur.map((m) => (m.id === aiMsg.id ? { ...m, text: m.text + delta } : m)),
              );
            }
          } catch {
            setMessages((cur) =>
              cur.map((m) => (m.id === aiMsg.id ? { ...m, text: m.text + payload } : m)),
            );
          }
        }
      }
    } catch (e: any) {
      setMessages((cur) =>
        cur.map((m) =>
          m.id === aiMsg.id
            ? { ...m, text: m.text || `Sorry — Ari is offline. ${e?.message || ""}` }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
      aborterRef.current = null;
    }
  }, [input, messages, mode, streaming]);

  function clearChat() {
    if (streaming) aborterRef.current?.abort();
    setMessages([]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <BrandMark size={28} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ari</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={clearChat} hitSlop={10}>
          <Feather name="refresh-ccw" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.modeRow}>
        <ModeToggle mode={mode} onChange={setMode} />
      </View>

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <ModeGradient mode={mode} style={styles.emptyHero}>
            <Text style={styles.emptyHeroText}>
              {mode === "er" ? "ER Mode" : "Clinical Consult"}
            </Text>
          </ModeGradient>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {mode === "er"
              ? "Rapid emergency reasoning"
              : "Evidence-grounded clinical answers"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Ask about a differential, drug interaction, dose, or guideline. Ari is for verified clinicians.
          </Text>
        </View>
      ) : (
        <FlatList
          inverted
          data={[...messages].reverse()}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <Bubble msg={item} />}
        />
      )}

      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0}>
        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={mode === "er" ? "Describe the emergency presentation…" : "Ask Ari a clinical question…"}
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
          />
          <Pressable
            onPress={send}
            disabled={streaming || !input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor:
                  !input.trim() || streaming ? colors.muted : colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {streaming ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Feather
                name="arrow-up"
                size={20}
                color={!input.trim() ? colors.mutedForeground : colors.primaryForeground}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.toggle, { backgroundColor: colors.muted }]}>
      {(["ari", "er"] as Mode[]).map((m) => {
        const active = m === mode;
        return (
          <Pressable key={m} onPress={() => onChange(m)} style={{ flex: 1 }}>
            {active ? (
              <ModeGradient mode={m} style={styles.toggleActive}>
                <Text style={styles.toggleActiveText}>{m === "er" ? "ER Mode" : "Ari"}</Text>
              </ModeGradient>
            ) : (
              <View style={styles.toggleInactive}>
                <Text style={[styles.toggleInactiveText, { color: colors.mutedForeground }]}>
                  {m === "er" ? "ER Mode" : "Ari"}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const colors = useColors();
  const isUser = msg.role === "user";
  return (
    <View style={[styles.bubbleRow, { justifyContent: isUser ? "flex-end" : "flex-start" }]}>
      {isUser ? (
        <View style={[styles.bubbleUser, { backgroundColor: colors.primary }]}>
          <Text style={[styles.bubbleText, { color: colors.primaryForeground }]}>{msg.text}</Text>
        </View>
      ) : (
        <View style={[styles.bubbleAi, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <BrandMark size={16} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>
              {msg.mode === "er" ? "Ari • ER" : "Ari"}
            </Text>
          </View>
          <Text style={[styles.bubbleText, { color: colors.foreground }]}>
            {msg.text || "…"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modeRow: { paddingHorizontal: 16, paddingVertical: 12 },
  toggle: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleActive: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleActiveText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  toggleInactive: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleInactiveText: { fontFamily: "Inter_500Medium", fontSize: 14 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyHero: { paddingVertical: 28, paddingHorizontal: 28, borderRadius: 20 },
  emptyHeroText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 22 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center", marginTop: 8 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20, fontFamily: "Inter_400Regular" },

  bubbleRow: { flexDirection: "row" },
  bubbleUser: {
    maxWidth: "85%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    maxWidth: "92%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: { fontSize: 15, lineHeight: 21, fontFamily: "Inter_400Regular" },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 140,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    borderRadius: 20,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
