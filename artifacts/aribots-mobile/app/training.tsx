import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import * as Haptics from "expo-haptics";

export default function TrainingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user } = useAuth();

  const { data: modules, isLoading, refetch } = useQuery({
    queryKey: ["training"],
    queryFn: () => apiGet<any[]>("/api/mobile/training"),
    staleTime: 60000,
  });

  async function handleComplete(moduleId: string) {
    try {
      await apiPost(`/api/mobile/training/${moduleId}/complete`, {});
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }

  const totalCME = (modules || []).filter(m => m.completedBy?.includes(user?.id)).reduce((s: number, m: any) => s + m.cmeCredits, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 4, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Training</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={[styles.statsBar, { backgroundColor: colors.primary + "12", borderBottomColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{totalCME}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>CME Credits</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {(modules || []).filter(m => m.completedBy?.includes(user?.id)).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Completed</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{modules?.length || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Available</Text>
        </View>
      </View>

      <FlatList
        data={modules || []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const completed = item.completedBy?.includes(user?.id);
          return (
            <View style={[styles.moduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.moduleHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.categoryText, { color: colors.accentForeground }]}>{item.category}</Text>
                </View>
                {completed && <Feather name="check-circle" size={18} color="#10B981" />}
              </View>
              <Text style={[styles.moduleTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.moduleDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{item.description}</Text>
              <View style={styles.moduleMeta}>
                <View style={styles.metaItem}>
                  <Feather name="clock" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.duration} min</Text>
                </View>
                {item.cmeCredits > 0 && (
                  <View style={[styles.cmeBadge, { backgroundColor: "#10B981" + "18" }]}>
                    <Text style={[styles.cmeText, { color: "#10B981" }]}>{item.cmeCredits} CME</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.startBtn, completed ? { backgroundColor: colors.muted } : { backgroundColor: colors.primary }]}
                onPress={() => handleComplete(item.id)}
              >
                <Text style={[styles.startBtnText, { color: completed ? colors.mutedForeground : "#fff" }]}>
                  {completed ? "Completed" : "Start Module"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
        contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 : insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        scrollEnabled={!!modules?.length}
        ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
          <View style={styles.emptyState}>
            <Feather name="book-open" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No modules available</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  statsBar: { flexDirection: "row", paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statValue: { fontSize: 24, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, marginHorizontal: 8 },
  list: { padding: 16, gap: 12 },
  moduleCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 10 },
  moduleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  moduleTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  moduleDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  moduleMeta: { flexDirection: "row", alignItems: "center", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cmeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cmeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  startBtn: { paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  startBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
});
