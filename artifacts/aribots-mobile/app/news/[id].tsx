import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

type NewsDetail = {
  id: string;
  title: string;
  summary: string;
  body?: string;
  source: string;
  specialty: string;
  publishedAt: string;
  comments: { id: string; content: string; author?: { name: string; specialty: string } | null }[];
};

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const q = useQuery<NewsDetail>({
    queryKey: ["news", id],
    queryFn: () => api(`/api/news/${id}`),
    enabled: !!id,
  });

  if (q.isLoading || !q.data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const n = q.data;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Text style={[styles.tag, { color: colors.primary }]}>
        {n.source} • {n.specialty}
      </Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{n.title}</Text>
      <Text style={[styles.date, { color: colors.mutedForeground }]}>
        {new Date(n.publishedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
      </Text>
      <Text style={[styles.body, { color: colors.foreground }]}>{n.body || n.summary}</Text>

      <Text style={[styles.commentsHeader, { color: colors.foreground }]}>
        {n.comments.length} comments
      </Text>
      {n.comments.map((c) => (
        <View key={c.id} style={[styles.comment, { borderColor: colors.cardBorder }]}>
          <Text style={[styles.commentAuthor, { color: colors.foreground }]}>
            {c.author?.name || "Anonymous"}
            {c.author?.specialty ? ` • ${c.author.specialty}` : ""}
          </Text>
          <Text style={[styles.commentBody, { color: colors.foreground }]}>{c.content}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tag: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 6, letterSpacing: -0.4, lineHeight: 30 },
  date: { fontSize: 13, marginTop: 6, fontFamily: "Inter_500Medium" },
  body: { fontSize: 15, lineHeight: 22, marginTop: 14, fontFamily: "Inter_400Regular" },
  commentsHeader: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 28, marginBottom: 10 },
  comment: { borderTopWidth: 1, paddingVertical: 12 },
  commentAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  commentBody: { marginTop: 4, fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
});
