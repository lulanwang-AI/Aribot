import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { BrandWordmark, ModeGradient } from "@/components/Brand";

type Me = { id: string; name: string; specialty?: string; avatarUrl?: string };
type Notif = { news: number; triage: number; events: number; chats: number };
type TriagePost = {
  id: string;
  title: string;
  tags: string[];
  commentCount: number;
  author?: { name: string; specialty: string; avatarUrl: string } | null;
};
type Event = { id: string; title: string; date: string; location?: string };

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const me = useQuery<Me>({ queryKey: ["me"], queryFn: () => api("/api/me") });
  const notif = useQuery<Notif>({ queryKey: ["notif"], queryFn: () => api("/api/notifications") });
  const trending = useQuery<TriagePost[]>({
    queryKey: ["triage", "trending"],
    queryFn: () => api("/api/triage/trending"),
  });
  const events = useQuery<Event[]>({ queryKey: ["events"], queryFn: () => api("/api/events") });

  const refreshing =
    me.isFetching || notif.isFetching || trending.isFetching || events.isFetching;

  function refetch() {
    me.refetch(); notif.refetch(); trending.refetch(); events.refetch();
  }

  const upcoming = (events.data || [])
    .filter((e) => new Date(e.date).getTime() > Date.now())
    .slice(0, 3);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <BrandWordmark size={28} />
        <Pressable onPress={() => router.push("/(tabs)/more")} hitSlop={10}>
          {me.data?.avatarUrl ? (
            <Image source={{ uri: me.data.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
              <Feather name="user" size={18} color={colors.mutedForeground} />
            </View>
          )}
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
        <Text style={[styles.greeting, { color: colors.foreground }]}>
          {me.data ? `Welcome, ${me.data.name?.split(" ")[0] || "Doctor"}` : "Welcome"}
        </Text>
        {me.data?.specialty ? (
          <Text style={[styles.subgreeting, { color: colors.mutedForeground }]}>
            {me.data.specialty}
          </Text>
        ) : null}
      </View>

      <Pressable onPress={() => router.push("/(tabs)/ari")} style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <ModeGradient mode="ari" style={styles.aiCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>Ask Ari</Text>
            <Text style={styles.aiSub}>Clinical AI for doctors — evidence-grounded answers, drug checks, and consults.</Text>
          </View>
          <Feather name="arrow-right" size={22} color="#fff" />
        </ModeGradient>
      </Pressable>

      <View style={styles.statsRow}>
        <Stat label="News" value={notif.data?.news ?? 0} icon="book-open" color={colors.primary} onPress={() => router.push("/(tabs)/news")} />
        <Stat label="Triage" value={notif.data?.triage ?? 0} icon="activity" color={colors.primary} onPress={() => router.push("/(tabs)/triage")} />
        <Stat label="Events" value={notif.data?.events ?? 0} icon="calendar" color={colors.primary} onPress={() => router.push("/events")} />
        <Stat label="Chats" value={notif.data?.chats ?? 0} icon="message-square" color={colors.primary} onPress={() => router.push("/chats")} />
      </View>

      <SectionHeader title="Trending Cases" onSeeAll={() => router.push("/(tabs)/triage")} />
      {trending.isLoading ? (
        <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {(trending.data || []).slice(0, 4).map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/triage/${p.id}`)}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Text numberOfLines={2} style={[styles.cardTitle, { color: colors.foreground }]}>
                {p.title}
              </Text>
              <View style={styles.cardMetaRow}>
                <Text style={[styles.cardMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {p.author?.name || "Anonymous"}
                  {p.author?.specialty ? ` • ${p.author.specialty}` : ""}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Feather name="message-circle" size={14} color={colors.mutedForeground} />
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{p.commentCount}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <SectionHeader title="Upcoming Events" onSeeAll={() => router.push("/events")} />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {upcoming.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, paddingHorizontal: 4 }}>No upcoming events.</Text>
        ) : (
          upcoming.map((e) => (
            <View key={e.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
                {e.title}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.mutedForeground, marginTop: 4 }]}>
                {new Date(e.date).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{e.location ? ` • ${e.location}` : ""}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  icon,
  color,
  onPress,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
    >
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium" }}>See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  greeting: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  subgreeting: { fontSize: 14, marginTop: 2, fontFamily: "Inter_500Medium" },
  aiCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    gap: 12,
  },
  aiTitle: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  aiSub: { color: "rgba(255,255,255,0.92)", fontSize: 13, marginTop: 4, fontFamily: "Inter_400Regular" },
  statsRow: {
    paddingHorizontal: 16,
    marginTop: 16,
    flexDirection: "row",
    gap: 8,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  cardMetaRow: { marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
