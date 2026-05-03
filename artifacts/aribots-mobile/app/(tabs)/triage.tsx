import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

type Post = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  likes: string[];
  commentCount: number;
  createdAt: string;
  author?: { name: string; specialty: string; avatarUrl: string } | null;
};

export default function TriageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const q = useQuery<Post[]>({ queryKey: ["triage"], queryFn: () => api("/api/triage") });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Triage</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Cases shared by your peers
        </Text>
      </View>
      {q.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={q.data || []}
          keyExtractor={(p) => p.id}
          refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/triage/${item.id}`)}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text
                style={[styles.cardBody, { color: colors.mutedForeground }]}
                numberOfLines={2}
              >
                {item.content}
              </Text>
              <View style={styles.tagRow}>
                {(item.tags || []).slice(0, 3).map((t) => (
                  <View key={t} style={[styles.tag, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.tagText, { color: colors.accentForeground }]}>{t}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.author?.name || "Anonymous"}
                  {item.author?.specialty ? ` • ${item.author.specialty}` : ""}
                </Text>
                <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Feather name="heart" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                      {item.likes?.length || 0}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Feather name="message-circle" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                      {item.commentCount}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.mutedForeground, padding: 24, textAlign: "center" }}>
              No cases yet.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  sub: { fontSize: 14, marginTop: 2, fontFamily: "Inter_400Regular" },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  cardBody: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
