import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Bullets, Card, Chip, ErrorText, KeyValue, Loading, Row, Screen, SectionTitle, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { TIER_LABELS, TIER_TONE, amrApi } from "@/lib/amr";

const PREGNANCY: Record<string, string> = {
  acceptable: "Acceptable",
  avoid_if_alternative: "Avoid if an alternative exists",
  contraindicated: "Contraindicated",
};

export default function AgentScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const agent = useQuery({ queryKey: ["amr", "agent", id], queryFn: () => amrApi.agent(id!), enabled: Boolean(id), staleTime: Infinity });
  const a = agent.data;

  return (
    <Screen back title={a?.name ?? "Agent"} subtitle={a ? `${a.drugClass} · ${a.routes.join(", ")}` : undefined} testID="screen-agent">
      <ErrorText error={agent.error} />
      {agent.isLoading ? <Loading /> : null}
      {a ? (
        <>
          <Row>
            <Chip label={`${TIER_LABELS[a.tier]} spectrum`} tone={TIER_TONE[a.tier]} />
            {a.restricted ? <Chip label="Stewardship pre-authorisation" tone="warn" /> : null}
            {a.cnsPenetration ? <Chip label="CNS penetration" tone="primary" /> : null}
            {a.highOralBioavailability ? <Chip label="IV to PO candidate" tone="good" /> : null}
          </Row>

          <SectionTitle>Dosing</SectionTitle>
          <Card>
            <KeyValue k="Standard adult dose" v={a.adultDose} />
            {a.severeDose ? <KeyValue k="Severe infection" v={a.severeDose} /> : null}
            {a.oralDose ? <KeyValue k="Oral step-down" v={a.oralDose} /> : null}
            <KeyValue k="Collateral damage score" v={`${a.collateralDamageScore} of 5`} />
            <KeyValue k="Pregnancy" v={PREGNANCY[a.pregnancyUse] ?? a.pregnancyUse} tone={a.pregnancyUse === "contraindicated" ? "bad" : a.pregnancyUse === "avoid_if_alternative" ? "warn" : "good"} />
            <KeyValue k="Allergy class" v={a.allergyClass} />
            {a.sideChainGroup ? <KeyValue k="R1 side chain" v={a.sideChainGroup} /> : null}
          </Card>

          {a.renalAdjustments.length ? (
            <>
              <SectionTitle>Renal adjustment</SectionTitle>
              <Card>
                {a.renalAdjustments.map((r, i) => (
                  <View key={i} style={[styles.renalRow, { borderColor: c.border }]}>
                    <Text style={[styles.renalBand, { color: c.mutedForeground }]}>
                      CrCl {r.minCrCl}{Number.isFinite(r.maxCrCl) ? ` to ${r.maxCrCl}` : " or more"} mL/min
                    </Text>
                    <Text style={[styles.renalDose, { color: c.foreground }]}>{r.dose}</Text>
                    {r.note ? <Text style={[styles.renalNote, { color: c.mutedForeground }]}>{r.note}</Text> : null}
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {a.monitoring.length ? (
            <>
              <SectionTitle>Monitoring</SectionTitle>
              <Card>
                <Bullets items={a.monitoring} />
              </Card>
            </>
          ) : null}

          {a.cautions.length ? (
            <>
              <SectionTitle>Cautions</SectionTitle>
              <Card tone="warn">
                <Bullets items={a.cautions} tone="warn" />
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  renalRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  renalBand: { fontSize: 12, fontFamily: fonts.semibold },
  renalDose: { fontSize: 14, fontFamily: fonts.medium },
  renalNote: { fontSize: 12, fontFamily: fonts.regular },
});
