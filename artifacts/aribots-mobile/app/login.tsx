import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { ModeGradient } from "@/components/Brand";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("doctor@aribots.dev");
  const [password, setPassword] = useState("aribots");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!email || !password) {
      Alert.alert("Missing info", "Please enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Sign in failed", e?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}
    >
      <View style={styles.heroWrap}>
        <ModeGradient mode="ari" style={styles.hero}>
          <Image
            source={require("@/assets/images/aribot-mark-1024.png")}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>ARIbots</Text>
          <Text style={styles.heroSub}>Doctor-only clinical AI community</Text>
        </ModeGradient>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="you@hospital.org"
          placeholderTextColor={colors.mutedForeground}
        />
        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>Password</Text>
        <TextInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="••••••••"
          placeholderTextColor={colors.mutedForeground}
        />

        <Pressable
          onPress={onSubmit}
          disabled={busy}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: colors.primary, opacity: busy ? 0.7 : pressed ? 0.85 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Sign in</Text>
          )}
        </Pressable>

        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
          For verified clinicians only. By signing in you agree to ARIbots' clinical use terms.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroWrap: { paddingHorizontal: 16, paddingTop: 12 },
  hero: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    borderRadius: 20,
  },
  heroLogo: { width: 64, height: 64, marginBottom: 12 },
  heroTitle: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: 14, marginTop: 4, fontFamily: "Inter_500Medium" },
  form: { paddingHorizontal: 20, paddingTop: 24, gap: 4 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  cta: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  footnote: { fontSize: 12, marginTop: 16, textAlign: "center", fontFamily: "Inter_400Regular" },
});
