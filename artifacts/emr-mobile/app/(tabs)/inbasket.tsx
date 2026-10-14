import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Chip, Empty, ErrorText, Loading, Row, Screen, Select, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { emrApi, formatDateTime, priorityTone, titleCase, usePatients } from "@/lib/emr";
import { Pressable } from "react-native";

type Category = "all" | "staff" | "results" | "patient";
type Status = "open" | "done";

export default function InBasketScreen() {
  const c = useColors();
  const [category, setCategory] = useState<Category>("all");
  const [status, setStatus] = useState<Status>("open");
  const messages = useQuery({ queryKey: ["inbasket", "list"], queryFn: () => emrApi.inbasket() });
  const unread = useQuery({ queryKey: ["inbasket", "unread"], queryFn: emrApi.unreadCounts });
  const patients = usePatients();

  const visible = useMemo(
    () => (messages.data ?? []).filter((m) => m.status === status).filter((m) => category === "all" || m.category === category),
    [messages.data, category, status],
  );

  const label = (cat: Category, text: string) => {
    const n = cat === "all" ? unread.data?.total : unread.data?.byCategory[cat];
    return n ? `${text} (${n})` : text;
  };

  return (
    <Screen
      title="In-basket"
      subtitle={unread.data ? `${unread.data.total} unread` : undefined}
      onRefresh={() => {
        messages.refetch();
        unread.refetch();
      }}
      refreshing={messages.isRefetching}
      testID="screen-inbasket"
    >
      <Select
        options={[
          { value: "all", label: label("all", "All") },
          { value: "staff", label: label("staff", "Staff") },
          { value: "results", label: label("results", "Results") },
          { value: "patient", label: label("patient", "Patients") },
        ]}
        value={category}
        onChange={setCategory}
        testID="select-category"
      />
      <Select
        options={[
          { value: "open", label: "Open" },
          { value: "done", label: "Done" },
        ]}
        value={status}
        onChange={setStatus}
        testID="select-status"
      />
      <ErrorText error={messages.error} />
      {messages.isLoading ? (
        <Loading label="Loading messages" />
      ) : visible.length === 0 ? (
        <Empty text={status === "open" ? "Nothing waiting in this folder." : "No completed messages here."} icon="inbox" />
      ) : (
        visible.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => router.push(`/inbasket/${m.id}`)}
            style={({ pressed }) => [styles.row, { backgroundColor: c.card, borderColor: c.cardBorder, borderRadius: c.radius, opacity: pressed ? 0.85 : 1 }]}
            testID={`row-message-${m.id}`}
          >
            <View style={[styles.dot, { backgroundColor: m.read ? "transparent" : c.primary }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={[styles.from, { color: c.foreground, fontFamily: m.read ? fonts.medium : fonts.bold }]} numberOfLines={1}>
                  {m.fromName}
                </Text>
                <Text style={[styles.when, { color: c.mutedForeground }]}>{formatDateTime(m.createdAt)}</Text>
              </Row>
              <Text style={[styles.subject, { color: c.foreground, fontFamily: m.read ? fonts.regular : fonts.semibold }]} numberOfLines={1}>
                {m.subject}
              </Text>
              <Text style={[styles.preview, { color: c.mutedForeground }]} numberOfLines={2}>
                {m.body}
              </Text>
              <Row>
                <Chip label={titleCase(m.category)} small />
                {m.priority !== "routine" ? <Chip label={titleCase(m.priority)} tone={priorityTone(m.priority)} small /> : null}
                {m.patientId ? <Chip label={patients.byId.get(m.patientId)?.name ?? "Patient"} tone="primary" small /> : null}
              </Row>
            </View>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, padding: 14, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  from: { fontSize: 14, flex: 1 },
  when: { fontSize: 11, fontFamily: fonts.regular },
  subject: { fontSize: 14 },
  preview: { fontSize: 13, fontFamily: fonts.regular, lineHeight: 18 },
});
