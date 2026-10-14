import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { View } from "react-native";

import { Chip, Empty, ErrorText, Input, ListRow, Loading, Screen, SectionTitle } from "@/components/ui";
import { TIER_LABELS, TIER_TONE, amrApi, type SpectrumTier } from "@/lib/amr";

const TIER_ORDER: SpectrumTier[] = ["narrow", "moderate", "broad", "extended", "reserve"];

export default function FormularyScreen() {
  const reference = useQuery({ queryKey: ["amr", "reference"], queryFn: amrApi.reference, staleTime: Infinity });
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const agents = (reference.data?.agents ?? []).filter(
      (a) => !needle || a.name.toLowerCase().includes(needle) || a.drugClass.toLowerCase().includes(needle) || a.shortName.toLowerCase().includes(needle),
    );
    return TIER_ORDER.map((tier) => ({ tier, agents: agents.filter((a) => a.tier === tier).sort((a, b) => a.name.localeCompare(b.name)) })).filter(
      (g) => g.agents.length > 0,
    );
  }, [reference.data, search]);

  return (
    <Screen title="Formulary" subtitle={reference.data ? `${reference.data.agents.length} agents · knowledge base ${reference.data.knowledgeBaseVersion}` : undefined} testID="screen-formulary">
      <Input value={search} onChangeText={setSearch} placeholder="Search agent or class" autoCorrect={false} testID="input-formulary-search" />
      <ErrorText error={reference.error} />
      {reference.isLoading ? (
        <Loading label="Loading the formulary" />
      ) : groups.length === 0 ? (
        <Empty text="No agent matches that search." icon="search" />
      ) : (
        groups.map((g) => (
          <View key={g.tier} style={{ gap: 8 }}>
            <SectionTitle>{TIER_LABELS[g.tier]} spectrum</SectionTitle>
            {g.agents.map((a) => (
              <ListRow
                key={a.id}
                title={a.name}
                subtitle={`${a.drugClass} · ${a.routes.join(", ")}`}
                right={a.restricted ? <Chip label="Restricted" tone="warn" small /> : undefined}
                badge={TIER_LABELS[a.tier]}
                badgeTone={TIER_TONE[a.tier]}
                onPress={() => router.push(`/agent/${a.id}`)}
                testID={`row-agent-${a.id}`}
              />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}
