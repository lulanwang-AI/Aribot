import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

type Group = { id: string; name: string; description: string; memberCount?: number; specialty?: string };

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const q = useQuery<Group>({
    queryKey: ["group", id],
    queryFn: () => api(`/api/groups/${id}`),
    enabled: !!id,
  });

  if (q.isLoading || !q.data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const g = q.data;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.title, { color: colors.foreground }]}>{g.name}</Text>
      {g.specialty ? <Text style={[styles.meta, { color: colors.primary }]}>{g.specialty}</Text> : null}
      <Text style={[styles.body, { color: colors.foreground }]}>{g.description}</Text>
      <Text style={[styles.meta, { color: colors.mutedForeground, marginTop: 12 }]}>
        {g.memberCount ?? 0} members
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  meta: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 4 },
  body: { fontSize: 15, lineHeight: 22, marginTop: 14, fontFamily: "Inter_400Regular" },
});
