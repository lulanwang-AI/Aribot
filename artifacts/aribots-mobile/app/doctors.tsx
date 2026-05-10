import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Platform, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

const SPECIALTIES = ["All","Cardiology","Oncology","Neurology","Emergency Medicine","Internal Medicine","Surgery","Radiology","Pediatrics","Psychiatry","Orthopedics"];

export default function DoctorsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");

  const { data: doctors, isLoading, refetch } = useQuery({
    queryKey: ["doctors", search, specialty],
    queryFn: () => {
      let url = "/api/mobile/doctors";
      const params: string[] = [];
      if (search) params.push(`q=${encodeURIComponent(search)}`);
      if (specialty !== "All") params.push(`specialty=${encodeURIComponent(specialty)}`);
      if (params.length) url += "?" + params.join("&");
      return apiGet<any[]>(url);
    },
    staleTime: 60000,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 4, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Doctors Directory</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInput, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchField, { color: colors.foreground }]}
            placeholder="Search doctors, specialty, hospital..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        horizontal
        data={SPECIALTIES}
        keyExtractor={item => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.specChip, specialty === item && { backgroundColor: colors.primary }]}
            onPress={() => setSpecialty(item)}
          >
            <Text style={[styles.specChipText, { color: specialty === item ? "#fff" : colors.mutedForeground }]}>{item}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.specList}
        showsHorizontalScrollIndicator={false}
        style={[styles.specBar, { borderBottomColor: colors.border }]}
      />

      <FlatList
        data={doctors || []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.doctorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={{ uri: item.avatarUrl }} style={styles.docAvatar} />
            <View style={styles.docInfo}>
              <Text style={[styles.docName, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.docSpec, { color: colors.primary }]}>
                {item.credential} · {item.specialty}
              </Text>
              {item.subspecialty && (
                <Text style={[styles.docSub, { color: colors.mutedForeground }]}>{item.subspecialty}</Text>
              )}
              <Text style={[styles.docHospital, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.hospital}
              </Text>
            </View>
            <View style={styles.docMeta}>
              <View style={[styles.rankBadge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.rankText, { color: colors.primary }]}>{item.rankingScore}</Text>
              </View>
              {item.verified && <Feather name="check-circle" size={14} color="#10B981" />}
            </View>
          </View>
        )}
        contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 : insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        scrollEnabled={!!doctors?.length}
        ListEmptyComponent={isLoading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="user-x" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No doctors found</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  searchBar: { padding: 12, borderBottomWidth: 1 },
  searchInput: { flexDirection: "row", alignItems: "center", borderRadius: 10, paddingHorizontal: 12, height: 42, borderWidth: 1, gap: 8 },
  searchField: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  specBar: { borderBottomWidth: 1, maxHeight: 50 },
  specList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  specChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: "transparent" },
  specChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { padding: 16, gap: 10 },
  doctorCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, borderWidth: 1, gap: 12 },
  docAvatar: { width: 48, height: 48, borderRadius: 12 },
  docInfo: { flex: 1, gap: 2 },
  docName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  docSpec: { fontSize: 13, fontFamily: "Inter_500Medium" },
  docSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  docHospital: { fontSize: 12, fontFamily: "Inter_400Regular" },
  docMeta: { alignItems: "center", gap: 6 },
  rankBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rankText: { fontSize: 13, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  loading: { paddingTop: 40, alignItems: "center" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
});
