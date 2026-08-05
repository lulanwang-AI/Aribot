import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { apiPatch } from "@/lib/api";
import * as Haptics from "expo-haptics";

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({
    name: user?.name || "",
    specialty: user?.specialty || "",
    hospital: user?.hospital || "",
    bio: user?.bio || "",
  });

  // Keep form in sync when the profile loads/refreshes while not editing
  React.useEffect(() => {
    if (!editing && user) {
      setForm({ name: user.name || "", specialty: user.specialty || "", hospital: user.hospital || "", bio: user.bio || "" });
    }
  }, [user, editing]);

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      await apiPatch("/api/mobile/auth/me", form);
      await refreshUser();
      setEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setSaveError(e?.message || "Could not save changes. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }

  function inputStyle() {
    return [styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }];
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <TouchableOpacity
          onPress={() => { setEditing(!editing); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Text style={[styles.editBtn, { color: colors.primary }]}>{editing ? "Done" : "Edit"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: isWeb ? 34 : insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={[styles.avatarWrap, { backgroundColor: colors.accent }]}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <Feather name="user" size={40} color={colors.primary} />
            )}
          </View>
          <View style={styles.nameSection}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{user?.name || "Doctor"}</Text>
            <Text style={[styles.credential, { color: colors.primary }]}>
              {user?.credential} · {user?.specialty}
            </Text>
            {user?.verified && (
              <View style={styles.verifiedBadge}>
                <Feather name="check-circle" size={14} color="#10B981" />
                <Text style={styles.verifiedText}>Verified Physician</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.foreground }]}>
              {user?.hospital || "No hospital set"}
            </Text>
          </View>
          {user?.city && (
            <View style={styles.infoRow}>
              <Feather name="globe" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                {user.city}, {user.state}
              </Text>
            </View>
          )}
          {user?.yearsExperience && (
            <View style={styles.infoRow}>
              <Feather name="award" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                {user.yearsExperience} years experience
              </Text>
            </View>
          )}
        </View>

        {user?.badges && user.badges.length > 0 && (
          <View style={styles.badgesSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Badges</Text>
            <View style={styles.badgeGrid}>
              {user.badges.map(badge => (
                <View key={badge} style={[styles.badgeChip, { backgroundColor: colors.accent }]}>
                  <Feather name="star" size={12} color={colors.primary} />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{badge}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {user?.interests && user.interests.length > 0 && (
          <View style={styles.interestsSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Interests</Text>
            <View style={styles.badgeGrid}>
              {user.interests.map(interest => (
                <View key={interest} style={[styles.interestChip, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.interestText, { color: colors.foreground }]}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {user?.bio && (
          <View style={styles.bioSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Bio</Text>
            <Text style={[styles.bioText, { color: colors.mutedForeground }]}>{user.bio}</Text>
          </View>
        )}

        {editing && (
          <View style={styles.editForm}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Edit Profile</Text>
            {[
              { key: "name", label: "Full Name", placeholder: "Dr. First Last" },
              { key: "specialty", label: "Specialty", placeholder: "e.g., Cardiology" },
              { key: "hospital", label: "Hospital", placeholder: "Institution name" },
              { key: "bio", label: "Bio", placeholder: "Tell the community about yourself...", multiline: true },
            ].map(f => (
              <View key={f.key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput
                  style={[inputStyle(), f.multiline && { height: 80, paddingTop: 12, textAlignVertical: "top" as const }]}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(d => ({ ...d, [f.key]: v }))}
                  multiline={f.multiline}
                />
              </View>
            ))}
            {saveError ? (
              <Text style={{ color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium" }}>{saveError}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Changes"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  editBtn: { fontSize: 16, fontFamily: "Inter_500Medium" },
  content: { padding: 20, gap: 20 },
  avatarSection: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarWrap: { width: 80, height: 80, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatar: { width: 80, height: 80 },
  nameSection: { flex: 1, gap: 4 },
  displayName: { fontSize: 20, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  credential: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  verifiedText: { color: "#10B981", fontSize: 12, fontFamily: "Inter_500Medium" },
  infoCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const, fontFamily: "Inter_700Bold", marginBottom: 10 },
  badgesSection: {},
  badgeGrid: { flexDirection: "row", flexWrap: "wrap" as const, gap: 8 },
  badgeChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 5 },
  badgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  interestsSection: {},
  interestChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  interestText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  bioSection: {},
  bioText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  editForm: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { height: 46, borderRadius: 10, paddingHorizontal: 14, fontSize: 14, borderWidth: 1, fontFamily: "Inter_400Regular" },
  saveBtn: { padding: 14, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
