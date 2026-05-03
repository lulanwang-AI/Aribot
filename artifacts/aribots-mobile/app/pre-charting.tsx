import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { api } from "@/lib/api";
import { ModeGradient } from "@/components/Brand";

export default function PreChartingScreen() {
  const colors = useColors();
  const [chief, setChief] = useState("");
  const [hpi, setHpi] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!chief && !hpi) return;
    setBusy(true);
    setOut("");
    try {
      const res = await api<{ summary: string }>("/api/ari/prechart", {
        method: "POST",
        body: JSON.stringify({ chiefComplaint: chief, hpi }),
      }).catch(async () => {
        return { summary: "(Demo) Pre-chart suggestions:\n• Vitals & focused ROS\n• Targeted exam\n• Differential & initial workup" };
      });
      setOut(res.summary);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Pre-Charting" }} />
      <KeyboardAwareScrollViewCompat
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        bottomOffset={20}
      >
        <ModeGradient mode="ari" style={styles.hero}>
          <Text style={styles.heroTitle}>Pre-Chart Assistant</Text>
          <Text style={styles.heroSub}>
            Capture chief complaint and HPI. Ari suggests workup and differentials.
          </Text>
        </ModeGradient>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Chief complaint</Text>
        <TextInput
          value={chief}
          onChangeText={setChief}
          placeholder="e.g. chest pain, 2 hours"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
        />
        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>HPI</Text>
        <TextInput
          value={hpi}
          onChangeText={setHpi}
          multiline
          placeholder="History of present illness…"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, minHeight: 120, textAlignVertical: "top" },
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
              Generate pre-chart
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
  label: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  cta: { marginTop: 18, padding: 14, borderRadius: 12, alignItems: "center" },
  out: { marginTop: 18, padding: 14, borderRadius: 12, borderWidth: 1 },
});
