import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";
import * as Haptics from "expo-haptics";

type Tab = "news" | "groups" | "events";

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [activeTab, setActiveTab] = useState<Tab>("news");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 4, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Community</Text>
      </View>
      <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {(["news","groups","events"] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => { setActiveTab(tab); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === "news" && <NewsTab colors={colors} insets={insets} isWeb={isWeb} />}
      {activeTab === "groups" && <GroupsTab colors={colors} insets={insets} isWeb={isWeb} />}
      {activeTab === "events" && <EventsTab colors={colors} insets={insets} isWeb={isWeb} />}
    </View>
  );
}

function NewsTab({ colors, insets, isWeb }: any) {
  const { data: news, isLoading, refetch } = useQuery({
    queryKey: ["news"],
    queryFn: () => apiGet<any[]>("/api/mobile/news"),
    staleTime: 60000,
  });

  return (
    <FlatList
      data={news || []}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={[styles.newsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.newsHeader}>
            <View style={[styles.sourceBadge, { backgroundColor: colors.primary + "18" }]}>
              <Text style={[styles.sourceBadgeText, { color: colors.primary }]}>{item.source}</Text>
            </View>
            <Text style={[styles.newsDate, { color: colors.mutedForeground }]}>
              {formatTime(item.publishedAt)}
            </Text>
          </View>
          <Text style={[styles.newsTitle, { color: colors.foreground }]}>{item.title}</Text>
          <Text style={[styles.newsSummary, { color: colors.mutedForeground }]} numberOfLines={2}>{item.summary}</Text>
          <View style={styles.newsMeta}>
            <View style={[styles.specialtyTag, { backgroundColor: colors.muted }]}>
              <Text style={[styles.specialtyTagText, { color: colors.mutedForeground }]}>{item.specialty}</Text>
            </View>
            <Feather name="heart" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.likes}</Text>
          </View>
        </View>
      )}
      contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      scrollEnabled={!!news?.length}
      ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <View style={styles.emptyState}>
          <Feather name="book-open" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No news yet</Text>
        </View>
      )}
    />
  );
}

function GroupsTab({ colors, insets, isWeb }: any) {
  const { data: groups, isLoading, refetch } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiGet<any[]>("/api/mobile/groups"),
    staleTime: 60000,
  });

  async function handleJoin(groupId: string) {
    try {
      await apiPost(`/api/mobile/groups/${groupId}/join`, {});
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }

  return (
    <FlatList
      data={groups || []}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.groupIcon, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="users" size={22} color={colors.primary} />
          </View>
          <View style={styles.groupInfo}>
            <Text style={[styles.groupName, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.groupDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{item.description}</Text>
            <Text style={[styles.groupMeta, { color: colors.mutedForeground }]}>{item.memberCount} members</Text>
          </View>
          <TouchableOpacity
            style={[styles.joinBtn, { borderColor: colors.primary }]}
            onPress={() => handleJoin(item.id)}
          >
            <Text style={[styles.joinBtnText, { color: colors.primary }]}>Join</Text>
          </TouchableOpacity>
        </View>
      )}
      contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      scrollEnabled={!!groups?.length}
      ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <View style={styles.emptyState}>
          <Feather name="users" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No groups yet</Text>
        </View>
      )}
    />
  );
}

function EventsTab({ colors, insets, isWeb }: any) {
  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiGet<any[]>("/api/mobile/events"),
    staleTime: 60000,
  });

  async function handleRsvp(eventId: string) {
    try {
      await apiPost(`/api/mobile/events/${eventId}/rsvp`, {});
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }

  return (
    <FlatList
      data={events || []}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.eventDate, { backgroundColor: colors.primary }]}>
            <Text style={styles.eventDateDay}>{new Date(item.date).getDate()}</Text>
            <Text style={styles.eventDateMonth}>{new Date(item.date).toLocaleString("default", { month: "short" })}</Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.eventLocation, { color: colors.mutedForeground }]}>
              {item.location}
            </Text>
            <View style={styles.eventMeta}>
              {item.cmeCredits > 0 && (
                <View style={[styles.cmeBadge, { backgroundColor: "#10B981" + "18" }]}>
                  <Text style={[styles.cmeBadgeText, { color: "#10B981" }]}>{item.cmeCredits} CME</Text>
                </View>
              )}
              <Text style={[styles.eventAttendeesText, { color: colors.mutedForeground }]}>{item.rsvps?.length || 0} attending</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.rsvpBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleRsvp(item.id)}
          >
            <Text style={styles.rsvpText}>RSVP</Text>
          </TouchableOpacity>
        </View>
      )}
      contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      scrollEnabled={!!events?.length}
      ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No events yet</Text>
        </View>
      )}
    />
  );
}

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  list: { padding: 16, gap: 12 },
  newsCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8 },
  newsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sourceBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  newsDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  newsTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  newsSummary: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  newsMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  specialtyTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  specialtyTagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  groupCard: { flexDirection: "row", borderRadius: 14, padding: 14, borderWidth: 1, gap: 12, alignItems: "center" },
  groupIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  groupInfo: { flex: 1, gap: 3 },
  groupName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  groupDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  groupMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  joinBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  joinBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  eventCard: { flexDirection: "row", borderRadius: 14, padding: 14, borderWidth: 1, gap: 12, alignItems: "center" },
  eventDate: { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  eventDateDay: { color: "#fff", fontSize: 20, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  eventDateMonth: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase" as const },
  eventInfo: { flex: 1, gap: 3 },
  eventTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  eventLocation: { fontSize: 13, fontFamily: "Inter_400Regular" },
  eventMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  cmeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  cmeBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  eventAttendeesText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rsvpBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  rsvpText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
});
