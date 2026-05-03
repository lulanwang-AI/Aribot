import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

type News = {
  id: string;
  title: string;
  summary: string;
  source: string;
  specialty: string;
  publishedAt: string;
  likes: string[];
};

export default function NewsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const q = useQuery<News[]>({ queryKey: ["news"], queryFn: () => api("/api/news") });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>News</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Curated for clinicians</Text>
      </View>
      {q.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={q.data || []}
          keyExtractor={(n) => n.id}
          refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/news/${item.id}`)}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.tag, { color: colors.primary }]}>
                {item.source} • {item.specialty}
              </Text>
              <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={3}>
                {item.title}
              </Text>
              <Text style={[styles.cardBody, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.summary}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {new Date(item.publishedAt).toLocaleDateString()}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Feather name="heart" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    {item.likes?.length || 0}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  sub: { fontSize: 14, marginTop: 2, fontFamily: "Inter_400Regular" },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  tag: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22, marginTop: 6 },
  cardBody: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
