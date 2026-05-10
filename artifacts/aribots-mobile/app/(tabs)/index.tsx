import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api";

interface DashboardStats {
  triagePosts: number;
  upcomingEvents: number;
  newMessages: number;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";

  const { data: triage, isLoading: triageLoading, refetch } = useQuery({
    queryKey: ["home-triage"],
    queryFn: () => apiGet<any[]>("/api/mobile/triage?sort=trending"),
    staleTime: 60000,
  });

  const { data: events } = useQuery({
    queryKey: ["home-events"],
    queryFn: () => apiGet<any[]>("/api/mobile/events"),
    staleTime: 60000,
  });

  const styles = createStyles(colors, insets, isWeb);

  const quickActions = [
    { icon: "cpu", label: "Ari AI", route: "/(tabs)/ari", color: colors.primary },
    { icon: "alert-circle", label: "Triage", route: "/(tabs)/triage", color: "#F59E0B" },
    { icon: "newspaper", label: "News", route: "/(tabs)/community", color: "#10B981" },
    { icon: "users", label: "Groups", route: "/(tabs)/community", color: "#8B5CF6" },
    { icon: "calendar", label: "Events", route: "/(tabs)/community", color: "#EF4444" },
    { icon: "message-square", label: "Messages", route: "/(tabs)/more", color: "#3B82F6" },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={triageLoading} onRefresh={refetch} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Good {getTimeOfDay()},
          </Text>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {user?.name || "Doctor"}
          </Text>
          {user?.specialty ? (
            <Text style={[styles.specialty, { color: colors.primary }]}>{user.specialty}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.avatarCircle, { backgroundColor: colors.accent }]}
          onPress={() => router.push("/(tabs)/more")}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <Feather name="user" size={22} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.ariCard, { backgroundColor: colors.primary }]}>
        <View style={styles.ariCardContent}>
          <View style={styles.ariCardLeft}>
            <Text style={styles.ariCardLabel}>Ari AI</Text>
            <Text style={styles.ariCardTitle}>Clinical Assistant</Text>
            <Text style={styles.ariCardDesc}>Evidence-based decision support</Text>
          </View>
          <Image
            source={require("@/assets/images/aribot-mark.png")}
            style={styles.ariCardImage}
            resizeMode="contain"
          />
        </View>
        <TouchableOpacity
          style={styles.ariCardButton}
          onPress={() => router.push("/(tabs)/ari")}
          activeOpacity={0.85}
        >
          <Text style={styles.ariCardButtonText}>Start Consultation</Text>
          <Feather name="arrow-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.quickActionsGrid}>
        {quickActions.map((action, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.color + "18" }]}>
              <Feather name={action.icon as any} size={20} color={action.color} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {triage && triage.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trending Cases</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/triage")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {triage.slice(0, 3).map((post: any) => (
            <TouchableOpacity
              key={post.id}
              style={[styles.triageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/triage/${post.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.tagRow}>
                {post.tags?.slice(0, 2).map((tag: string) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.tagText, { color: colors.accentForeground }]}>{tag}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.triageTitle, { color: colors.foreground }]} numberOfLines={2}>
                {post.title}
              </Text>
              <View style={styles.triageMeta}>
                <Feather name="heart" size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{post.likes}</Text>
                <Feather name="message-circle" size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{post.commentCount}</Text>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {formatRelativeTime(post.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {events && events.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/community")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {events.slice(0, 2).map((event: any) => (
            <TouchableOpacity
              key={event.id}
              style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <View style={[styles.eventDateBadge, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.eventDateDay, { color: colors.primary }]}>
                  {new Date(event.date).getDate()}
                </Text>
                <Text style={[styles.eventDateMonth, { color: colors.primary }]}>
                  {new Date(event.date).toLocaleString("default", { month: "short" })}
                </Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={[styles.eventLocation, { color: colors.mutedForeground }]}>
                  {event.location} • {event.cmeCredits > 0 ? `${event.cmeCredits} CME` : event.type}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function formatRelativeTime(ts: number) {
  const diff = Date.now() - ts;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function createStyles(colors: any, insets: any, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: {
      padding: 16,
      paddingTop: isWeb ? 67 : insets.top + 12,
      paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
    greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
    userName: { fontSize: 24, fontWeight: "700" as const, fontFamily: "Inter_700Bold", marginTop: 2 },
    specialty: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
    avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatar: { width: 44, height: 44 },
    ariCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
    ariCardContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    ariCardLeft: { flex: 1 },
    ariCardLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.5, textTransform: "uppercase" as const },
    ariCardTitle: { color: "#fff", fontSize: 20, fontWeight: "700" as const, fontFamily: "Inter_700Bold", marginTop: 4 },
    ariCardDesc: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4, fontFamily: "Inter_400Regular" },
    ariCardImage: { width: 64, height: 64, opacity: 0.9 },
    ariCardButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignSelf: "flex-start" as const, marginTop: 16, gap: 6 },
    ariCardButtonText: { color: "#3B82F6", fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
    quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
    quickAction: { flex: 1, minWidth: "30%", maxWidth: "32%", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
    quickActionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    quickActionLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" as const },
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
    seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
    triageCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, gap: 8 },
    tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    triageTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
    triageMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
    eventCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, gap: 14 },
    eventDateBadge: { width: 50, height: 50, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    eventDateDay: { fontSize: 20, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
    eventDateMonth: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase" as const },
    eventInfo: { flex: 1 },
    eventTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    eventLocation: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  });
}
