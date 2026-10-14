import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";

import { Button, Empty, ErrorText, Input, ListRow, Loading, Screen, Select } from "@/components/ui";
import { SETTING_LABELS, STATUS_LABELS, STATUS_TONE, amrApi, formatReviewClock, type StewardshipCaseView } from "@/lib/amr";

type Filter = "all" | "due" | "active" | "targeted" | "closed";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "due", label: "Review due" },
  { value: "active", label: "On empiric" },
  { value: "targeted", label: "Targeted" },
  { value: "closed", label: "Closed" },
];

function matches(k: StewardshipCaseView, filter: Filter): boolean {
  switch (filter) {
    case "due":
      return k.reviewDue && !k.targeted && k.status !== "completed" && k.status !== "stopped";
    case "active":
      return k.status === "empiric" || k.status === "awaiting_review" || k.status === "review_due";
    case "targeted":
      return k.status === "targeted";
    case "closed":
      return k.status === "completed" || k.status === "stopped";
    default:
      return true;
  }
}

function reviewMeta(k: StewardshipCaseView): string | undefined {
  if (k.status === "completed" || k.status === "stopped") return undefined;
  if (k.targeted) return `Review done · ${k.targeted.actionLabel}`;
  if (k.therapyStartedAt) return `Review ${formatReviewClock(k.hoursToReview)}`;
  return "Therapy not started";
}

export default function CasesScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const cases = useQuery({ queryKey: ["amr", "cases"], queryFn: amrApi.cases });

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (cases.data ?? [])
      .filter((k) => matches(k, filter))
      .filter((k) => !needle || [k.patientLabel, k.mrn, k.ward, k.syndromeName, k.assignedTo].some((v) => v.toLowerCase().includes(needle)))
      .sort((a, b) => {
        const aDue = a.reviewDue && !a.targeted ? 0 : 1;
        const bDue = b.reviewDue && !b.targeted ? 0 : 1;
        if (aDue !== bDue) return aDue - bDue;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [cases.data, filter, search]);

  return (
    <Screen
      title="Cases"
      subtitle={cases.data ? `${cases.data.length} on the worklist` : undefined}
      onRefresh={() => cases.refetch()}
      refreshing={cases.isRefetching}
      right={<Button label="New case" icon="plus" small onPress={() => router.push("/intake")} testID="button-new-case" />}
      testID="screen-cases"
    >
      <Input value={search} onChangeText={setSearch} placeholder="Search label, MRN, ward or syndrome" autoCorrect={false} testID="input-case-search" />
      <Select options={FILTERS} value={filter} onChange={setFilter} testID="select-case-filter" />
      <ErrorText error={cases.error} />
      {cases.isLoading ? (
        <Loading label="Loading cases" />
      ) : visible.length === 0 ? (
        <Empty text="No cases match this view." />
      ) : (
        visible.map((k) => (
          <ListRow
            key={k.id}
            title={`${k.patientLabel} · ${k.mrn}`}
            subtitle={`${k.syndromeName} · ${k.ward} · ${SETTING_LABELS[k.setting]}`}
            meta={reviewMeta(k)}
            badge={STATUS_LABELS[k.status]}
            badgeTone={STATUS_TONE[k.status]}
            onPress={() => router.push(`/case/${k.id}`)}
            testID={`row-case-${k.id}`}
          />
        ))
      )}
    </Screen>
  );
}
