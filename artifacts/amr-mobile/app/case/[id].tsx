import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Body, Bullets, Button, Card, Chip, Divider, ErrorText, Field, Input, KeyValue, Loading, Row, Screen, SectionTitle, Select, Toggle, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import {
  ACTION_TONE,
  MOBILE_ACTOR,
  SETTING_LABELS,
  SEVERITY_LABELS,
  SEVERITY_TONE,
  STATUS_LABELS,
  STATUS_TONE,
  TIER_LABELS,
  TIER_TONE,
  amrApi,
  formatDate,
  formatDateTime,
  formatDuration,
  formatPercent,
  formatReviewClock,
  regimenSummary,
  type ClinicalResponse,
  type CultureResult,
  type RegimenRecommendation,
  type StewardshipCaseView,
  type SusceptibilityCategory,
} from "@/lib/amr";
import { useAuth } from "@/lib/auth";

const EVENT_ICON: Record<string, string> = {
  intake_completed: "Intake",
  empiric_started: "Started",
  cultures_resulted: "Cultures",
  review_completed: "Review",
  de_escalated: "Narrowed",
  escalated: "Escalated",
  stopped: "Stopped",
  switched_iv_to_po: "IV to PO",
  completed: "Completed",
  note: "Note",
};

function RegimenCard({
  regimen,
  record,
  onStart,
  starting,
}: {
  regimen: RegimenRecommendation;
  record: StewardshipCaseView;
  onStart: (regimenId: string) => void;
  starting: boolean;
}) {
  const c = useColors();
  const started = record.selectedRegimenId === regimen.id;
  const canStart = !record.therapyStartedAt && record.status === "empiric";
  const blocked = regimen.allergyConflicts.some((a) => a.verdict === "contraindicated");
  return (
    <Card tone={started ? "primary" : regimen.preferred ? "default" : "default"} testID={`regimen-${regimen.id}`}>
      <View style={styles.regimenHead}>
        <Text style={[styles.regimenLabel, { color: c.foreground }]}>
          {regimen.rank}. {regimen.label}
        </Text>
        {regimen.preferred ? <Chip label="Preferred" tone="good" small /> : null}
        {started ? <Chip label="Started" tone="primary" small /> : null}
      </View>
      {regimen.sourceControlOnly ? (
        <Body muted>No antimicrobial: the treatment is source control.</Body>
      ) : (
        regimen.agents.map((a) => (
          <View key={a.agentId} style={styles.agentRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.agentName, { color: c.foreground }]}>
                {a.name} <Text style={{ color: c.mutedForeground }}>{a.route}</Text>
              </Text>
              <Text style={[styles.agentDose, { color: c.mutedForeground }]}>{a.dose}{a.renalNote ? ` · ${a.renalNote}` : ""}</Text>
            </View>
            <Chip label={TIER_LABELS[a.tier]} tone={TIER_TONE[a.tier]} small />
          </View>
        ))
      )}
      <Row>
        {!regimen.sourceControlOnly ? <Chip label={`Coverage ${formatPercent(regimen.expectedCoverage)}`} tone={regimen.expectedCoverage >= 90 ? "good" : "warn"} small /> : null}
        <Chip label={`Spectrum cost ${regimen.spectrumCost}`} small />
        <Chip label={formatDuration(regimen.durationDays)} small />
      </Row>
      {regimen.selectionNote ? <Body muted>{regimen.selectionNote}</Body> : null}
      {regimen.allergyConflicts.map((conflict) => (
        <Text key={conflict.agentId + conflict.allergy} style={[styles.conflict, { color: conflict.verdict === "contraindicated" ? c.bad : c.warn }]}>
          {conflict.agentName}: {conflict.allergy} ({conflict.kind === "direct" ? "direct" : "cross-reactive"}) - {conflict.guidance}
        </Text>
      ))}
      {regimen.warnings.length ? <Bullets items={regimen.warnings} tone="warn" /> : null}
      {canStart ? (
        <Button
          label={blocked ? "Contraindicated by allergy" : "Start this regimen"}
          onPress={() => onStart(regimen.id)}
          loading={starting}
          disabled={blocked}
          variant={regimen.preferred ? "primary" : "outline"}
          testID={`button-start-${regimen.id}`}
        />
      ) : null}
    </Card>
  );
}

