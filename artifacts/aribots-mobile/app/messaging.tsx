import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";
import * as Haptics from "expo-haptics";

export default function MessagingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState("");

  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ["threads"],
    queryFn: () => apiGet<any[]>("/api/mobile/messaging/threads"),
    staleTime: 30000,
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", selectedThread],
    queryFn: () => selectedThread ? apiGet<any[]>(`/api/mobile/messaging/threads/${selectedThread}/messages`) : Promise.resolve([]),
    enabled: !!selectedThread,
    staleTime: 15000,
  });

  async function sendMessage() {
    if (!msgInput.trim() || !selectedThread) return;
    try {
      await apiPost(`/api/mobile/messaging/threads/${selectedThread}/messages`, { content: msgInput });
      setMsgInput("");
      refetchMessages();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }

  if (selectedThread) {
    const thread = threads?.find(t => t.id === selectedThread);
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 4, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSelectedThread(null)} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {thread?.participants?.map((p: any) => p?.name?.replace("Dr. ", "")).join(", ") || "Chat"}
          </Text>
          <View style={{ width: 38 }} />
        </View>
        <FlatList
          data={messages || []}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.msgRow, item.senderId === "u1" ? styles.msgRowRight : styles.msgRowLeft]}>
              <View style={[styles.msgBubble, item.senderId === "u1"
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
              ]}>
                <Text style={[styles.msgText, { color: item.senderId === "u1" ? "#fff" : colors.foreground }]}>
                  {item.content}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={[styles.msgList, { paddingBottom: isWeb ? 34 : insets.bottom + 70 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!messages?.length}
        />
        <View style={[styles.inputBar, { borderTopColor: colors.border, paddingBottom: isWeb ? 34 : insets.bottom + 10 }]}>
          <TextInput
            style={[styles.inputField, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            value={msgInput}
            onChangeText={setMsgInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.mutedForeground}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={sendMessage}>
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
        <View style={{ width: 38 }} />
      </View>
      {threadsLoading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={threads || []}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.threadCard, { borderBottomColor: colors.border }]}
              onPress={() => setSelectedThread(item.id)}
            >
              <View style={[styles.threadAvatar, { backgroundColor: colors.accent }]}>
                <Feather name="message-circle" size={20} color={colors.primary} />
              </View>
              <View style={styles.threadInfo}>
                <Text style={[styles.threadName, { color: colors.foreground }]}>
                  {item.participants?.map((p: any) => p?.name).join(", ") || "Direct Message"}
                </Text>
                <Text style={[styles.threadLast, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: isWeb ? 34 : insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!threads?.length}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="message-square" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No messages yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: "700" as const, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" as const },
  threadCard: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 14 },
  threadAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  threadInfo: { flex: 1 },
  threadName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  threadLast: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  unreadText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  msgList: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  msgRow: { flexDirection: "row" },
  msgRowLeft: { justifyContent: "flex-start" },
  msgRowRight: { justifyContent: "flex-end" },
  msgBubble: { maxWidth: "75%", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  msgText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  inputBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, gap: 10 },
  inputField: { flex: 1, height: 44, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, borderWidth: 1, fontFamily: "Inter_400Regular" },
  sendBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
});
