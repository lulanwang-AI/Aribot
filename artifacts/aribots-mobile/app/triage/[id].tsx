import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";
import * as Haptics from "expo-haptics";

export default function TriageDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: post, isLoading, refetch } = useQuery({
    queryKey: ["triage-detail", id],
    queryFn: () => apiGet<any>(`/api/mobile/triage/${id}`),
    enabled: !!id,
  });

  async function handleLike() {
    if (!id) return;
    try {
      await apiPost(`/api/mobile/triage/${id}/like`, {});
      refetch();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }

  async function handleComment() {
    if (!comment.trim() || !id) return;
    setSubmitting(true);
    try {
      await apiPost(`/api/mobile/triage/${id}/comments`, { content: comment, anonymous });
      setComment("");
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );

  if (!post) return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Post not found</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: isWeb ? 67 : insets.top + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Case Discussion</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: isWeb ? 34 : insets.bottom + 20 }]}
      >
        <View style={styles.tagRow}>
          {post.tags?.map((tag: string) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.accent }]}>
              <Text style={[styles.tagText, { color: colors.accentForeground }]}>{tag}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.postTitle, { color: colors.foreground }]}>{post.title}</Text>
        <Text style={[styles.postContent, { color: colors.mutedForeground }]}>{post.content}</Text>

        {post.author ? (
          <View style={styles.authorRow}>
            <Image source={{ uri: post.author.avatarUrl }} style={styles.authorAvatar} />
            <View>
              <Text style={[styles.authorName, { color: colors.foreground }]}>{post.author.name}</Text>
              <Text style={[styles.authorSpec, { color: colors.mutedForeground }]}>
                {post.author.specialty} · {post.author.credential}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.authorRow}>
            <View style={[styles.anonAvatar, { backgroundColor: colors.muted }]}>
              <Feather name="user" size={16} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.authorName, { color: colors.mutedForeground }]}>Anonymous Physician</Text>
          </View>
        )}

        <View style={[styles.actionsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Feather name="heart" size={18} color={post.likedByMe ? colors.destructive : colors.mutedForeground} />
            <Text style={[styles.actionCount, { color: post.likedByMe ? colors.destructive : colors.mutedForeground }]}>{post.likes}</Text>
          </TouchableOpacity>
          <View style={styles.actionBtn}>
            <Feather name="message-circle" size={18} color={colors.mutedForeground} />
            <Text style={[styles.actionCount, { color: colors.mutedForeground }]}>{post.commentCount}</Text>
          </View>
          <TouchableOpacity style={styles.actionBtn}>
            <Feather name="share-2" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.commentsHeader, { color: colors.foreground }]}>
          Responses ({post.comments?.length || 0})
        </Text>

        {post.comments?.map((c: any) => (
          <View key={c.id} style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.commentAuthorRow}>
              {c.author ? (
                <Image source={{ uri: c.author.avatarUrl }} style={styles.commentAvatar} />
              ) : (
                <View style={[styles.anonAvatar, { backgroundColor: colors.muted }]}>
                  <Feather name="user" size={12} color={colors.mutedForeground} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.commentName, { color: colors.foreground }]}>
                  {c.author ? c.author.name : "Anonymous"}
                </Text>
                {c.author?.specialty && (
                  <Text style={[styles.commentSpec, { color: colors.mutedForeground }]}>
                    {c.author.specialty} · {c.author.credential}
                  </Text>
                )}
              </View>
              <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>
                {formatTime(c.createdAt)}
              </Text>
            </View>
            <Text style={[styles.commentContent, { color: colors.foreground }]}>{c.content}</Text>
          </View>
        ))}

        {!post.comments?.length && (
          <View style={styles.noComments}>
            <Text style={[styles.noCommentsText, { color: colors.mutedForeground }]}>
              Be the first to respond to this case
            </Text>
          </View>
        )}

        <View style={[styles.composeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.composeLabel, { color: colors.foreground }]}>Add your response</Text>
          <TextInput
            style={[styles.commentInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Share your clinical perspective..."
            placeholderTextColor={colors.mutedForeground}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />
          <View style={styles.composeFooter}>
            <TouchableOpacity
              style={[styles.anonToggle, anonymous && { backgroundColor: colors.accent }]}
              onPress={() => setAnonymous(!anonymous)}
            >
              <Feather name={anonymous ? "eye-off" : "eye"} size={14} color={anonymous ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.anonText, { color: anonymous ? colors.primary : colors.mutedForeground }]}>
                {anonymous ? "Anonymous" : "With name"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }, (submitting || !comment.trim()) && { opacity: 0.5 }]}
              onPress={handleComment}
              disabled={submitting || !comment.trim()}
            >
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Post</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 8, marginLeft: -8 },
  navTitle: { fontSize: 17, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  content: { padding: 20, gap: 14 },
  tagRow: { flexDirection: "row", flexWrap: "wrap" as const, gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  postTitle: { fontSize: 20, fontWeight: "700" as const, fontFamily: "Inter_700Bold", lineHeight: 28 },
  postContent: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorAvatar: { width: 38, height: 38, borderRadius: 10 },
  anonAvatar: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  authorName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  authorSpec: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actionsRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12, gap: 24 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionCount: { fontSize: 14, fontFamily: "Inter_500Medium" },
  commentsHeader: { fontSize: 17, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  commentCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 10 },
  commentAuthorRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  commentAvatar: { width: 30, height: 30, borderRadius: 8 },
  commentName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  commentSpec: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commentTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commentContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  noComments: { alignItems: "center", paddingVertical: 20 },
  noCommentsText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  composeBox: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  composeLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  commentInput: { borderRadius: 10, paddingHorizontal: 12, paddingTop: 10, fontSize: 14, borderWidth: 1, minHeight: 80, textAlignVertical: "top" as const, fontFamily: "Inter_400Regular" },
  composeFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  anonToggle: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, gap: 6 },
  anonText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  submitBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 9 },
  submitText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
