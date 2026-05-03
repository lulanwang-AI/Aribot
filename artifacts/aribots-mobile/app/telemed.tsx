import React from "react";
import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

type Visit = { id: string; patientName?: string; scheduledAt: string; reason?: string; status?: string };

export default function TelemedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const q = useQuery<Visit[]>({ queryKey: ["telemed"], queryFn: () => api("/api/telemed") });

  return (
    <>
      <Stack.Screen options={{ title: "Telemedicine" }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 60 }}
      >
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Telemedicine</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Upcoming and recent virtual visits
          </Text>
        </View>
        <View style={[styles.notice, { backgroundColor: colors.accent }]}>
          <Feather name="info" size={16} color={colors.accentForeground} />
          <Text style={{ color: colors.accentForeground, fontSize: 13, flex: 1, fontFamily: "Inter_500Medium" }}>
            Live video visits are available on the web. Mobile shows your visit schedule.
          </Text>
        </View>
        <View style={{ paddingHorizontal: 16, marginTop: 8, gap: 10 }}>
          {(q.data || []).map((v) => (
            <View
              key={v.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {v.patientName || "Patient"}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                {new Date(v.scheduledAt).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
              {v.reason ? (
                <Text style={[styles.cardBody, { color: colors.foreground }]}>{v.reason}</Text>
              ) : null}
              {v.status ? (
                <View style={[styles.badge, { backgroundColor: colors.muted, alignSelf: "flex-start" }]}>
                  <Text style={{ color: colors.foreground, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                    {v.status}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
          {(q.data || []).length === 0 && !q.isLoading ? (
            <Text style={{ color: colors.mutedForeground, padding: 20, textAlign: "center" }}>
              No scheduled visits.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  sub: { fontSize: 14, marginTop: 2, fontFamily: "Inter_400Regular" },
  notice: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cardMeta: { fontSize: 13, fontFamily: "Inter_500Medium" },
  cardBody: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginTop: 4 },
});
