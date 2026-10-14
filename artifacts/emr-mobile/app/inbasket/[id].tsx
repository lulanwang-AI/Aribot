import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import { StyleSheet, Text } from "react-native";

import { Body, Button, Card, Chip, ErrorText, KeyValue, Loading, Row, Screen, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { emrApi, formatDateTime, priorityTone, titleCase, usePatients, type InBasketMessage } from "@/lib/emr";

export default function MessageScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const messages = useQuery({ queryKey: ["inbasket", "list"], queryFn: () => emrApi.inbasket() });
  const patients = usePatients();
  const message = messages.data?.find((m) => m.id === id);
  const markedRef = useRef(false);

  function applyUpdate(updated: InBasketMessage) {
    queryClient.setQueryData<InBasketMessage[]>(["inbasket", "list"], (prev) => (prev ?? []).map((m) => (m.id === updated.id ? updated : m)));
    queryClient.invalidateQueries({ queryKey: ["inbasket", "unread"] });
  }

  const markRead = useMutation({ mutationFn: () => emrApi.markRead(id!, true), onSuccess: applyUpdate });
  const setStatus = useMutation({ mutationFn: (status: "open" | "done") => emrApi.setMessageStatus(id!, status), onSuccess: applyUpdate });

  useEffect(() => {
    if (message && !message.read && !markedRef.current) {
      markedRef.current = true;
      markRead.mutate();
    }
  }, [message, markRead]);

  const patient = message?.patientId ? patients.byId.get(message.patientId) : undefined;

  return (
    <Screen back title={message?.subject ?? "Message"} subtitle={message ? `From ${message.fromName}` : undefined} testID="screen-message">
      <ErrorText error={messages.error || setStatus.error} />
      {messages.isLoading ? <Loading /> : null}
      {messages.data && !message ? <Body muted>This message is no longer in the in-basket.</Body> : null}
      {message ? (
        <>
          <Row>
            <Chip label={titleCase(message.category)} />
            <Chip label={titleCase(message.priority)} tone={priorityTone(message.priority)} />
            <Chip label={message.status === "done" ? "Done" : "Open"} tone={message.status === "done" ? "good" : "primary"} />
          </Row>
          <Card>
            <KeyValue k="To" v={message.toName} />
            <KeyValue k="Received" v={formatDateTime(message.createdAt)} />
            {patient ? <KeyValue k="Patient" v={`${patient.name} · MRN ${patient.patientId}`} /> : null}
          </Card>
          <Card>
            <Text style={[styles.body, { color: c.foreground }]}>{message.body}</Text>
          </Card>
          {patient ? <Button label="Open the chart" variant="outline" icon="user" onPress={() => router.push(`/patient/${patient.id}`)} testID="button-open-chart" /> : null}
          {message.status === "open" ? (
            <Button label="Mark done" icon="check" onPress={() => setStatus.mutate("done")} loading={setStatus.isPending} testID="button-mark-done" />
          ) : (
            <Button label="Reopen" variant="outline" icon="rotate-ccw" onPress={() => setStatus.mutate("open")} loading={setStatus.isPending} testID="button-reopen" />
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, fontFamily: fonts.regular, lineHeight: 23 },
});
