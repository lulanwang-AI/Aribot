import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";
import * as Haptics from "expo-haptics";

interface TriagePost {
  id: string;
  title: string;
  content: string;
  tags: string[];
  author: { name: string; specialty: string; credential: string; avatarUrl: string } | null;
  anonymous: boolean;
  likes: number;
  likedByMe: boolean;
  commentCount: number;
  createdAt: number;
}

const SORT_OPTIONS = [
  { label: "Recent", value: "recent" },
  { label: "Trending", value: "trending" },
];

export default function TriageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [sort, setSort] = useState("recent");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composing, setComposing] = useState({ title: "", content: "", tags: "", anonymous: false });
  const [posting, setPosting] = useState(false);

  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ["triage", sort, selectedTag],
    queryFn: () => {
      let url = `/api/mobile/triage?sort=${sort}`;
      if (selectedTag) url += `&tag=${selectedTag}`;
      return apiGet<TriagePost[]>(url);
    },
    staleTime: 30000,
  });

  const allTags = Array.from(new Set((posts || []).flatMap(p => p.tags))).slice(0, 8);

  async function handlePost() {
    if (!composing.title.trim() || !composing.content.trim()) return;
    setPosting(true);
    try {
      await apiPost("/api/mobile/triage", {
        title: composing.title,
        content: composing.content,
        tags: composing.tags.split(",").map(t => t.trim()).filter(Boolean),
        anonymous: composing.anonymous,
      });
      setShowCompose(false);
      setComposing({ title: "", content: "", tags: "", anonymous: false });
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPosting(false);
    }
  }

  function renderPost({ item }: { item: TriagePost }) {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/triage/${item.id}` as any)}
        activeOpacity={0.8}
      >
        <View style={styles.tagRow}>
          {item.tags.slice(0, 3).map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, { backgroundColor: colors.accent }, selectedTag === tag && { backgroundColor: colors.primary }]}
              onPress={() => { setSelectedTag(selectedTag === tag ? null : tag); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={[styles.tagText, { color: selectedTag === tag ? "#fff" : colors.accentForeground }]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.content, { color: colors.mutedForeground }]} numberOfLines={2}>{item.content}</Text>
        {item.author && (
          <Text style={[styles.author, { color: colors.mutedForeground }]}>
            Dr. {item.author.name.replace("Dr. ", "")} · {item.author.specialty} · {item.author.credential}
          </Text>
        )}
        {!item.author && (
          <Text style={[styles.author, { color: colors.mutedForeground }]}>Anonymous Physician</Text>
        )}
        <View style={styles.metaRow}>
          <Feather name="heart" size={13} color={item.likedByMe ? colors.destructive : colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.likes}</Text>
          <Feather name="message-circle" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.commentCount}</Text>
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{formatTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 4, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Triage</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowCompose(!showCompose)}
        >
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.newBtnText}>Post Case</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.filterBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterBtn, sort === opt.value && { backgroundColor: colors.accent }]}
            onPress={() => setSort(opt.value)}
          >
            <Text style={[styles.filterText, { color: sort === opt.value ? colors.primary : colors.mutedForeground }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
        {selectedTag && (
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: colors.primary + "18" }]}
            onPress={() => setSelectedTag(null)}
          >
            <Text style={[styles.filterText, { color: colors.primary }]}>#{selectedTag} ✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {showCompose && (
        <View style={[styles.composeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.composeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            placeholder="Case title..."
            placeholderTextColor={colors.mutedForeground}
            value={composing.title}
            onChangeText={t => setComposing(c => ({ ...c, title: t }))}
          />
          <TextInput
            style={[styles.composeTextarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            placeholder="Describe the clinical scenario..."
            placeholderTextColor={colors.mutedForeground}
            value={composing.content}
            onChangeText={t => setComposing(c => ({ ...c, content: t }))}
            multiline
            numberOfLines={3}
          />
          <TextInput
            style={[styles.composeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            placeholder="Tags (comma-separated)"
            placeholderTextColor={colors.mutedForeground}
            value={composing.tags}
            onChangeText={t => setComposing(c => ({ ...c, tags: t }))}
          />
          <View style={styles.composeActions}>
            <TouchableOpacity
              style={[styles.anonymousToggle, { borderColor: colors.border }, composing.anonymous && { backgroundColor: colors.accent, borderColor: colors.primary }]}
              onPress={() => setComposing(c => ({ ...c, anonymous: !c.anonymous }))}
            >
              <Feather name={composing.anonymous ? "eye-off" : "eye"} size={14} color={composing.anonymous ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.anonymousText, { color: composing.anonymous ? colors.primary : colors.mutedForeground }]}>
                {composing.anonymous ? "Anonymous" : "Show name"}
              </Text>
            </TouchableOpacity>
            <View style={styles.composeButtons}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowCompose(false)}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }, posting && { opacity: 0.7 }]}
                onPress={handlePost}
                disabled={posting}
              >
                {posting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Post</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={posts || []}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          scrollEnabled={!!posts?.length}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No cases yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  newBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 6 },
  newBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  filterBar: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 8, flexWrap: "wrap" as const },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  composeCard: { margin: 16, padding: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  composeInput: { height: 44, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, borderWidth: 1, fontFamily: "Inter_400Regular" },
  composeTextarea: { borderRadius: 8, paddingHorizontal: 12, paddingTop: 10, fontSize: 14, borderWidth: 1, minHeight: 80, fontFamily: "Inter_400Regular", textAlignVertical: "top" as const },
  composeActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 10 },
  anonymousToggle: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, gap: 6 },
  anonymousText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  composeButtons: { flexDirection: "row", gap: 8 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  submitBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  submitText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap" as const, gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  content: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  author: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
});
