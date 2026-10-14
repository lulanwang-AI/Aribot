import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Body, Button, Card, Chip, ErrorText, Field, Input, KeyValue, Loading, Row, Screen, SectionTitle, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { authorName, useAuth } from "@/lib/auth";
import { emrApi, formatDateTime, titleCase, type ClinicalNote, type SoapDraft } from "@/lib/emr";

const SECTIONS: (keyof SoapDraft)[] = ["subjective", "objective", "assessment", "plan"];

export default function NoteScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const note = useQuery({ queryKey: ["note", id], queryFn: () => emrApi.note(id!), enabled: Boolean(id) });
  const n = note.data;

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState<SoapDraft>({ subjective: "", objective: "", assessment: "", plan: "" });
  const [content, setContent] = useState("");
  const [addendum, setAddendum] = useState("");

  useEffect(() => {
    if (n && !editing) {
      setTitle(n.title);
      setDraft({ subjective: n.subjective ?? "", objective: n.objective ?? "", assessment: n.assessment ?? "", plan: n.plan ?? "" });
      setContent(n.content ?? "");
    }
  }, [n, editing]);

  function applyUpdate(updated: ClinicalNote) {
    queryClient.setQueryData(["note", id], updated);
    queryClient.invalidateQueries({ queryKey: ["patient", updated.patientId, "notes"] });
    if (updated.encounterId) queryClient.invalidateQueries({ queryKey: ["encounter", updated.encounterId, "notes"] });
  }

  const save = useMutation({
    mutationFn: () => emrApi.updateNote(id!, n?.noteType === "soap" ? { title, ...draft } : { title, content }),
    onSuccess: (updated) => {
      setEditing(false);
      applyUpdate(updated);
    },
  });
  const sign = useMutation({ mutationFn: () => emrApi.signNote(id!, authorName(user)), onSuccess: applyUpdate });
  const addAddendum = useMutation({
    mutationFn: () => emrApi.addAddendum(id!, addendum.trim(), authorName(user)),
    onSuccess: (updated) => {
      setAddendum("");
      applyUpdate(updated);
    },
  });

  const isSoap = n?.noteType === "soap";

  return (
    <Screen back title={n?.title ?? "Note"} subtitle={n ? `${titleCase(n.noteType)} note · ${n.author}` : undefined} testID="screen-note">
      <ErrorText error={note.error || save.error || sign.error || addAddendum.error} />
      {note.isLoading ? <Loading /> : null}
      {n ? (
        <>
          <Row>
            <Chip label={n.status === "signed" ? `Signed by ${n.signedBy ?? n.author}` : "Draft"} tone={n.status === "signed" ? "good" : "warn"} />
            {n.aiAssisted ? <Chip label="Ari-assisted" tone="primary" /> : null}
          </Row>

          {editing ? (
            <Card testID="card-edit-note">
              <Field label="Title">
                <Input value={title} onChangeText={setTitle} testID="input-note-title" />
              </Field>
              {isSoap ? (
                SECTIONS.map((section) => (
                  <Field key={section} label={titleCase(section)}>
                    <Input value={draft[section]} onChangeText={(v) => setDraft({ ...draft, [section]: v })} multiline testID={`input-${section}`} />
                  </Field>
                ))
              ) : (
                <Field label="Note">
                  <Input value={content} onChangeText={setContent} multiline testID="input-content" />
                </Field>
              )}
              <Row>
                <View style={{ flex: 1 }}>
                  <Button label="Save changes" icon="save" onPress={() => save.mutate()} loading={save.isPending} testID="button-save-note" />
                </View>
                <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
              </Row>
            </Card>
          ) : (
            <>
              {isSoap ? (
                SECTIONS.map((section) => (
                  <Card key={section}>
                    <Text style={[styles.sectionLabel, { color: c.primary }]}>{titleCase(section)}</Text>
                    <Body>{(n[section] as string | null) || "—"}</Body>
                  </Card>
                ))
              ) : (
                <Card>
                  <Body>{n.content || "—"}</Body>
                </Card>
              )}
              {n.status !== "signed" ? (
                <Row>
                  <View style={{ flex: 1 }}>
                    <Button label="Edit" variant="outline" icon="edit-2" onPress={() => setEditing(true)} testID="button-edit-note" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="Sign note" icon="check-circle" onPress={() => sign.mutate()} loading={sign.isPending} testID="button-sign-note" />
                  </View>
                </Row>
              ) : null}
            </>
          )}

          {n.status === "signed" ? (
            <>
              <SectionTitle>Addendums</SectionTitle>
              {(n.addendums ?? []).map((a, i) => (
                <Card key={i}>
                  <Body>{a.text}</Body>
                  <Body muted>
                    {a.author} · {formatDateTime(a.createdAt)}
                  </Body>
                </Card>
              ))}
              <Card>
                <Input value={addendum} onChangeText={setAddendum} placeholder="Add an addendum to the signed note" multiline testID="input-addendum" />
                <Button label="Add addendum" variant="outline" small onPress={() => addAddendum.mutate()} loading={addAddendum.isPending} disabled={!addendum.trim()} testID="button-add-addendum" />
              </Card>
            </>
          ) : null}

          <Card>
            <KeyValue k="Created" v={formatDateTime(n.createdAt)} />
            <KeyValue k="Updated" v={formatDateTime(n.updatedAt)} />
            {n.signedAt ? <KeyValue k="Signed" v={formatDateTime(n.signedAt)} /> : null}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 12, fontFamily: fonts.semibold, textTransform: "uppercase", letterSpacing: 0.8 },
});
