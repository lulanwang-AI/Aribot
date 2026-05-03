import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  likes: string[];
  anonymous: boolean;
  author?: { name: string; specialty: string; avatarUrl: string } | null;
};
type Detail = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  likes: string[];
  createdAt: string;
  author?: { name: string; specialty: string; avatarUrl: string } | null;
  comments: Comment[];
};

export default function TriageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);

  const q = useQuery<Detail>({
    queryKey: ["triage", id],
    queryFn: () => api(`/api/triage/${id}`),
    enabled: !!id,
  });

  const like = useMutation({
    mutationFn: () => api(`/api/triage/${id}/like`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["triage", id] }),
  });
  const comment = useMutation({
    mutationFn: (body: { content: string; anonymous: boolean }) =>
      api(`/api/triage/${id}/comments`, { method: "POST", body: JSON.stringify({ ...body, parentId: null }) }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["triage", id] });
    },
    onError: (e: any) => Alert.alert("Failed", e?.message || "Could not post comment"),
  });

  if (q.isLoading || !q.data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const post = q.data;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <Text style={[styles.title, { color: colors.foreground }]}>{post.title}</Text>
      <Text style={[styles.author, { color: colors.mutedForeground }]}>
        {post.author?.name || "Anonymous"}
        {post.author?.specialty ? ` • ${post.author.specialty}` : ""}
      </Text>
      <Text style={[styles.body, { color: colors.foreground }]}>{post.content}</Text>
      <View style={styles.tagRow}>
        {(post.tags || []).map((t) => (
          <View key={t} style={[styles.tag, { backgroundColor: colors.accent }]}>
            <Text style={[styles.tagText, { color: colors.accentForeground }]}>{t}</Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={() => like.mutate()}
        style={[styles.likeBtn, { backgroundColor: colors.muted }]}
      >
        <Feather name="heart" size={16} color={colors.primary} />
        <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>
          {post.likes?.length || 0} likes
        </Text>
      </Pressable>

      <Text style={[styles.commentsHeader, { color: colors.foreground }]}>
        {post.comments.length} comments
      </Text>

      <View style={[styles.commentBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a clinical comment…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={{
            color: colors.foreground,
            minHeight: 60,
            fontFamily: "Inter_400Regular",
            fontSize: 15,
          }}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <Pressable onPress={() => setAnon(!anon)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Feather name={anon ? "check-square" : "square"} size={16} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_500Medium" }}>
              Post anonymously
            </Text>
          </Pressable>
          <Pressable
            disabled={!text.trim() || comment.isPending}
            onPress={() => comment.mutate({ content: text.trim(), anonymous: anon })}
            style={[
              styles.postBtn,
              { backgroundColor: text.trim() ? colors.primary : colors.muted },
            ]}
          >
            <Text style={{ color: text.trim() ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }}>
              {comment.isPending ? "Posting…" : "Post"}
            </Text>
          </Pressable>
        </View>
      </View>

      {post.comments.map((c) => (
        <View key={c.id} style={[styles.comment, { borderColor: colors.cardBorder }]}>
          <Text style={[styles.commentAuthor, { color: colors.foreground }]}>
            {c.anonymous ? "Anonymous Clinician" : c.author?.name || "Unknown"}
            {!c.anonymous && c.author?.specialty ? ` • ${c.author.specialty}` : ""}
          </Text>
          <Text style={[styles.commentBody, { color: colors.foreground }]}>{c.content}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  author: { fontSize: 13, marginTop: 4, fontFamily: "Inter_500Medium" },
  body: { fontSize: 15, lineHeight: 22, marginTop: 14, fontFamily: "Inter_400Regular" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  likeBtn: { marginTop: 16, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  commentsHeader: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 28, marginBottom: 10 },
  commentBox: { borderWidth: 1, borderRadius: 14, padding: 12 },
  postBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  comment: { borderTopWidth: 1, paddingVertical: 14 },
  commentAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  commentBody: { marginTop: 4, fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
});
