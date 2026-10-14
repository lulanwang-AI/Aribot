import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Body, Bullets, Card, Chip, ErrorText, KeyValue, Loading, Row, Screen, SectionTitle, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { SETTING_LABELS, SEVERITY_LABELS, amrApi, formatDuration } from "@/lib/amr";

export default function SyndromeScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const syndrome = useQuery({ queryKey: ["amr", "syndrome", id], queryFn: () => amrApi.syndrome(id!), enabled: Boolean(id), staleTime: Infinity });
  const reference = useQuery({ queryKey: ["amr", "reference"], queryFn: amrApi.reference, staleTime: Infinity });
  const s = syndrome.data;

  const organismName = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of reference.data?.organisms ?? []) map.set(o.id, o.name);
    return (orgId: string) => map.get(orgId) ?? orgId;
  }, [reference.data]);
  const agentName = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of reference.data?.agents ?? []) map.set(a.id, a.name);
    return (agentId: string) => map.get(agentId) ?? agentId;
  }, [reference.data]);

  const differential = useMemo(() => {
    if (!s) return [];
    const total = s.baseOrganisms.reduce((sum, o) => sum + o.weight, 0) || 1;
    return [...s.baseOrganisms].sort((a, b) => b.weight - a.weight).map((o) => ({ ...o, share: Math.round((o.weight / total) * 100) }));
  }, [s]);

  return (
    <Screen back title={s?.name ?? "Syndrome"} subtitle={s ? `${s.category} · ${s.guideline}` : undefined} testID="screen-syndrome">
      <ErrorText error={syndrome.error} />
      {syndrome.isLoading ? <Loading /> : null}
      {s ? (
        <>
          <Card>
            <Body>{s.description}</Body>
            <KeyValue k="Typical duration" v={formatDuration(s.durationDays)} />
            {s.durationDays.note ? <Body muted>{s.durationDays.note}</Body> : null}
          </Card>

          {s.requiredCoverage.length ? (
            <>
              <SectionTitle>Coverage the syndrome demands</SectionTitle>
              <Row>
                {s.requiredCoverage.map((flag) => (
                  <Chip key={flag} label={reference.data?.coverageFlagLabels[flag] ?? flag} tone="primary" />
                ))}
              </Row>
            </>
          ) : null}

          <SectionTitle>Baseline differential</SectionTitle>
          <Card>
            {differential.map((o) => (
              <View key={o.organismId} style={[styles.orgRow, { borderColor: c.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orgName, { color: c.foreground }]}>{organismName(o.organismId)}</Text>
                  <Text style={[styles.orgReason, { color: c.mutedForeground }]}>{o.reason}</Text>
                </View>
                <Chip label={`${o.share}%`} small />
              </View>
            ))}
          </Card>

          <SectionTitle>Regimen templates</SectionTitle>
          {s.regimens.map((r) => (
            <Card key={r.id}>
              <Text style={[styles.regimenLabel, { color: c.foreground }]}>{r.label}</Text>
              <Body>{r.agentIds.map(agentName).join(" + ")}</Body>
              <Row>
                {r.minSeverity ? <Chip label={`From ${SEVERITY_LABELS[r.minSeverity].toLowerCase()}`} small /> : null}
                {r.maxSeverity ? <Chip label={`Up to ${SEVERITY_LABELS[r.maxSeverity].toLowerCase()}`} small /> : null}
                {r.settings?.map((st) => <Chip key={st} label={SETTING_LABELS[st]} small tone="muted" />)}
                {r.requiresFlags?.map((f) => <Chip key={f} label={`Needs ${reference.data?.coverageFlagLabels[f] ?? f}`} small tone="warn" />)}
              </Row>
              {r.note ? <Body muted>{r.note}</Body> : null}
            </Card>
          ))}

          {s.sourceControl.length ? (
            <>
              <SectionTitle>Source control</SectionTitle>
              <Card>
                <Bullets items={s.sourceControl} />
              </Card>
            </>
          ) : null}
          {s.monitoring.length ? (
            <>
              <SectionTitle>Monitoring</SectionTitle>
              <Card>
                <Bullets items={s.monitoring} />
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  orgRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  orgName: { fontSize: 14, fontFamily: fonts.medium },
  orgReason: { fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
  regimenLabel: { fontSize: 15, fontFamily: fonts.semibold },
});
