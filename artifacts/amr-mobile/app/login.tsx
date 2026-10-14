import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BRAND_NAME, BrandMark } from "@/components/Brand";
import { Button, ErrorText, Field, Input, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { DEMO_EMAIL, DEMO_PASSWORD, useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function submit(kind: "form" | "demo") {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "demo") await signIn(DEMO_EMAIL, DEMO_PASSWORD);
      else await signIn(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Sign-in failed."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <LinearGradient colors={[c.gradientStart + "33", c.background, c.background]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <BrandMark size={84} />
            <Text style={[styles.brand, { color: c.foreground }]} testID="text-login-title">
              {BRAND_NAME}
            </Text>
            <Text style={[styles.tagline, { color: c.mutedForeground }]}>Antimicrobial decision support for licensed clinicians</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder, borderRadius: c.radius + 6 }]}>
            <Text style={[styles.cardTitle, { color: c.foreground }]}>Sign in</Text>
            <Text style={[styles.cardSub, { color: c.mutedForeground }]}>Use your stewardship account or enter the shared demo.</Text>
            <ErrorText error={error} />
            <View style={{ height: 12 }} />
            <Field label="Work email">
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="you@hospital.org"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="input-email"
              />
            </Field>
            <Field label="Password">
              <Input value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry testID="input-password" />
            </Field>
            <Button label="Sign in" onPress={() => submit("form")} loading={busy === "form"} disabled={busy !== null} testID="button-sign-in" />
            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: c.border }]} />
              <Text style={[styles.or, { color: c.mutedForeground }]}>or</Text>
              <View style={[styles.line, { backgroundColor: c.border }]} />
            </View>
            <Button label="Enter the demo" variant="outline" onPress={() => submit("demo")} loading={busy === "demo"} disabled={busy !== null} testID="button-demo" />
            <Text style={[styles.note, { color: c.mutedForeground }]}>
              Demo account: {DEMO_EMAIL} / {DEMO_PASSWORD}. Demo cases are synthetic; no patient data is involved.
            </Text>
          </View>

          <Text style={[styles.footer, { color: c.mutedForeground }]}>For licensed clinicians and stewardship teams only.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 20, alignItems: "center" },
  hero: { alignItems: "center", gap: 10, marginBottom: 28 },
  brand: { fontSize: 30, fontFamily: fonts.bold, letterSpacing: -0.8, marginTop: 6 },
  tagline: { fontSize: 14, fontFamily: fonts.regular, textAlign: "center" },
  card: { width: "100%", maxWidth: 440, borderWidth: 1, padding: 22 },
  cardTitle: { fontSize: 22, fontFamily: fonts.bold, letterSpacing: -0.3 },
  cardSub: { fontSize: 13, fontFamily: fonts.regular, marginTop: 4 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 14 },
  line: { flex: 1, height: 1 },
  or: { fontSize: 12, fontFamily: fonts.regular },
  note: { fontSize: 12, fontFamily: fonts.regular, textAlign: "center", marginTop: 14, lineHeight: 17 },
  footer: { fontSize: 12, fontFamily: fonts.regular, marginTop: 24, textAlign: "center" },
});
