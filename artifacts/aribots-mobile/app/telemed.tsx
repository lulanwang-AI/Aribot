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
import { apiGet } from "@/lib/api";

const URGENCY_COLOR: Record<string, string> = {
  low: "#10B981",
  medium: "#F59E0B",
  high: "#EF4444",
};

export default function TelemedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: consultations, isLoading, refetch } = useQuery({
    queryKey: ["telemed"],
    queryFn: () => apiGet<any[]>("/api/mobile/telemed"),
    staleTime: 30000,
  });

  const { data: earnings } = useQuery({
    queryKey: ["telemed-earnings"],
    queryFn: () => apiGet<any>("/api/mobile/telemed/earnings"),
    staleTime: 60000,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 4, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Telemedicine</Text>
        <View style={{ width: 38 }} />
      </View>

      {earnings && (
        <View style={[styles.earningsCard, { backgroundColor: colors.primary }]}>
          <View style={styles.earningsRow}>
            <View style={styles.earningItem}>
              <Text style={styles.earningValue}>${earnings.totalEarnings}</Text>
              <Text style={styles.earningLabel}>Total Earned</Text>
            </View>
            <View style={[styles.earningDivider]} />
            <View style={styles.earningItem}>
              <Text style={styles.earningValue}>${earnings.thisMonth}</Text>
              <Text style={styles.earningLabel}>This Month</Text>
            </View>
            <View style={[styles.earningDivider]} />
            <View style={styles.earningItem}>
              <Text style={styles.earningValue}>{earnings.completedConsultations}</Text>
              <Text style={styles.earningLabel}>Consultations</Text>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.videoStub, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="video" size={32} color={colors.mutedForeground} />
        <Text style={[styles.videoStubTitle, { color: colors.foreground }]}>Live Video Consultation</Text>
        <Text style={[styles.videoStubDesc, { color: colors.mutedForeground }]}>
          Real-time video calling is coming soon. This feature requires native device access (camera, microphone) and will be available in a future update.
        </Text>
        <View style={[styles.comingSoonBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.comingSoonText, { color: colors.mutedForeground }]}>Coming Soon</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginHorizontal: 16, marginTop: 16 }]}>
        Consultation Queue
      </Text>

      <FlatList
        data={consultations || []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.consultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.consultHeader}>
              <Text style={[styles.patientName, { color: colors.foreground }]}>{item.patientName}</Text>
              <View style={[styles.urgencyBadge, { backgroundColor: (URGENCY_COLOR[item.urgency] || colors.primary) + "20" }]}>
                <Text style={[styles.urgencyText, { color: URGENCY_COLOR[item.urgency] || colors.primary }]}>
                  {item.urgency?.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[styles.consultReason, { color: colors.mutedForeground }]}>{item.reason}</Text>
            <View style={styles.consultMeta}>
              <View style={[styles.statusBadge, { backgroundColor: item.status === "completed" ? "#10B981" + "18" : colors.accent }]}>
                <Text style={[styles.statusText, { color: item.status === "completed" ? "#10B981" : colors.accentForeground }]}>
                  {item.status}
                </Text>
              </View>
              <Text style={[styles.feeText, { color: colors.primary }]}>${item.fee}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 : insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        scrollEnabled={!!consultations?.length}
        ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  earningsCard: { margin: 16, borderRadius: 16, padding: 16 },
  earningsRow: { flexDirection: "row", justifyContent: "space-around" },
  earningItem: { alignItems: "center", gap: 4 },
  earningValue: { color: "#fff", fontSize: 22, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  earningLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  earningDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  videoStub: { marginHorizontal: 16, borderRadius: 14, padding: 20, borderWidth: 1, alignItems: "center", gap: 10 },
  videoStubTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  videoStubDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" as const, lineHeight: 20 },
  comingSoonBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  comingSoonText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 17, fontWeight: "700" as const, fontFamily: "Inter_700Bold", marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  consultCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 8 },
  consultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  patientName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  urgencyText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  consultReason: { fontSize: 13, fontFamily: "Inter_400Regular" },
  consultMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  feeText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
