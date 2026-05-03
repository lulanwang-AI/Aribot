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
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

export type ListItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
};

export function SimpleListScreen({
  title,
  subtitle,
  endpoint,
  emptyText,
  toItem,
  onPressItem,
}: {
  title: string;
  subtitle?: string;
  endpoint: string;
  emptyText: string;
  toItem: (raw: any) => ListItem;
  onPressItem?: (raw: any) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const q = useQuery<any[]>({ queryKey: [endpoint], queryFn: () => api(endpoint) });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{subtitle}</Text>
        ) : null}
      </View>
      {q.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={q.data || []}
          keyExtractor={(it) => toItem(it).id}
          refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 8 }}
          renderItem={({ item }) => {
            const i = toItem(item);
            return (
              <Pressable
                onPress={() => onPressItem?.(item)}
                style={[styles.row, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {i.title}
                  </Text>
                  {i.subtitle ? (
                    <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {i.subtitle}
                    </Text>
                  ) : null}
                  {i.meta ? (
                    <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>{i.meta}</Text>
                  ) : null}
                </View>
                {i.badge ? (
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.badgeText, { color: colors.accentForeground }]}>{i.badge}</Text>
                  </View>
                ) : null}
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={{ color: colors.mutedForeground, padding: 24, textAlign: "center" }}>
              {emptyText}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  sub: { fontSize: 14, marginTop: 2, fontFamily: "Inter_400Regular" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  rowSub: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  rowMeta: { fontSize: 12, marginTop: 6, fontFamily: "Inter_500Medium" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
