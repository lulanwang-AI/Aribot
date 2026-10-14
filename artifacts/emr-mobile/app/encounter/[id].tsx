import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";

import { Body, Button, Card, Chip, Empty, ErrorText, Field, Input, KeyValue, ListRow, Loading, Row, Screen, SectionTitle } from "@/components/ui";
import { authorName, useAuth } from "@/lib/auth";
import { emrApi, encounterTone, formatDateTime, titleCase, usePatients, type SoapDraft } from "@/lib/emr";

export default function EncounterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const encounters = useQuery({ queryKey: ["encounters"], queryFn: emrApi.encounters });
  const encounter = encounters.data?.find((e) => e.id === id);
  const patients = usePatients();
  const notes = useQuery({ queryKey: ["encounter", id, "notes"], queryFn: () => emrApi.encounterNotes(id!), enabled: Boolean(id) });
  const patient = encounter ? patients.byId.get(encounter.patientId) : undefined;

  const [draft, setDraft] = useState<SoapDraft | null>(null);
  const [title, setTitle] = useState("");
  const [ai, setAi] = useState(false);

  const draftNote = useMutation({
    mutationFn: () => emrApi.draftNote(id!),
    onSuccess: (result) => {
      setDraft(result.draft);
      setTitle(result.title);
      setAi(result.ai);
    },
  });

  const save = useMutation({
    mutationFn: () =>
      emrApi.createNote({
        patientId: encounter!.patientId,
        encounterId: encounter!.id,
        noteType: "soap",
        title: title.trim() || `${titleCase(encounter!.encounterType)} note`,
        author: authorName(user),
        aiAssisted: ai,
        ...draft!,
      }),
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["encounter", id, "notes"] });
      queryClient.invalidateQueries({ queryKey: ["patient", encounter?.patientId, "notes"] });
      setDraft(null);
      router.push(`/note/${note.id}`);
    },
  });

  return (
    <Screen
      back
      title={encounter ? `${titleCase(encounter.encounterType)} encounter` : "Encounter"}
      subtitle={encounter ? `${patient?.name ?? "Patient"} · ${formatDateTime(encounter.encounterDate)}` : undefined}
      testID="screen-encounter"
    >
      <ErrorText error={encounters.error || notes.error} />
      {encounters.isLoading ? <Loading /> : null}
      {encounters.data && !encounter ? <Body muted>This encounter could not be found.</Body> : null}
      {encounter ? (
        <>
          <Row>
            <Chip label={titleCase(encounter.status)} tone={encounterTone(encounter.status)} />
            {encounter.department ? <Chip label={encounter.department} /> : null}
          </Row>
          <Card>
            <KeyValue k="Reason" v={encounter.reason} />
            <KeyValue k="Provider" v={encounter.provider} />
            {encounter.disposition ? <KeyValue k="Disposition" v={encounter.disposition} /> : null}
            {encounter.dischargeDate ? <KeyValue k="Discharged" v={formatDateTime(encounter.dischargeDate)} /> : null}
          </Card>
          {patient ? <Button label="Open the chart" variant="outline" icon="user" onPress={() => router.push(`/patient/${patient.id}`)} testID="button-open-chart" /> : null}

          <SectionTitle>Notes for this encounter</SectionTitle>
          {notes.isLoading ? <Loading /> : (notes.data ?? []).length === 0 ? <Empty text="No note yet for this encounter." icon="edit-3" /> : null}
          {(notes.data ?? []).map((n) => (
            <ListRow
              key={n.id}
              title={n.title}
              subtitle={`${n.author}${n.aiAssisted ? " · Ari-assisted" : ""}`}
              meta={formatDateTime(n.updatedAt ?? n.createdAt)}
              badge={n.status === "signed" ? "Signed" : "Draft"}
              badgeTone={n.status === "signed" ? "good" : "warn"}
              onPress={() => router.push(`/note/${n.id}`)}
              testID={`row-note-${n.id}`}
            />
          ))}

          <SectionTitle>Draft a note with Ari</SectionTitle>
          <ErrorText error={draftNote.error || save.error} />
          {!draft ? (
            <Card>
              <Body muted>Ari reads the chart (problems, medications, allergies, vitals, orders) and the encounter reason, then drafts a SOAP note for you to edit and sign.</Body>
              <Row>
                <Button label="Draft from the chart" icon="cpu" onPress={() => draftNote.mutate()} loading={draftNote.isPending} testID="button-draft-note" />
                <Button label="Dictate instead" variant="outline" onPress={() => router.push({ pathname: "/note/new", params: { patientId: encounter.patientId, encounterId: encounter.id } })} testID="button-dictate" />
              </Row>
            </Card>
          ) : (
            <Card testID="card-draft">
              <Row>
                <Chip label={ai ? "Drafted by Ari" : "Template draft (Ari offline)"} tone={ai ? "primary" : "muted"} small />
              </Row>
              <Field label="Title">
                <Input value={title} onChangeText={setTitle} testID="input-note-title" />
              </Field>
              {(["subjective", "objective", "assessment", "plan"] as (keyof SoapDraft)[]).map((section) => (
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
          )}
        </>
      ) : null}
    </Screen>
  );
}

