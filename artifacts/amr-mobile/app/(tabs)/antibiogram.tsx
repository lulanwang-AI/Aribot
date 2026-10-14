import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Chip, ErrorText, KeyValue, Loading, Screen, SectionTitle, Select, fonts, useToneColors } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { amrApi, formatPercent, susceptibilityTone } from "@/lib/amr";

type GramFilter = "all" | "positive" | "negative" | "anaerobe" | "atypical";

function Cell({ percent }: { percent: number | undefined }) {
  const c = useColors();
  const tone = percent === undefined ? "muted" : susceptibilityTone(percent);
  const t = useToneColors(tone);
  return (
    <View style={[styles.cell, { backgroundColor: percent === undefined ? "transparent" : t.bg, borderColor: c.border }]}>
      <Text style={[styles.cellText, { color: percent === undefined ? c.mutedForeground : t.fg }]}>{percent === undefined ? "·" : formatPercent(percent)}</Text>
    </View>
  );
}

export default function AntibiogramScreen() {
  const c = useColors();
  const reference = useQuery({ queryKey: ["amr", "reference"], queryFn: amrApi.reference, staleTime: Infinity });
  const [regionId, setRegionId] = useState<string | undefined>(undefined);
  const [gram, setGram] = useState<GramFilter>("all");
  const effectiveRegion = regionId ?? reference.data?.regions[0]?.id;
  const antibiogram = useQuery({
    queryKey: ["amr", "antibiogram", effectiveRegion],
    queryFn: () => amrApi.antibiogram(effectiveRegion!),
    enabled: Boolean(effectiveRegion),
    staleTime: Infinity,
  });

  const data = antibiogram.data;
  const rows = useMemo(() => {
    if (!data) return [];
    return data.organisms
      .filter((o) => gram === "all" || o.gram === gram)
      .filter((o) => data.susceptibility[o.id] && Object.keys(data.susceptibility[o.id]).length > 0);
  }, [data, gram]);
  const columns = useMemo(() => {
    if (!data) return [];
    const used = new Set<string>();
    for (const row of rows) for (const agentId of Object.keys(data.susceptibility[row.id] ?? {})) used.add(agentId);
    return data.agents.filter((a) => used.has(a.id));
  }, [data, rows]);

  return (
    <Screen title="Antibiogram" subtitle="Percent of isolates susceptible, by region" testID="screen-antibiogram">
      <ErrorText error={reference.error || antibiogram.error} />
      {reference.isLoading ? (
        <Loading label="Loading regions" />
      ) : reference.data ? (
        <Select
          options={reference.data.regions.map((r) => ({ value: r.id, label: r.facilityData ? `${r.name} ★` : r.name }))}
          value={effectiveRegion}
          onChange={setRegionId}
          testID="select-region"
        />
      ) : null}

      {data ? (
        <Card>
          <View style={styles.regionHead}>
            <Text style={[styles.regionName, { color: c.foreground }]}>{data.region.name}</Text>
            <Chip label={data.facilityData ? "Facility data" : "Regional estimate"} tone={data.facilityData ? "good" : "muted"} small />
          </View>
          <Text style={[styles.source, { color: c.mutedForeground }]}>
            {data.source} · updated {data.updated}
          </Text>
          <View style={styles.rates}>
            <KeyValue k="MRSA" v={formatPercent(data.region.mrsaRate)} tone={susceptibilityTone(100 - data.region.mrsaRate)} />
            <KeyValue k="ESBL" v={formatPercent(data.region.esblRate)} tone={susceptibilityTone(100 - data.region.esblRate)} />
            <KeyValue k="CRE" v={formatPercent(data.region.creRate)} tone={susceptibilityTone(100 - data.region.creRate)} />
            <KeyValue k="MDR Pseudomonas" v={formatPercent(data.region.mdrPseudomonasRate)} tone={susceptibilityTone(100 - data.region.mdrPseudomonasRate)} />
            <KeyValue k="VRE" v={formatPercent(data.region.vreRate)} tone={susceptibilityTone(100 - data.region.vreRate)} />
          </View>
        </Card>
      ) : antibiogram.isLoading ? (
        <Loading label="Loading the antibiogram" />
      ) : null}

      {data ? (
        <>
          <SectionTitle>Organisms</SectionTitle>
          <Select
            options={[
              { value: "all", label: "All" },
              { value: "positive", label: "Gram positive" },
              { value: "negative", label: "Gram negative" },
              { value: "anaerobe", label: "Anaerobes" },
              { value: "atypical", label: "Atypicals" },
            ]}
            value={gram}
            onChange={setGram}
            testID="select-gram"
          />
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={styles.tableRow}>
                  <View style={[styles.organismCell, styles.headCell, { borderColor: c.border, backgroundColor: c.muted }]}>
                    <Text style={[styles.headText, { color: c.mutedForeground }]}>Organism</Text>
                  </View>
                  {columns.map((a) => (
                    <View key={a.id} style={[styles.cell, styles.headCell, { borderColor: c.border, backgroundColor: c.muted }]}>
                      <Text style={[styles.headText, { color: c.mutedForeground }]} numberOfLines={2}>
                        {a.shortName}
                      </Text>
                    </View>
                  ))}
                </View>
                {rows.map((o) => (
                  <View key={o.id} style={styles.tableRow}>
                    <View style={[styles.organismCell, { borderColor: c.border, backgroundColor: c.card }]}>
                      <Text style={[styles.organismText, { color: c.foreground }]} numberOfLines={2}>
                        {o.shortName}
                      </Text>
                    </View>
                    {columns.map((a) => (
                      <Cell key={a.id} percent={data.susceptibility[o.id]?.[a.id]} />
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card>
          <Text style={[styles.legend, { color: c.mutedForeground }]}>Green 85% or more susceptible · amber 70 to 84% · red below 70% · dot: not tested.</Text>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  regionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  regionName: { fontSize: 17, fontFamily: fonts.semibold, flex: 1 },
  source: { fontSize: 12, fontFamily: fonts.regular },
  rates: { marginTop: 6 },
  tableRow: { flexDirection: "row" },
  organismCell: { width: 128, padding: 8, borderRightWidth: 1, borderBottomWidth: 1, justifyContent: "center" },
  organismText: { fontSize: 12, fontFamily: fonts.medium },
  cell: { width: 64, paddingVertical: 10, paddingHorizontal: 4, borderRightWidth: 1, borderBottomWidth: 1, alignItems: "center", justifyContent: "center" },
  cellText: { fontSize: 12, fontFamily: fonts.semibold },
  headCell: { minHeight: 48 },
  headText: { fontSize: 10, fontFamily: fonts.semibold, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.3 },
  legend: { fontSize: 12, fontFamily: fonts.regular, lineHeight: 17 },
});
