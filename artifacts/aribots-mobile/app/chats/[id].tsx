import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

type Message = { id: string; content: string; senderId: string; createdAt: string };
type Thread = { id: string; messages: Message[]; peer?: { id: string; name: string } };

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const q = useQuery<Thread>({
    queryKey: ["chat", id],
    queryFn: () => api(`/api/chats/${id}`),
    enabled: !!id,
    refetchInterval: 5000,
  });
  const me = useQuery<{ id: string }>({ queryKey: ["me"], queryFn: () => api("/api/me") });

  const send = useMutation({
    mutationFn: (content: string) =>
      api(`/api/chats/${id}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["chat", id] });
    },
  });

  if (q.isLoading || !q.data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const meId = me.data?.id;
  const messages = [...(q.data.messages || [])].reverse();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => {
          const mine = item.senderId === meId;
          return (
            <View style={[styles.row, { justifyContent: mine ? "flex-end" : "flex-start" }]}>
              <View
                style={[
                  styles.bubble,
                  mine
                    ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                    : {
                        backgroundColor: colors.card,
                        borderColor: colors.cardBorder,
                        borderWidth: 1,
                        borderBottomLeftRadius: 4,
                      },
                ]}
              >
                <Text
                  style={{
                    color: mine ? colors.primaryForeground : colors.foreground,
                    fontSize: 15,
                    lineHeight: 21,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
      />
      <KeyboardAvoidingView behavior="padding">
        <View
          style={[
            styles.bar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[
              styles.input,
              { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
            ]}
          />
          <Pressable
            disabled={!text.trim() || send.isPending}
            onPress={() => send.mutate(text.trim())}
            style={[
              styles.sendBtn,
              { backgroundColor: text.trim() ? colors.primary : colors.muted },
            ]}
          >
            <Feather
              name="arrow-up"
              size={20}
              color={text.trim() ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  bubble: { maxWidth: "85%", padding: 10, paddingHorizontal: 14, borderRadius: 18 },
  bar: {
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
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    borderRadius: 20,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
