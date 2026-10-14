import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Body, Button, Card, Chip, Empty, ErrorText, KeyValue, ListRow, Loading, Row, Screen, SectionTitle, Select, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { emrApi, encounterTone, formatDate, formatDateTime, patientLine, severityTone, titleCase, vitalSummary } from "@/lib/emr";

type Tab = "summary" | "encounters" | "notes";

export default function PatientScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("summary");
  const patient = useQuery({ queryKey: ["patient", id], queryFn: () => emrApi.patient(id!), enabled: Boolean(id) });
  const problems = useQuery({ queryKey: ["patient", id, "problems"], queryFn: () => emrApi.problems(id!), enabled: Boolean(id) });
  const medications = useQuery({ queryKey: ["patient", id, "medications"], queryFn: () => emrApi.medications(id!), enabled: Boolean(id) });
  const allergies = useQuery({ queryKey: ["patient", id, "allergies"], queryFn: () => emrApi.allergies(id!), enabled: Boolean(id) });
  const vitals = useQuery({ queryKey: ["patient", id, "vitals"], queryFn: () => emrApi.vitals(id!), enabled: Boolean(id) });
  const encounters = useQuery({ queryKey: ["patient", id, "encounters"], queryFn: () => emrApi.patientEncounters(id!), enabled: Boolean(id) });
  const notes = useQuery({ queryKey: ["patient", id, "notes"], queryFn: () => emrApi.patientNotes(id!), enabled: Boolean(id) });
  const p = patient.data;

  const latestVital = [...(vitals.data ?? [])].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  const activeProblems = (problems.data ?? []).filter((x) => x.status !== "resolved");
  const activeMeds = (medications.data ?? []).filter((m) => m.status === "active");

  return (
    <Screen
      back
      title={p?.name ?? "Patient"}
      subtitle={p ? `${patientLine(p)} · DOB ${formatDate(p.dateOfBirth)}` : undefined}
      onRefresh={() => {
        patient.refetch();
        problems.refetch();
        medications.refetch();
        allergies.refetch();
        vitals.refetch();
        encounters.refetch();
        notes.refetch();
      }}
      refreshing={patient.isRefetching}
      testID="screen-patient"
    >
      <ErrorText error={patient.error} />
      {patient.isLoading ? <Loading label="Opening the chart" /> : null}
      {p ? (
        <>
          <Row>
            <Chip label={titleCase(p.status)} tone={p.status === "active" ? "good" : "muted"} />
            {(allergies.data ?? []).length ? <Chip label={`${allergies.data!.length} allerg${allergies.data!.length === 1 ? "y" : "ies"}`} tone="bad" /> : <Chip label="NKDA" tone="good" />}
          </Row>
          <Row>
            <View style={{ flex: 1 }}>
              <Button label="Ask Ari about this chart" icon="message-circle" onPress={() => router.push({ pathname: "/(tabs)/ari", params: { patientId: p.id } })} testID="button-ask-ari" />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="New note" variant="outline" icon="edit-3" onPress={() => router.push({ pathname: "/note/new", params: { patientId: p.id } })} testID="button-new-note" />
            </View>
          </Row>

          <Select
            options={[
              { value: "summary", label: "Summary" },
              { value: "encounters", label: `Encounters (${encounters.data?.length ?? 0})` },
              { value: "notes", label: `Notes (${notes.data?.length ?? 0})` },
            ]}
            value={tab}
            onChange={setTab}
            testID="select-chart-tab"
          />

          {tab === "summary" ? (
            <>
              <SectionTitle>Latest vitals</SectionTitle>
              <Card>
                <Body>{vitalSummary(latestVital)}</Body>
                {latestVital ? <Body muted>Recorded {formatDateTime(latestVital.recordedAt)}</Body> : null}
              </Card>

              <SectionTitle>Problems</SectionTitle>
              {problems.isLoading ? <Loading /> : activeProblems.length === 0 ? <Empty text="No active problems." icon="check-circle" /> : null}
              {activeProblems.map((x) => (
                <Card key={x.id}>
                  <View style={styles.lineHead}>
                    <Text style={[styles.lineTitle, { color: c.foreground }]}>{x.name}</Text>
                    {x.severity ? <Chip label={titleCase(x.severity)} tone={severityTone(x.severity)} small /> : null}
                  </View>
                  <Text style={[styles.lineMeta, { color: c.mutedForeground }]}>
                    {[x.icd10Code, titleCase(x.status), x.onsetDate ? `since ${formatDate(x.onsetDate)}` : null].filter(Boolean).join(" · ")}
                  </Text>
                  {x.notes ? <Body muted>{x.notes}</Body> : null}
                </Card>
              ))}

              <SectionTitle>Medications</SectionTitle>
              {medications.isLoading ? <Loading /> : activeMeds.length === 0 ? <Empty text="No active medications." icon="package" /> : null}
              {activeMeds.map((m) => (
                <Card key={m.id}>
                  <Text style={[styles.lineTitle, { color: c.foreground }]}>
                    {m.name} <Text style={{ color: c.mutedForeground }}>{m.dosage}</Text>
                  </Text>
                  <Text style={[styles.lineMeta, { color: c.mutedForeground }]}>
                    {[m.frequency, titleCase(m.route), m.prescribedBy ? `by ${m.prescribedBy}` : null].filter(Boolean).join(" · ")}
                  </Text>
                  {m.instructions ? <Body muted>{m.instructions}</Body> : null}
                </Card>
              ))}

              <SectionTitle>Allergies</SectionTitle>
              {allergies.isLoading ? <Loading /> : (allergies.data ?? []).length === 0 ? <Empty text="No known drug allergies." icon="shield" /> : null}
              {(allergies.data ?? []).map((a) => (
                <Card key={a.id} tone={a.severity === "severe" || a.severity === "life-threatening" ? "bad" : "default"}>
                  <View style={styles.lineHead}>
                    <Text style={[styles.lineTitle, { color: c.foreground }]}>{a.allergen}</Text>
                    <Chip label={titleCase(a.severity)} tone={severityTone(a.severity)} small />
                  </View>
                  <Text style={[styles.lineMeta, { color: c.mutedForeground }]}>{[titleCase(a.allergyType), a.reaction].filter(Boolean).join(" · ")}</Text>
                </Card>
              ))}
            </>
          ) : null}

          {tab === "encounters" ? (
            <>
              <SectionTitle>Encounters</SectionTitle>
              {encounters.isLoading ? <Loading /> : (encounters.data ?? []).length === 0 ? <Empty text="No encounters on record." icon="file-text" /> : null}
              {(encounters.data ?? []).map((e) => (
                <ListRow
                  key={e.id}
                  title={`${titleCase(e.encounterType)} · ${e.reason}`}
                  subtitle={`${e.provider}${e.department ? ` · ${e.department}` : ""}`}
                  meta={formatDateTime(e.encounterDate)}
                  badge={titleCase(e.status)}
                  badgeTone={encounterTone(e.status)}
                  onPress={() => router.push(`/encounter/${e.id}`)}
                  testID={`row-encounter-${e.id}`}
                />
              ))}
            </>
          ) : null}

          {tab === "notes" ? (
            <>
              <SectionTitle>Clinical notes</SectionTitle>
              {notes.isLoading ? <Loading /> : (notes.data ?? []).length === 0 ? <Empty text="No notes yet. Start one with Ari." icon="edit-3" /> : null}
              {[...(notes.data ?? [])]
                .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
                .map((n) => (
                  <ListRow
                    key={n.id}
                    title={n.title}
                    subtitle={`${titleCase(n.noteType)} · ${n.author}${n.aiAssisted ? " · Ari-assisted" : ""}`}
                    meta={formatDateTime(n.updatedAt ?? n.createdAt)}
                    badge={n.status === "signed" ? "Signed" : "Draft"}
                    badgeTone={n.status === "signed" ? "good" : "warn"}
                    onPress={() => router.push(`/note/${n.id}`)}
                    testID={`row-note-${n.id}`}
                  />
                ))}
            </>
          ) : null}

          <Card>
            <KeyValue k="MRN" v={p.patientId} />
            <KeyValue k="Date of birth" v={formatDate(p.dateOfBirth)} />
            <KeyValue k="Registered" v={formatDate(p.createdAt)} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lineHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  lineTitle: { fontSize: 15, fontFamily: fonts.semibold, flex: 1 },
  lineMeta: { fontSize: 12, fontFamily: fonts.regular },
});