export default function CaseScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const actor = user?.name ? `${user.name} (mobile)` : MOBILE_ACTOR;

  const query = useQuery({ queryKey: ["amr", "case", id], queryFn: () => amrApi.case(id!), enabled: Boolean(id) });
  const reference = useQuery({ queryKey: ["amr", "reference"], queryFn: amrApi.reference, staleTime: Infinity });
  const k = query.data;

  function applyUpdate(updated: StewardshipCaseView) {
    queryClient.setQueryData(["amr", "case", id], updated);
    queryClient.invalidateQueries({ queryKey: ["amr", "cases"] });
    queryClient.invalidateQueries({ queryKey: ["amr", "metrics"] });
  }

  const start = useMutation({ mutationFn: (regimenId: string) => amrApi.startTherapy(id!, regimenId, actor), onSuccess: applyUpdate });

  // 48 to 72 hour review form
  const [cultureStatus, setCultureStatus] = useState<CultureResult["status"]>("pending");
  const [organismId, setOrganismId] = useState<string | undefined>(undefined);
  const [specimen, setSpecimen] = useState("Blood");
  const [susceptibilities, setSusceptibilities] = useState<Record<string, SusceptibilityCategory>>({});
  const [contaminant, setContaminant] = useState(false);
  const [rapid, setRapid] = useState("");
  const [cultureNotes, setCultureNotes] = useState("");
  const [response, setResponse] = useState<ClinicalResponse>({
    afebrile24h: true,
    hemodynamicallyStable: true,
    wbcTrend: "falling",
    tolueratingOral: true,
    sourceControlDone: true,
    improving: true,
    notes: "",
  });

  const currentAgents = useMemo(() => {
    if (!k?.empiric) return [];
    const selected = k.empiric.regimens.find((r) => r.id === k.selectedRegimenId) ?? k.empiric.regimens[0];
    return selected?.agents ?? [];
  }, [k]);

  const review = useMutation({
    mutationFn: () => {
      const cultures: CultureResult = {
        status: cultureStatus,
        isolates:
          cultureStatus === "growth" && organismId
            ? [
                {
                  organismId,
                  specimen: specimen || "Unspecified",
                  collectedOn: new Date().toISOString().slice(0, 10),
                  susceptibilities: Object.fromEntries(currentAgents.map((a) => [a.agentId, susceptibilities[a.agentId] ?? "S"])),
                  probableContaminant: contaminant || undefined,
                },
              ]
            : [],
        rapidDiagnostics: rapid
          .split(/[;\n]/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [name, ...rest] = line.split(":");
            return { name: name.trim(), result: rest.join(":").trim() || "reported" };
          }),
        notes: cultureNotes,
      };
      return amrApi.submitReview(id!, { cultures, response, actor });
    },
    onSuccess: applyUpdate,
  });

  const [outcome, setOutcome] = useState<"accepted" | "modified" | "overridden">("accepted");
  const [decisionNote, setDecisionNote] = useState("");
  const decision = useMutation({ mutationFn: () => amrApi.recordDecision(id!, { outcome, by: actor, note: decisionNote }), onSuccess: applyUpdate });

  const [note, setNote] = useState("");
  const addNote = useMutation({
    mutationFn: () => amrApi.addNote(id!, note.trim(), actor),
    onSuccess: (updated) => {
      setNote("");
      applyUpdate(updated);
    },
  });

  const bacterialOrganisms = useMemo(() => (reference.data?.organisms ?? []).filter((o) => o.gram !== "fungal"), [reference.data]);

  // Starting therapy records a decision on the empiric plan; the targeted
  // recommendation generated at the review is a new recommendation and gets
  // its own decision, so only a decision made after it counts here.
  const targetedDecision =
    k?.decision && k.targeted && new Date(k.decision.at).getTime() >= new Date(k.targeted.generatedAt).getTime() ? k.decision : undefined;
  const empiricDecision = k?.decision && !targetedDecision ? k.decision : undefined;

  const ariPrompt = k
    ? `Stewardship question about a ${SEVERITY_LABELS[k.severity].toLowerCase()} ${k.syndromeName.toLowerCase()} case in the ${SETTING_LABELS[k.setting].toLowerCase()} setting` +
      (currentAgents.length ? ` on ${currentAgents.map((a) => a.name).join(" + ")}` : "") +
      ". What should the 48 to 72 hour review focus on?"
    : "";

  return (
    <Screen
      back
      title={k ? k.patientLabel : "Case"}
      subtitle={k ? `MRN ${k.mrn} · ${k.ward} · ${k.assignedTo}` : undefined}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching}
      testID="screen-case"
    >
      <ErrorText error={query.error} />
      {query.isLoading ? <Loading label="Loading the case" /> : null}
      {k ? (
        <>
          <Row>
            <Chip label={STATUS_LABELS[k.status]} tone={STATUS_TONE[k.status]} />
            <Chip label={SEVERITY_LABELS[k.severity]} tone={SEVERITY_TONE[k.severity]} />
            <Chip label={SETTING_LABELS[k.setting]} />
            {k.therapyStartedAt && !k.targeted && k.status !== "completed" && k.status !== "stopped" ? (
              <Chip label={`Review ${formatReviewClock(k.hoursToReview)}`} tone={k.reviewDue ? "warn" : "muted"} />
            ) : null}
          </Row>

          <SectionTitle>Intake</SectionTitle>
          <Card>
            <KeyValue k="Syndrome" v={k.syndromeName} />
            {k.empiric ? <KeyValue k="Antibiogram" v={k.empiric.region.name} /> : null}
            <KeyValue k="Onset" v={formatDate(k.intake.symptoms.onsetDate)} />
            <KeyValue k="Age / sex / weight" v={`${k.intake.clinical.ageYears} y · ${k.intake.clinical.sex} · ${k.intake.clinical.weightKg} kg`} />
            {k.intake.clinical.creatinineClearance ? <KeyValue k="Creatinine clearance" v={`${k.intake.clinical.creatinineClearance} mL/min`} /> : null}
            <KeyValue
              k="Allergies"
              v={k.intake.allergies.length ? k.intake.allergies.map((a) => `${a.agentOrClass} (${a.severity.replace(/_/g, " ")})`).join(", ") : "None recorded"}
              tone={k.intake.allergies.some((a) => a.severity === "anaphylaxis" || a.severity === "sjs_ten" || a.severity === "dress") ? "bad" : undefined}
            />
            {k.intake.antibioticsLast90Days.length ? <KeyValue k="Antibiotics, last 90 days" v={k.intake.antibioticsLast90Days.join(", ")} /> : null}
            {k.intake.comorbidities.length ? <KeyValue k="Comorbidities" v={k.intake.comorbidities.join(", ")} /> : null}
            <KeyValue
              k="Devices"
              v={
                [k.intake.foleyCatheter.present ? "Foley" : null, k.intake.tracheostomy.present ? "Tracheostomy" : null, k.intake.ventilator.present ? "Ventilator" : null]
                  .filter(Boolean)
                  .join(", ") || "None"
              }
            />
            {k.intake.sourceNotes ? <Body muted>{k.intake.sourceNotes}</Body> : null}
          </Card>

          {k.empiric ? (
            <>
              <SectionTitle>Empiric recommendation</SectionTitle>
              <Card>
                <Row>
                  <Chip label={`Target ${formatPercent(k.empiric.coverageTarget)}`} tone="primary" small />
                  {k.empiric.riskFactors.map((r) => (
                    <Chip key={r.id} label={r.label} tone="warn" small />
                  ))}
                </Row>
                <Text style={[styles.subhead, { color: c.mutedForeground }]}>Differential</Text>
                {k.empiric.differential.slice(0, 6).map((o) => (
                  <View key={o.organismId} style={styles.diffRow}>
                    <Text style={[styles.diffName, { color: c.foreground }]}>{o.shortName}</Text>
                    <Text style={[styles.diffMeta, { color: c.mutedForeground }]}>{Math.round(o.likelihood * 100)}%</Text>
                    <Chip label={o.covered ? `${formatPercent(o.expectedSusceptibility)} S` : "Gap"} tone={o.covered ? "good" : "bad"} small />
                  </View>
                ))}
                <Body muted>Guideline: {k.empiric.syndrome.guideline}</Body>
              </Card>
              {k.empiric.regimens.map((r) => (
                <RegimenCard key={r.id} regimen={r} record={k} onStart={(regimenId) => start.mutate(regimenId)} starting={start.isPending && start.variables === r.id} />
              ))}
              <ErrorText error={start.error} />
              {empiricDecision ? (
                <Card>
                  <KeyValue k="Empiric decision" v={`${empiricDecision.outcome} by ${empiricDecision.by} · ${formatDateTime(empiricDecision.at)}`} />
                  {empiricDecision.note ? <Body muted>{empiricDecision.note}</Body> : null}
                </Card>
              ) : null}
              {k.empiric.workup.length ? (
                <Card>
                  <Text style={[styles.subhead, { color: c.mutedForeground }]}>Send before the first dose</Text>
                  <Bullets items={k.empiric.workup} />
                </Card>
              ) : null}
              {k.empiric.redFlags.length ? (
                <Card tone="bad">
                  <Text style={[styles.subhead, { color: c.bad }]}>Red flags</Text>
                  <Bullets items={k.empiric.redFlags} tone="bad" />
                </Card>
              ) : null}
            </>
          ) : null}

          <SectionTitle>48 to 72 hour review</SectionTitle>
          {k.targeted ? (
            <Card tone={ACTION_TONE[k.targeted.action]} testID="card-targeted">
              <Row>
                <Chip label={k.targeted.actionLabel} tone={ACTION_TONE[k.targeted.action]} />
                <Chip label={`${k.targeted.confidence} confidence`} small />
              </Row>
              <Text style={[styles.headline, { color: c.foreground }]}>{k.targeted.headline}</Text>
              {k.targeted.regimen.length ? <KeyValue k="Regimen" v={regimenSummary(k.targeted.regimen)} /> : null}
              {k.targeted.discontinue.map((d) => (
                <KeyValue key={d.agentId} k={`Stop ${d.name}`} v={d.reason} />
              ))}
              <KeyValue k="Total duration" v={formatDuration(k.targeted.totalDuration)} />
              {k.targeted.stopDate ? <KeyValue k="Planned stop" v={formatDate(k.targeted.stopDate)} /> : null}
              <KeyValue k="IV to PO" v={k.targeted.ivToPo.eligible ? `Eligible${k.targeted.ivToPo.agent ? `: ${k.targeted.ivToPo.agent.name} ${k.targeted.ivToPo.agent.dose}` : ""}` : k.targeted.ivToPo.blockers.join("; ") || "Not yet"} tone={k.targeted.ivToPo.eligible ? "good" : undefined} />
              <Divider />
              <Bullets items={k.targeted.rationale} />
              {k.targeted.warnings.length ? <Bullets items={k.targeted.warnings} tone="warn" /> : null}
              {targetedDecision ? (
                <>
                  <Divider />
                  <KeyValue k="Decision" v={`${targetedDecision.outcome} by ${targetedDecision.by} · ${formatDateTime(targetedDecision.at)}`} />
                  {targetedDecision.note ? <Body muted>{targetedDecision.note}</Body> : null}
                </>
              ) : (
                <>
                  <Divider />
                  <Field label="Record the clinician's decision">
                    <Select
                      options={[
                        { value: "accepted", label: "Accepted" },
                        { value: "modified", label: "Modified" },
                        { value: "overridden", label: "Overridden" },
                      ]}
                      value={outcome}
                      onChange={setOutcome}
                      testID="select-decision"
                    />
                  </Field>
                  <Field label="Note">
                    <Input value={decisionNote} onChangeText={setDecisionNote} placeholder="Why, in one line" testID="input-decision-note" />
                  </Field>
                  <ErrorText error={decision.error} />
                  <Button label="Save decision" onPress={() => decision.mutate()} loading={decision.isPending} testID="button-save-decision" />
                </>
              )}
            </Card>
          ) : !k.therapyStartedAt ? (
            <Card>
              <Body muted>Start a regimen above. The review opens once therapy is running and results are back.</Body>
            </Card>
          ) : (
            <Card testID="card-review-form">
              <Field label="Culture result">
                <Select
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "no_growth", label: "No growth" },
                    { value: "growth", label: "Growth" },
                    { value: "contaminant", label: "Contaminant" },
                  ]}
                  value={cultureStatus}
                  onChange={setCultureStatus}
                  testID="select-culture-status"
                />
              </Field>
              {cultureStatus === "growth" ? (
                <>
                  <Field label="Organism isolated">
                    <Select options={bacterialOrganisms.map((o) => ({ value: o.id, label: o.shortName }))} value={organismId} onChange={setOrganismId} testID="select-organism" />
                  </Field>
                  <Field label="Specimen">
                    <Input value={specimen} onChangeText={setSpecimen} placeholder="Blood, urine, sputum" testID="input-specimen" />
                  </Field>
                  {currentAgents.length ? (
                    <Field label="Susceptibility of the current agents">
                      {currentAgents.map((a) => (
                        <View key={a.agentId} style={styles.sirRow}>
                          <Text style={[styles.sirName, { color: c.foreground }]}>{a.name}</Text>
                          <Select
                            options={[
                              { value: "S", label: "S" },
                              { value: "I", label: "I" },
                              { value: "R", label: "R" },
                            ]}
                            value={susceptibilities[a.agentId] ?? "S"}
                            onChange={(v) => setSusceptibilities((prev) => ({ ...prev, [a.agentId]: v }))}
                            testID={`select-sir-${a.agentId}`}
                          />
                        </View>
                      ))}
                    </Field>
                  ) : null}
                  <Toggle label="Probable contaminant" value={contaminant} onChange={setContaminant} />
                </>
              ) : null}
              <Field label="Rapid diagnostics" hint="One per line, as name: result. For example MRSA nares: negative">
                <Input value={rapid} onChangeText={setRapid} placeholder="MRSA nares: negative" multiline testID="input-rapid" />
              </Field>
              <Field label="Culture notes">
                <Input value={cultureNotes} onChangeText={setCultureNotes} placeholder="Anything the lab flagged" testID="input-culture-notes" />
              </Field>
              <Text style={[styles.subhead, { color: c.mutedForeground }]}>Clinical response</Text>
              <Toggle label="Afebrile for 24 hours" value={response.afebrile24h} onChange={(v) => setResponse({ ...response, afebrile24h: v })} testID="toggle-afebrile" />
              <Toggle label="Haemodynamically stable" value={response.hemodynamicallyStable} onChange={(v) => setResponse({ ...response, hemodynamicallyStable: v })} />
              <Toggle label="Tolerating oral intake" value={response.tolueratingOral} onChange={(v) => setResponse({ ...response, tolueratingOral: v })} />
              <Toggle label="Source control achieved" value={response.sourceControlDone} onChange={(v) => setResponse({ ...response, sourceControlDone: v })} />
              <Toggle label="Improving overall" value={response.improving} onChange={(v) => setResponse({ ...response, improving: v })} testID="toggle-improving" />
              <View style={{ height: 10 }} />
              <Field label="White cell trend">
                <Select
                  options={[
                    { value: "falling", label: "Falling" },
                    { value: "flat", label: "Flat" },
                    { value: "rising", label: "Rising" },
                  ]}
                  value={response.wbcTrend}
                  onChange={(v) => setResponse({ ...response, wbcTrend: v })}
                  testID="select-wbc"
                />
              </Field>
              <Field label="Review notes">
                <Input value={response.notes} onChangeText={(v) => setResponse({ ...response, notes: v })} placeholder="Optional" testID="input-review-notes" />
              </Field>
              <ErrorText error={review.error} />
              <Button label="Run the review" onPress={() => review.mutate()} loading={review.isPending} disabled={cultureStatus === "growth" && !organismId} testID="button-run-review" />
            </Card>
          )}

          <SectionTitle>Ask Ari</SectionTitle>
          <Button label="Ask Ari about this case" variant="outline" icon="message-circle" onPress={() => router.push({ pathname: "/ari", params: { prompt: ariPrompt } })} testID="button-ask-ari" />

          <SectionTitle>Notes and timeline</SectionTitle>
          <Card>
            <Input value={note} onChangeText={setNote} placeholder="Add a stewardship note" multiline testID="input-note" />
            <ErrorText error={addNote.error} />
            <Button label="Add note" variant="outline" small onPress={() => addNote.mutate()} loading={addNote.isPending} disabled={!note.trim()} testID="button-add-note" />
          </Card>
          {[...k.timeline].reverse().map((event, i) => (
            <View key={`${event.at}-${i}`} style={[styles.eventRow, { borderColor: c.border }]}>
              <Chip label={EVENT_ICON[event.kind] ?? event.kind} small tone={event.kind === "note" ? "muted" : "primary"} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.eventSummary, { color: c.foreground }]}>{event.summary}</Text>
                <Text style={[styles.eventMeta, { color: c.mutedForeground }]}>
                  {event.actor} · {formatDateTime(event.at)}
                </Text>
                {event.detail ? <Body muted>{event.detail}</Body> : null}
              </View>
            </View>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  regimenHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  regimenLabel: { fontSize: 15, fontFamily: fonts.semibold, flex: 1 },
  agentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  agentName: { fontSize: 14, fontFamily: fonts.medium },
  agentDose: { fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
  conflict: { fontSize: 12, fontFamily: fonts.medium, lineHeight: 17 },
  subhead: { fontSize: 12, fontFamily: fonts.semibold, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 4 },
  diffRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  diffName: { flex: 1, fontSize: 14, fontFamily: fonts.medium },
  diffMeta: { fontSize: 12, fontFamily: fonts.regular, width: 36, textAlign: "right" },
  headline: { fontSize: 16, fontFamily: fonts.semibold, lineHeight: 22 },
  sirRow: { gap: 6, marginBottom: 8 },
  sirName: { fontSize: 13, fontFamily: fonts.medium },
  eventRow: { flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: "flex-start" },
  eventSummary: { fontSize: 14, fontFamily: fonts.medium, lineHeight: 19 },
  eventMeta: { fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
});
