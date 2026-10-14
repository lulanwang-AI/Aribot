import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Body, Button, Card, Chip, ErrorText, Field, Input, KeyValue, Loading, Row, Screen, SectionTitle, Select, Toggle, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_ORDER, SETTING_LABELS, SEVERITY_LABELS, amrApi, formatPercent, type CareSetting, type DrugAllergy, type Intake, type Severity } from "@/lib/amr";
import { useAuth } from "@/lib/auth";

const ALLERGY_SEVERITIES: { value: DrugAllergy["severity"]; label: string }[] = [
  { value: "intolerance", label: "Intolerance" },
  { value: "mild_rash", label: "Mild rash" },
  { value: "urticaria", label: "Urticaria" },
  { value: "anaphylaxis", label: "Anaphylaxis" },
  { value: "sjs_ten", label: "SJS / TEN" },
  { value: "dress", label: "DRESS" },
];

function num(value: string): number | undefined {
  const n = Number(value.replace(",", "."));
  return value.trim() === "" || Number.isNaN(n) ? undefined : n;
}

export default function IntakeScreen() {
  const c = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reference = useQuery({ queryKey: ["amr", "reference"], queryFn: amrApi.reference, staleTime: Infinity });

  const [patientLabel, setPatientLabel] = useState("");
  const [mrn, setMrn] = useState("");
  const [ward, setWard] = useState("");
  const [assignedTo, setAssignedTo] = useState(user?.name ?? "");
  const [intake, setIntake] = useState<Intake | null>(null);
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [crcl, setCrcl] = useState("");
  const [antibiotics, setAntibiotics] = useState("");
  const [allergyAgent, setAllergyAgent] = useState("");
  const [allergyReaction, setAllergyReaction] = useState("");
  const [allergySeverity, setAllergySeverity] = useState<DrugAllergy["severity"]>("mild_rash");

  useEffect(() => {
    if (reference.data && !intake) {
      setIntake(JSON.parse(JSON.stringify(reference.data.emptyIntake)) as Intake);
    }
  }, [reference.data, intake]);

  const categories = useMemo(() => {
    const syndromes = reference.data?.syndromes ?? [];
    const names = Array.from(new Set(syndromes.map((s) => s.category)));
    names.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
    });
    return names.map((name) => ({ name, syndromes: syndromes.filter((s) => s.category === name) }));
  }, [reference.data]);

  function patch(partial: Partial<Intake>) {
    setIntake((prev) => (prev ? { ...prev, ...partial } : prev));
  }
  function patchClinical(partial: Partial<Intake["clinical"]>) {
    setIntake((prev) => (prev ? { ...prev, clinical: { ...prev.clinical, ...partial } } : prev));
  }

  function buildIntake(): Intake | null {
    if (!intake) return null;
    return {
      ...intake,
      antibioticsLast90Days: antibiotics
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
      clinical: {
        ...intake.clinical,
        ageYears: num(age) ?? 0,
        weightKg: num(weight) ?? 0,
        creatinineClearance: num(crcl),
      },
    };
  }

  const problems: string[] = [];
  if (!patientLabel.trim()) problems.push("Give the case a label (bed, initials or study id).");
  if (!(num(age) && num(age)! > 0)) problems.push("Age is required for dosing.");
  if (!(num(weight) && num(weight)! > 0)) problems.push("Weight is required for dosing.");

  const preview = useMutation({ mutationFn: () => amrApi.previewEmpiric(buildIntake()!) });
  const create = useMutation({
    mutationFn: () => amrApi.createCase({ mrn: mrn.trim(), patientLabel: patientLabel.trim(), ward: ward.trim(), assignedTo: assignedTo.trim(), intake: buildIntake()! }),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["amr", "cases"] });
      queryClient.invalidateQueries({ queryKey: ["amr", "metrics"] });
      router.replace(`/case/${record.id}`);
    },
  });

  const selectedSyndrome = reference.data?.syndromes.find((s) => s.id === intake?.suspectedSyndromeId);

  return (
    <Screen back title="New case" subtitle="Screening intake and empiric recommendation" testID="screen-intake">
      <ErrorText error={reference.error} />
      {!intake ? (
        <Loading label="Loading the intake form" />
      ) : (
        <>
          <SectionTitle>Patient</SectionTitle>
          <Card>
            <Field label="Case label" hint="Bed, initials or study id. Avoid the full name.">
              <Input value={patientLabel} onChangeText={setPatientLabel} placeholder="Bed 12, JM" testID="input-label" />
            </Field>
            <Row>
              <View style={{ flex: 1 }}>
                <Field label="MRN">
                  <Input value={mrn} onChangeText={setMrn} placeholder="MRN" autoCapitalize="characters" testID="input-mrn" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Ward">
                  <Input value={ward} onChangeText={setWard} placeholder="Ward 4" testID="input-ward" />
                </Field>
              </View>
            </Row>
            <Field label="Assigned to">
              <Input value={assignedTo} onChangeText={setAssignedTo} placeholder="Reviewing clinician" testID="input-assigned" />
            </Field>
          </Card>

          <SectionTitle>Suspected syndrome</SectionTitle>
          <Card>
            {selectedSyndrome ? (
              <>
                <Text style={[styles.selected, { color: c.foreground }]}>{selectedSyndrome.name}</Text>
                <Body muted>{selectedSyndrome.description}</Body>
              </>
            ) : null}
            {categories.map((cat) => (
              <View key={cat.name} style={{ gap: 6 }}>
                <Text style={[styles.category, { color: c.mutedForeground }]}>{cat.name}</Text>
                <Select options={cat.syndromes.map((s) => ({ value: s.id, label: s.name }))} value={intake.suspectedSyndromeId} onChange={(v) => patch({ suspectedSyndromeId: v })} testID={`select-syndrome-${cat.name.toLowerCase().replace(/\s+/g, "-")}`} />
              </View>
            ))}
            <Field label="Source notes">
              <Input value={intake.sourceNotes} onChangeText={(v) => patch({ sourceNotes: v })} placeholder="Imaging, exam findings, suspected focus" multiline testID="input-source-notes" />
            </Field>
          </Card>

          <SectionTitle>Setting and severity</SectionTitle>
          <Card>
            <Field label="Care setting">
              <Select
                options={(Object.keys(SETTING_LABELS) as CareSetting[]).map((v) => ({ value: v, label: SETTING_LABELS[v] }))}
                value={intake.setting}
                onChange={(v) => patch({ setting: v })}
                testID="select-setting"
              />
            </Field>
            <Field label="Severity">
              <Select
                options={(Object.keys(SEVERITY_LABELS) as Severity[]).map((v) => ({ value: v, label: SEVERITY_LABELS[v] }))}
                value={intake.clinical.severity}
                onChange={(v) => patchClinical({ severity: v })}
                testID="select-severity"
              />
            </Field>
            <Field label="Region (selects the antibiogram)">
              <Select options={(reference.data?.regions ?? []).map((r) => ({ value: r.id, label: r.name }))} value={intake.residenceRegionId} onChange={(v) => patch({ residenceRegionId: v })} testID="select-region" />
            </Field>
            <Field label="Symptom onset" hint="YYYY-MM-DD">
              <Input value={intake.symptoms.onsetDate} onChangeText={(v) => patch({ symptoms: { ...intake.symptoms, onsetDate: v } })} placeholder="2026-01-31" autoCapitalize="none" testID="input-onset" />
            </Field>
          </Card>

          <SectionTitle>Dosing parameters</SectionTitle>
          <Card>
            <Row>
              <View style={{ flex: 1 }}>
                <Field label="Age (years)">
                  <Input value={age} onChangeText={setAge} keyboardType="numeric" placeholder="67" testID="input-age" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Weight (kg)">
                  <Input value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="78" testID="input-weight" />
                </Field>
              </View>
            </Row>
            <Field label="Sex">
              <Select
                options={[
                  { value: "female", label: "Female" },
                  { value: "male", label: "Male" },
                  { value: "other", label: "Other" },
                ]}
                value={intake.clinical.sex}
                onChange={(v) => patchClinical({ sex: v })}
                testID="select-sex"
              />
            </Field>
            <Field label="Creatinine clearance (mL/min)" hint="Leave empty if unknown; doses then assume normal renal function.">
              <Input value={crcl} onChangeText={setCrcl} keyboardType="numeric" placeholder="85" testID="input-crcl" />
            </Field>
            <Toggle label="On dialysis" value={intake.clinical.onDialysis} onChange={(v) => patchClinical({ onDialysis: v })} />
            <Toggle label="Immunosuppressed" value={intake.clinical.immunosuppressed} onChange={(v) => patchClinical({ immunosuppressed: v })} />
            <Toggle label="Neutropenic" value={intake.clinical.neutropenic} onChange={(v) => patchClinical({ neutropenic: v })} />
            <Toggle label="Pregnant" value={intake.clinical.pregnant} onChange={(v) => patchClinical({ pregnant: v })} />
          </Card>

          <SectionTitle>Risk factors</SectionTitle>
          <Card>
            <Field label="Comorbidities">
              <Row>
                {(reference.data?.comorbidities ?? []).map((cm) => {
                  const active = intake.comorbidities.includes(cm.value);
                  return (
                    <Button
                      key={cm.value}
                      label={cm.label}
                      small
                      variant={active ? "primary" : "outline"}
                      onPress={() => patch({ comorbidities: active ? intake.comorbidities.filter((v) => v !== cm.value) : [...intake.comorbidities, cm.value] })}
                      testID={`toggle-comorbidity-${cm.value}`}
                    />
                  );
                })}
              </Row>
            </Field>
            <Field label="Antibiotics in the last 90 days" hint="Comma separated">
              <Input value={antibiotics} onChangeText={setAntibiotics} placeholder="Amoxicillin-clavulanate, ciprofloxacin" testID="input-antibiotics" />
            </Field>
            <Toggle label="Urinary catheter in situ" value={intake.foleyCatheter.present} onChange={(v) => patch({ foleyCatheter: { present: v, days: v ? 3 : undefined } })} testID="toggle-foley" />
            <Toggle label="Tracheostomy" value={intake.tracheostomy.present} onChange={(v) => patch({ tracheostomy: { present: v } })} />
            <Toggle label="Mechanically ventilated" value={intake.ventilator.present} onChange={(v) => patch({ ventilator: { present: v, days: v ? 3 : undefined } })} testID="toggle-ventilator" />
          </Card>

          <SectionTitle>Drug allergies</SectionTitle>
          <Card>
            {intake.allergies.length === 0 ? <Body muted>No drug allergies recorded.</Body> : null}
            {intake.allergies.map((a, i) => (
              <View key={`${a.agentOrClass}-${i}`} style={styles.allergyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.allergyName, { color: c.foreground }]}>{a.agentOrClass}</Text>
                  <Text style={[styles.allergyMeta, { color: c.mutedForeground }]}>
                    {ALLERGY_SEVERITIES.find((s) => s.value === a.severity)?.label}
                    {a.reaction ? ` · ${a.reaction}` : ""}
                  </Text>
                </View>
                <Button label="Remove" variant="ghost" small onPress={() => patch({ allergies: intake.allergies.filter((_, j) => j !== i) })} />
              </View>
            ))}
            <Field label="Agent or class">
              <Input value={allergyAgent} onChangeText={setAllergyAgent} placeholder="Penicillin" testID="input-allergy-agent" />
            </Field>
            <Field label="Reaction">
              <Input value={allergyReaction} onChangeText={setAllergyReaction} placeholder="Rash after two days" testID="input-allergy-reaction" />
            </Field>
            <Field label="Severity">
              <Select options={ALLERGY_SEVERITIES} value={allergySeverity} onChange={setAllergySeverity} testID="select-allergy-severity" />
            </Field>
            <Button
              label="Add allergy"
              variant="outline"
              small
              icon="plus"
              disabled={!allergyAgent.trim()}
              onPress={() => {
                patch({ allergies: [...intake.allergies, { agentOrClass: allergyAgent.trim(), reaction: allergyReaction.trim(), severity: allergySeverity }] });
                setAllergyAgent("");
                setAllergyReaction("");
              }}
              testID="button-add-allergy"
            />
          </Card>

          <SectionTitle>Recommendation</SectionTitle>
          {problems.length ? (
            <Card tone="warn">
              {problems.map((p) => (
                <Body key={p}>{p}</Body>
              ))}
            </Card>
          ) : null}
          <ErrorText error={preview.error || create.error} />
          {preview.data ? (
            <Card tone="primary" testID="card-preview">
              <Text style={[styles.selected, { color: c.foreground }]}>
                {preview.data.regimens[0]?.label ?? "No regimen"} · {formatPercent(preview.data.regimens[0]?.expectedCoverage ?? 0)} expected coverage
              </Text>
              {preview.data.regimens[0]?.agents.map((a) => (
                <KeyValue key={a.agentId} k={a.name} v={`${a.route} ${a.dose}`} />
              ))}
              <Row>
                {preview.data.riskFactors.map((r) => (
                  <Chip key={r.id} label={r.label} tone="warn" small />
                ))}
              </Row>
              <Body muted>
                {preview.data.regimens.length} ranked regimen{preview.data.regimens.length === 1 ? "" : "s"} · antibiogram {preview.data.region.name}. Create the case to start therapy and schedule the review.
              </Body>
            </Card>
          ) : null}
          <Row>
            <View style={{ flex: 1 }}>
              <Button label="Preview" variant="outline" onPress={() => preview.mutate()} loading={preview.isPending} disabled={problems.length > 0 || create.isPending} testID="button-preview" />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Create case" onPress={() => create.mutate()} loading={create.isPending} disabled={problems.length > 0 || preview.isPending} testID="button-create-case" />
            </View>
          </Row>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  selected: { fontSize: 16, fontFamily: fonts.semibold },
  category: { fontSize: 12, fontFamily: fonts.semibold, marginTop: 6 },
  allergyRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  allergyName: { fontSize: 14, fontFamily: fonts.medium },
  allergyMeta: { fontSize: 12, fontFamily: fonts.regular },
});
