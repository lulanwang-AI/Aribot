import React from "react";
import {
  Image,
  Pressable,
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
import { useAuth } from "@/lib/auth";

type Me = { id: string; name: string; specialty?: string; hospital?: string; avatarUrl?: string };

const SECTIONS: { title: string; items: { label: string; icon: any; href: string }[] }[] = [
  {
    title: "Clinical",
    items: [
      { label: "Pre-Charting", icon: "clipboard", href: "/pre-charting" },
      { label: "AI Consult", icon: "message-square", href: "/clinical-chat" },
      { label: "SOAP Note", icon: "file-text", href: "/soap" },
      { label: "Visit Summary", icon: "check-square", href: "/visit-summary" },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Groups", icon: "users", href: "/groups" },
      { label: "Events", icon: "calendar", href: "/events" },
      { label: "Doctors", icon: "user-check", href: "/doctors" },
      { label: "Messages", icon: "message-circle", href: "/chats" },
    ],
  },
  {
    title: "Practice",
    items: [
      { label: "Telemedicine", icon: "video", href: "/telemed" },
      { label: "Training", icon: "award", href: "/training" },
    ],
  },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useQuery<Me>({ queryKey: ["me"], queryFn: () => api("/api/me") });
  const { signOut } = useAuth();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 100 }}
    >
      <View style={[styles.profile, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
        {me.data?.avatarUrl ? (
          <Image source={{ uri: me.data.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
            <Feather name="user" size={26} color={colors.mutedForeground} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {me.data?.name || "Doctor"}
          </Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {me.data?.specialty || ""}{me.data?.hospital ? ` • ${me.data.hospital}` : ""}
          </Text>
        </View>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={{ marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {section.title.toUpperCase()}
          </Text>
          <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {section.items.map((item, idx) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.href as any)}
                style={({ pressed }) => [
                  styles.row,
                  idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  pressed && { backgroundColor: colors.muted },
                ]}
              >
                <Feather name={item.icon} size={18} color={colors.primary} />
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Pressable
        onPress={signOut}
        style={[styles.signOut, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold" }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profile: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  name: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  meta: { fontSize: 13, marginTop: 2, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, paddingHorizontal: 24, marginBottom: 8 },
  list: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  signOut: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
});
