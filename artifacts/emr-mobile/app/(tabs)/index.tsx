import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card, Chip, Empty, ErrorText, ListRow, Loading, Screen, SectionTitle, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { appointmentTone, emrApi, encounterTone, formatDateTime, formatISODate, formatTime, patientLine, shiftISODate, titleCase, todayISO, usePatients } from "@/lib/emr";

export default function TodayScreen() {
  const c = useColors();
  const { user } = useAuth();
  const [date, setDate] = useState(todayISO());
  const appointments = useQuery({ queryKey: ["appointments", date], queryFn: () => emrApi.appointments(date) });
  const encounters = useQuery({ queryKey: ["encounters"], queryFn: emrApi.encounters });
  const patients = usePatients();

  const isToday = date === todayISO();
  const openEncounters = (encounters.data ?? []).filter((e) => e.status !== "closed").slice(0, 6);

  return (
    <Screen
      title={isToday ? "Today" : "Schedule"}
      subtitle={user?.name ? `${user.name} · ${formatISODate(date)}` : formatISODate(date)}
      onRefresh={() => {
        appointments.refetch();
        encounters.refetch();
      }}
      refreshing={appointments.isRefetching || encounters.isRefetching}
      right={
        <View style={styles.dateNav}>
          <Pressable onPress={() => setDate(shiftISODate(date, -1))} style={[styles.navBtn, { borderColor: c.border }]} accessibilityLabel="Previous day" testID="button-prev-day">
            <Feather name="chevron-left" size={18} color={c.foreground} />
          </Pressable>
          <Pressable onPress={() => setDate(todayISO())} style={[styles.navBtn, { borderColor: c.border }]} accessibilityLabel="Today" testID="button-today">
            <Text style={[styles.navText, { color: c.primary }]}>Today</Text>
          </Pressable>
          <Pressable onPress={() => setDate(shiftISODate(date, 1))} style={[styles.navBtn, { borderColor: c.border }]} accessibilityLabel="Next day" testID="button-next-day">
            <Feather name="chevron-right" size={18} color={c.foreground} />
          </Pressable>
        </View>
      }
      testID="screen-today"
    >
      <ErrorText error={appointments.error || encounters.error || patients.error} />
      <SectionTitle>Appointments</SectionTitle>
      {appointments.isLoading || patients.isLoading ? (
        <Loading label="Loading the schedule" />
      ) : (appointments.data ?? []).length === 0 ? (
        <Empty text={`Nothing booked for ${formatISODate(date)}.`} icon="calendar" />
      ) : (
        (appointments.data ?? []).map((a) => {
          const p = patients.byId.get(a.patientId);
          return (
            <Card key={a.id} onPress={() => router.push(`/patient/${a.patientId}`)} testID={`row-appointment-${a.id}`}>
              <View style={styles.apptRow}>
                <View style={[styles.time, { backgroundColor: c.primarySoft }]}>
                  <Text style={[styles.timeText, { color: c.primary }]}>{formatTime(a.appointmentTime)}</Text>
                  <Text style={[styles.duration, { color: c.primary }]}>{a.duration} min</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.apptName, { color: c.foreground }]}>{p?.name ?? "Patient"}</Text>
                  <Text style={[styles.apptMeta, { color: c.mutedForeground }]}>{patientLine(p)}</Text>
                  <Text style={[styles.apptReason, { color: c.foreground }]}>{a.reason}</Text>
                  <Text style={[styles.apptMeta, { color: c.mutedForeground }]}>
                    {a.provider} · {a.department} · {titleCase(a.visitType)}
                  </Text>
                </View>
                <Chip label={titleCase(a.status)} tone={appointmentTone(a.status)} small />
              </View>
            </Card>
          );
        })
      )}

      <SectionTitle>Open encounters</SectionTitle>
      {encounters.isLoading ? (
        <Loading />
      ) : openEncounters.length === 0 ? (
        <Empty text="No open encounters." icon="file-text" />
      ) : (
        openEncounters.map((e) => (
          <ListRow
            key={e.id}
            title={patients.byId.get(e.patientId)?.name ?? "Patient"}
            subtitle={`${titleCase(e.encounterType)} · ${e.reason}`}
            meta={`${e.provider} · ${formatDateTime(e.encounterDate)}`}
            badge={titleCase(e.status)}
            badgeTone={encounterTone(e.status)}
            onPress={() => router.push(`/encounter/${e.id}`)}
            testID={`row-encounter-${e.id}`}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateNav: { flexDirection: "row", gap: 6 },
  navBtn: { minWidth: 34, height: 34, paddingHorizontal: 8, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 12, fontFamily: fonts.semibold },
  apptRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  time: { width: 72, borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  timeText: { fontSize: 14, fontFamily: fonts.bold },
  duration: { fontSize: 11, fontFamily: fonts.medium, marginTop: 2 },
  apptName: { fontSize: 15, fontFamily: fonts.semibold },
  apptMeta: { fontSize: 12, fontFamily: fonts.regular },
  apptReason: { fontSize: 13, fontFamily: fonts.medium, marginTop: 2 },
});
