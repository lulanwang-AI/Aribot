import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

interface MenuSection {
  title: string;
  items: MenuItem[];
}
interface MenuItem {
  icon: string;
  label: string;
  description: string;
  route?: string;
  badge?: string;
  color?: string;
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "Clinical",
    items: [
      { icon: "clipboard", label: "Clinical Workflow", description: "Pre-charting → SOAP Notes", route: "/clinical", color: "#3B82F6" },
      { icon: "monitor", label: "Telemedicine", description: "Queue & consultations", route: "/telemed", color: "#10B981" },
    ],
  },
  {
    title: "Community",
    items: [
      { icon: "message-square", label: "Messaging", description: "Direct & group chats", route: "/messaging", color: "#8B5CF6" },
      { icon: "user-check", label: "Doctors Directory", description: "Find physicians by specialty", route: "/doctors", color: "#F59E0B" },
      { icon: "book-open", label: "Training", description: "CME modules & certification", route: "/training", color: "#EF4444" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: "user", label: "My Profile", description: "Edit your profile & settings", route: "/account", color: "#6B7280" },
    ],
  },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, signOut } = useAuth();

  async function handleSignOut() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: isWeb ? 67 : insets.top + 12, paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>More</Text>

      <TouchableOpacity
        style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push("/account")}
        activeOpacity={0.8}
      >
        <LinearGradient colors={["#2a7bff", "#12b5c9"]} style={styles.avatarWrap}>
          <Text style={styles.avatarInitials}>
            {(user?.name || "Dr")
              .split(" ")
              .filter(w => w.match(/^[A-Z]/))
              .slice(0, 2)
              .map(w => w[0])
              .join("")}
          </Text>
        </LinearGradient>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.name || "Doctor"}</Text>
          <Text style={[styles.profileSpecialty, { color: colors.mutedForeground }]}>
            {user?.credential ? `${user.credential} · ` : ""}{user?.specialty || "Physician"}
          </Text>
          {user?.hospital ? (
            <Text style={[styles.profileHospital, { color: colors.mutedForeground }]} numberOfLines={1}>{user.hospital}</Text>
          ) : null}
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      {MENU_SECTIONS.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{section.title.toUpperCase()}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, i < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                onPress={() => { if (item.route) router.push(item.route as any); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIcon, { backgroundColor: (item.color || colors.primary) + "18" }]}>
                  <Feather name={item.icon as any} size={19} color={item.color || colors.primary} />
                </View>
                <View style={styles.menuText}>
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
                </View>
                {item.badge ? (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.signOutBtn, { borderColor: colors.destructive + "40" }]}
        onPress={handleSignOut}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  screenTitle: { fontSize: 24, fontWeight: "700" as const, fontFamily: "Inter_700Bold", marginBottom: 4 },
  profileCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  avatarWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarInitials: { color: "#fff", fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 17, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  profileSpecialty: { fontSize: 13, fontFamily: "Inter_500Medium" },
  profileHospital: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { gap: 8 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.7 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, minWidth: 22, alignItems: "center" },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 8, marginTop: 4 },
  signOutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
