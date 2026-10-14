import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, Chip, Empty, ErrorText, ListRow, Loading, SectionTitle, fonts, type Tone } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { STATUS_LABELS, STATUS_TONE, amrApi, formatPercent, formatReviewClock, type StewardshipCaseView } from "@/lib/amr";
import { useAuth } from "@/lib/auth";
import { Screen } from "@/components/ui";

function Metric({ label, value, tone = "default", hint }: { label: string; value: string; tone?: Tone; hint?: string }) {
  const c = useColors();
  return (
    <Card tone={tone} style={styles.metric}>
      <Text style={[styles.metricValue, { color: c.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: c.mutedForeground }]}>{label}</Text>
      {hint ? <Text style={[styles.metricHint, { color: c.mutedForeground }]}>{hint}</Text> : null}
    </Card>
  );
}

function needsReview(k: StewardshipCaseView): boolean {
  return k.reviewDue && !k.targeted && k.status !== "completed" && k.status !== "stopped";
}

export default function DashboardScreen() {
  const c = useColors();
  const { user } = useAuth();
  const metrics = useQuery({ queryKey: ["amr", "metrics"], queryFn: amrApi.metrics });
  const cases = useQuery({ queryKey: ["amr", "cases"], queryFn: amrApi.cases });

  const due = (cases.data ?? []).filter(needsReview).sort((a, b) => a.hoursToReview - b.hoursToReview);
  const m = metrics.data;

  return (
    <Screen
      title="Stewardship"
      subtitle={user?.name ? `Ward round · ${user.name}` : "Ward round"}
      onRefresh={() => {
        metrics.refetch();
        cases.refetch();
      }}
      refreshing={metrics.isRefetching || cases.isRefetching}
      right={
        <Pressable onPress={() => router.push("/intake")} style={[styles.newBtn, { backgroundColor: c.primary }]} accessibilityRole="button" testID="button-new-case">
          <Feather name="plus" size={18} color={c.primaryForeground} />
          <Text style={[styles.newBtnText, { color: c.primaryForeground }]}>New case</Text>
        </Pressable>
      }
      testID="screen-dashboard"
    >
      <ErrorText error={metrics.error || cases.error} />
      {metrics.isLoading ? (
        <Loading label="Loading the programme metrics" />
      ) : m ? (
        <>
          <View style={styles.grid}>
            <Metric label="Active cases" value={String(m.activeCases)} tone="primary" />
            <Metric label="Reviews due" value={String(m.reviewsDue)} tone={m.reviewsDue > 0 ? "warn" : "default"} hint={m.reviewsOverdue ? `${m.reviewsOverdue} overdue` : undefined} />
            <Metric label="De-escalation" value={formatPercent(m.deEscalationRate)} tone="good" hint={`${m.reviewsCompleted} reviews`} />
            <Metric label="Acceptance" value={formatPercent(m.acceptanceRate)} />
            <Metric label="IV to PO eligible" value={String(m.ivToPoEligible)} />
            <Metric label="Broad-spectrum share" value={formatPercent(m.broadSpectrumShare)} hint={`${m.broadSpectrumDays} of ${m.daysOfTherapy} DOT`} />
          </View>

          {m.coverageGapAlerts.length ? (
            <>
              <SectionTitle>Coverage alerts</SectionTitle>
              {m.coverageGapAlerts.map((alert) => (
                <Card key={alert.caseId + alert.message} tone={alert.severity === "high" ? "bad" : "warn"} onPress={() => router.push(`/case/${alert.caseId}`)} testID={`alert-${alert.caseId}`}>
                  <Text style={[styles.alertTitle, { color: c.foreground }]}>{alert.patientLabel}</Text>
                  <Text style={[styles.alertBody, { color: c.foreground }]}>{alert.message}</Text>
                </Card>
              ))}
            </>
          ) : null}
        </>
      ) : null}

      <SectionTitle action={<Button label="All cases" variant="ghost" small onPress={() => router.push("/cases")} />}>Reviews due</SectionTitle>
      {cases.isLoading ? (
        <Loading />
      ) : due.length === 0 ? (
        <Empty text="No 48 to 72 hour reviews are due. New results will surface here." icon="check-circle" />
      ) : (
        due.map((k) => (
          <ListRow
            key={k.id}
            title={`${k.patientLabel} · ${k.mrn}`}
            subtitle={`${k.syndromeName} · ${k.ward}`}
            meta={formatReviewClock(k.hoursToReview)}
            badge={STATUS_LABELS[k.status]}
            badgeTone={STATUS_TONE[k.status]}
            onPress={() => router.push(`/case/${k.id}`)}
            testID={`row-case-${k.id}`}
          />
        ))
      )}

      {m ? (
        <>
          <SectionTitle>Agents in use</SectionTitle>
          <Card>
            {m.agentUsage.slice(0, 8).map((a) => (
              <View key={a.agentId} style={styles.usageRow}>
                <Text style={[styles.usageName, { color: c.foreground }]}>{a.name}</Text>
                <Chip label={`${a.cases} case${a.cases === 1 ? "" : "s"}`} small />
              </View>
            ))}
            {m.agentUsage.length === 0 ? <Text style={{ color: c.mutedForeground }}>No therapy started yet.</Text> : null}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  newBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 },
  newBtnText: { fontFamily: fonts.semibold, fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { flexBasis: "47%", flexGrow: 1, gap: 2 },
  metricValue: { fontSize: 26, fontFamily: fonts.bold, letterSpacing: -0.5 },
  metricLabel: { fontSize: 12, fontFamily: fonts.medium },
  metricHint: { fontSize: 11, fontFamily: fonts.regular },
  alertTitle: { fontSize: 14, fontFamily: fonts.semibold },
  alertBody: { fontSize: 13, fontFamily: fonts.regular, lineHeight: 18 },
  usageRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  usageName: { fontSize: 14, fontFamily: fonts.medium },
});
