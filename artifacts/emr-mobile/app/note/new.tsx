import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";

import { Body, Button, Card, Chip, ErrorText, Field, Input, Loading, Row, Screen, SectionTitle, Select } from "@/components/ui";
import { authorName, useAuth } from "@/lib/auth";
import { emrApi, formatDateTime, titleCase, usePatients, type SoapDraft } from "@/lib/emr";

const SECTIONS: (keyof SoapDraft)[] = ["subjective", "objective", "assessment", "plan"];

/**
 * Dictate or type a narrative between rooms; Ari structures it into SOAP, the
 * clinician edits and saves a draft, then signs it from the note screen.
 */
export default function NewNoteScreen() {
  const params = useLocalSearchParams<{ patientId?: string; encounterId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const patients = usePatients();
  const [patientId, setPatientId] = useState<string | undefined>(typeof params.patientId === "string" ? params.patientId : undefined);
  const [encounterId, setEncounterId] = useState<string | undefined>(typeof params.encounterId === "string" ? params.encounterId : undefined);
  const encounters = useQuery({ queryKey: ["patient", patientId, "encounters"], queryFn: () => emrApi.patientEncounters(patientId!), enabled: Boolean(patientId) });
  const [narrative, setNarrative] = useState("");
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState<SoapDraft | null>(null);
  const [ai, setAi] = useState(false);

  const structure = useMutation({
    mutationFn: () => emrApi.structureNarrative(narrative.trim(), patientId),
    onSuccess: (result) => {
      setDraft(result.draft);
      setAi(result.ai);
      if (!title) setTitle("Progress note");
    },
  });

  const save = useMutation({
    mutationFn: () =>
      emrApi.createNote({
        patientId: patientId!,
        encounterId: encounterId ?? null,
        noteType: "soap",
        title: title.trim() || "Progress note",
        author: authorName(user),
        aiAssisted: ai,
        ...draft!,
      }),
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["patient", patientId, "notes"] });
      if (encounterId) queryClient.invalidateQueries({ queryKey: ["encounter", encounterId, "notes"] });
      router.replace(`/note/${note.id}`);
    },
  });

  const patient = patientId ? patients.byId.get(patientId) : undefined;

  return (
    <Screen back title="New note" subtitle={patient ? patient.name : "Pick a patient, then dictate"} testID="screen-new-note">
      <ErrorText error={patients.error || structure.error || save.error} />
      {!patientId ? (
        <>
          <SectionTitle>Patient</SectionTitle>
          {patients.isLoading ? <Loading /> : null}
          <Select options={(patients.data ?? []).map((p) => ({ value: p.id, label: p.name }))} value={patientId} onChange={setPatientId} testID="select-patient" />
        </>
      ) : (
        <>
          <Row>
            <Chip label={`MRN ${patient?.patientId ?? ""}`} />
            <Button label="Change patient" variant="ghost" small onPress={() => { setPatientId(undefined); setEncounterId(undefined); }} />
          </Row>
          <SectionTitle>Encounter (optional)</SectionTitle>
          {encounters.isLoading ? <Loading /> : null}
          <Select
            options={[{ value: "none", label: "No encounter" }, ...(encounters.data ?? []).map((e) => ({ value: e.id, label: `${titleCase(e.encounterType)} · ${formatDateTime(e.encounterDate)}` }))]}
            value={encounterId ?? "none"}
            onChange={(v) => setEncounterId(v === "none" ? undefined : v)}
            testID="select-encounter"
          />

          <SectionTitle>Narrative</SectionTitle>
          <Card>
            <Body muted>Type or dictate with your keyboard's microphone. Ari turns it into Subjective, Objective, Assessment and Plan, reading the chart for context.</Body>
            <Input
              value={narrative}
              onChangeText={setNarrative}
              placeholder="Seen on the ward round. Reports less cough, afebrile overnight, eating. Chest clear on the left, crackles right base improving…"
              multiline
              style={{ minHeight: 140 }}
              testID="input-narrative"
            />
            <Button label="Structure with Ari" icon="cpu" onPress={() => structure.mutate()} loading={structure.isPending} disabled={!narrative.trim()} testID="button-structure" />
          </Card>

          {draft ? (
            <Card testID="card-draft">
              <Row>
                <Chip label={ai ? "Structured by Ari" : "Template draft (Ari offline)"} tone={ai ? "primary" : "muted"} small />
              </Row>
              <Field label="Title">
                <Input value={title} onChangeText={setTitle} testID="input-note-title" />
              </Field>
              {SECTIONS.map((section) => (
                <Field key={section} label={titleCase(section)}>
                  <Input value={draft[section]} onChangeText={(v) => setDraft({ ...draft, [section]: v })} multiline testID={`input-${section}`} />
                </Field>
              ))}
              <Row>
                <View style={{ flex: 1 }}>
                  <Button label="Save draft note" icon="save" onPress={() => save.mutate()} loading={save.isPending} testID="button-save-note" />
                </View>
                <Button label="Discard" variant="ghost" onPress={() => setDraft(null)} />
              </Row>
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}
