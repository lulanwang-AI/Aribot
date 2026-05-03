import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ModeGradient } from "@/components/Brand";
import { api } from "@/lib/api";

export default function VisitSummaryScreen() {
  const colors = useColors();
  const [notes, setNotes] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setOut("");
    try {
      const res = await api<{ summary: string }>("/api/ari/visit-summary", {
        method: "POST",
        body: JSON.stringify({ notes }),
      }).catch(() => ({
        summary:
          "(Demo) Visit summary:\n• Diagnosis discussed\n• Medications reviewed\n• Follow-up in 2 weeks",
      }));
      setOut(res.summary);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Visit Summary" }} />
      <KeyboardAwareScrollViewCompat
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        bottomOffset={20}
      >
        <ModeGradient mode="ari" style={styles.hero}>
          <Text style={styles.heroTitle}>Patient-Friendly Summary</Text>
          <Text style={styles.heroSub}>Turn clinical notes into a take-home summary.</Text>
        </ModeGradient>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Paste visit notes here…"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, minHeight: 180, textAlignVertical: "top" },
          ]}
        />
        <Pressable
          onPress={generate}
          disabled={busy}
          style={[styles.cta, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>
              Generate summary
            </Text>
          )}
        </Pressable>
        {out ? (
          <View style={[styles.out, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 22 }}>{out}</Text>
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 18, borderRadius: 16, marginBottom: 16 },
  heroTitle: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  heroSub: { color: "rgba(255,255,255,0.92)", fontSize: 13, marginTop: 4, fontFamily: "Inter_400Regular" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  cta: { marginTop: 18, padding: 14, borderRadius: 12, alignItems: "center" },
  out: { marginTop: 18, padding: 14, borderRadius: 12, borderWidth: 1 },
});
