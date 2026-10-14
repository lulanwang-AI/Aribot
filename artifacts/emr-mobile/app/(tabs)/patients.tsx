import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Empty, ErrorText, Input, ListRow, Loading, Screen, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { initials, patientLine, titleCase, usePatients } from "@/lib/emr";

export default function PatientsScreen() {
  const c = useColors();
  const patients = usePatients();
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (patients.data ?? [])
      .filter((p) => !needle || p.name.toLowerCase().includes(needle) || p.patientId.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients.data, search]);

  return (
    <Screen title="Patients" subtitle={patients.data ? `${patients.data.length} on the panel` : undefined} onRefresh={() => patients.refetch()} refreshing={patients.isRefetching} testID="screen-patients">
      <Input value={search} onChangeText={setSearch} placeholder="Search by name or MRN" autoCorrect={false} testID="input-patient-search" />
      <ErrorText error={patients.error} />
      {patients.isLoading ? (
        <Loading label="Loading the panel" />
      ) : visible.length === 0 ? (
        <Empty text="No patient matches that search." icon="search" />
      ) : (
        visible.map((p) => (
          <ListRow
            key={p.id}
            title={p.name}
            subtitle={patientLine(p)}
            badge={titleCase(p.status)}
            badgeTone={p.status === "active" ? "good" : "muted"}
            onPress={() => router.push(`/patient/${p.id}`)}
            right={
              <View style={[styles.avatar, { backgroundColor: c.primarySoft }]}>
                <Text style={[styles.avatarText, { color: c.primary }]}>{initials(p.name)}</Text>
              </View>
            }
            testID={`row-patient-${p.id}`}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 12, fontFamily: fonts.bold },
});
