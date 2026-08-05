import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
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

type Tab = "events";

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [activeTab] = useState<Tab>("events");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 4, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Events</Text>
      </View>
      {activeTab === "events" && <EventsTab colors={colors} insets={insets} isWeb={isWeb} />}
    </View>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  list: { padding: 16, gap: 12 },
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
