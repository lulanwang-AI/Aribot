import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Body, Button, Card, Chip, ErrorText, Field, Input, Loading, Row, Screen, SectionTitle, Select, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { emrApi, usePatients, type DifferentialItem } from "@/lib/emr";

type Tool = "chart" | "differential" | "transform";

function likelihoodTone(value: string): "bad" | "warn" | "muted" {
  if (value === "high") return "bad";
  if (value === "moderate") return "warn";
  return "muted";
}

export default function AriScreen() {
  const c = useColors();
  const params = useLocalSearchParams<{ patientId?: string }>();
  const patients = usePatients();
  const status = useQuery({ queryKey: ["ari", "status"], queryFn: emrApi.ariStatus, staleTime: 60_000 });
  const [tool, setTool] = useState<Tool>("chart");
  const [patientId, setPatientId] = useState<string | undefined>(typeof params.patientId === "string" ? params.patientId : undefined);
  const [question, setQuestion] = useState("");
  const [presentation, setPresentation] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"summarize" | "expand" | "restructure">("summarize");

  useEffect(() => {
    if (typeof params.patientId === "string") setPatientId(params.patientId);
  }, [params.patientId]);

  const chart = useMutation({ mutationFn: () => emrApi.chartQA(patientId!, question.trim()) });
  const differential = useMutation({ mutationFn: () => emrApi.differential(patientId!, presentation.trim()) });
  const transform = useMutation({ mutationFn: () => emrApi.transform(text.trim(), mode) });

  const patient = patientId ? patients.byId.get(patientId) : undefined;
  const needsPatient = tool !== "transform";

  return (
    <Screen title="Ari" subtitle="Chart-aware clinical assistant" testID="screen-ari">
      <Row>
        <Chip label={status.data?.available ? "Ari online" : status.isLoading ? "Checking" : "Ari offline: deterministic fallbacks"} tone={status.data?.available ? "good" : "muted"} />
      </Row>
      <Select
        options={[
          { value: "chart", label: "Ask the chart" },
          { value: "differential", label: "Differential" },
          { value: "transform", label: "Rewrite text" },
        ]}
        value={tool}
        onChange={setTool}
        testID="select-tool"
      />

      {needsPatient ? (
        <>
          <SectionTitle>Patient</SectionTitle>
          <ErrorText error={patients.error} />
          {patients.isLoading ? <Loading /> : null}
          <Select options={(patients.data ?? []).map((p) => ({ value: p.id, label: p.name }))} value={patientId} onChange={setPatientId} testID="select-patient" />
        </>
      ) : null}

      {tool === "chart" ? (
        <Card>
          <Field label={patient ? `Question about ${patient.name}'s chart` : "Question"} hint="Ari answers from problems, medications, allergies, vitals, encounters and orders.">
            <Input value={question} onChangeText={setQuestion} placeholder="What changed in the last two encounters?" multiline testID="input-question" />
          </Field>
          <Button label="Ask Ari" icon="message-circle" onPress={() => chart.mutate()} loading={chart.isPending} disabled={!patientId || !question.trim()} testID="button-ask" />
          <ErrorText error={chart.error} />
          {chart.data ? (
            <View style={[styles.answer, { backgroundColor: c.primarySoft, borderRadius: c.radius }]} testID="card-answer">
              <Text style={[styles.answerText, { color: c.foreground }]}>{chart.data.answer}</Text>
              {!chart.data.ai ? <Body muted>Generated from the chart without the AI model.</Body> : null}
            </View>
          ) : null}
        </Card>
      ) : null}

      {tool === "differential" ? (
        <Card>
          <Field label="Presentation" hint="Describe the current complaint. Ari combines it with the chart history.">
            <Input value={presentation} onChangeText={setPresentation} placeholder="Three days of productive cough, fever to 38.6, pleuritic chest pain" multiline testID="input-presentation" />
          </Field>
          <Button label="Suggest a differential" icon="list" onPress={() => differential.mutate()} loading={differential.isPending} disabled={!patientId || !presentation.trim()} testID="button-differential" />
          <ErrorText error={differential.error} />
          {differential.data ? (
            <View style={{ gap: 8 }} testID="card-differential">
              {differential.data.differentials.map((d: DifferentialItem, i: number) => (
                <View key={`${d.diagnosis}-${i}`} style={[styles.diff, { borderColor: c.border }]}>
                  <Row style={{ justifyContent: "space-between" }}>
                    <Text style={[styles.diffName, { color: c.foreground }]}>{d.diagnosis}</Text>
                    <Chip label={d.likelihood} tone={likelihoodTone(d.likelihood)} small />
                  </Row>
                  <Body muted>{d.rationale}</Body>
                  {d.nextSteps?.length ? <Body>Next: {d.nextSteps.join("; ")}</Body> : null}
                </View>
              ))}
              <Body muted>{differential.data.disclaimer}</Body>
            </View>
          ) : null}
        </Card>
      ) : null}

      {tool === "transform" ? (
        <Card>
          <Field label="Text">
            <Input value={text} onChangeText={setText} placeholder="Paste a note or dictation" multiline style={{ minHeight: 120 }} testID="input-text" />
          </Field>
          <Field label="Rewrite as">
            <Select
              options={[
                { value: "summarize", label: "Summary" },
                { value: "expand", label: "Expanded" },
                { value: "restructure", label: "Restructured" },
              ]}
              value={mode}
              onChange={setMode}
              testID="select-mode"
            />
          </Field>
          <Button label="Rewrite" icon="refresh-cw" onPress={() => transform.mutate()} loading={transform.isPending} disabled={!text.trim()} testID="button-transform" />
          <ErrorText error={transform.error} />
          {transform.data ? (
            <View style={[styles.answer, { backgroundColor: c.primarySoft, borderRadius: c.radius }]} testID="card-transform">
              <Text style={[styles.answerText, { color: c.foreground }]}>{transform.data.result}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      <Body muted>Ari's output is a suggestion for a licensed clinician to review. Nothing here is written to the chart until you save and sign a note.</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  answer: { padding: 14 },
  answerText: { fontSize: 15, fontFamily: fonts.regular, lineHeight: 23 },
  diff: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 8, gap: 4 },
  diffName: { fontSize: 15, fontFamily: fonts.semibold, flex: 1 },
});
