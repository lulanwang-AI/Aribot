import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("demo@aribots.com");
  const [password, setPassword] = useState("demo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const styles = createStyles(colors, insets);

  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter your credentials");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/");
    } catch (e: any) {
      setError(e.message || "Login failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.heroSection}>
          <View style={[styles.logoContainer, { backgroundColor: colors.primary + "15" }]}>
            <Image
              source={require("@/assets/images/aribot-mark.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>ARIbots</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Clinical AI for Physicians</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Sign In</Text>
          <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>Doctor-only access</Text>

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="doctor@hospital.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.demoNote, { color: colors.mutedForeground }]}>
            Demo: Any email + any password
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            For licensed physicians & healthcare professionals only
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: any, insets: any) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: { flex: 1 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: isWeb ? 67 + insets.top : insets.top + 20,
      paddingBottom: isWeb ? 34 : insets.bottom + 20,
    },
    heroSection: { alignItems: "center", paddingVertical: 40 },
    logoContainer: {
      width: 80,
      height: 80,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    logo: { width: 52, height: 52 },
    brandName: {
      fontSize: 28,
      fontWeight: "700" as const,
      fontFamily: "Inter_700Bold",
      letterSpacing: -0.5,
    },
    tagline: { fontSize: 15, marginTop: 4, fontFamily: "Inter_400Regular" },
    card: {
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      gap: 16,
    },
    cardTitle: { fontSize: 22, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
    cardSubtitle: { fontSize: 14, marginTop: -10, fontFamily: "Inter_400Regular" },
    errorBanner: { padding: 12, borderRadius: 8, borderWidth: 1 },
    errorText: { fontSize: 14, fontFamily: "Inter_400Regular" },
    inputGroup: { gap: 6 },
    inputLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
    input: {
      height: 48,
      borderRadius: 10,
      paddingHorizontal: 14,
      fontSize: 15,
      borderWidth: 1,
      fontFamily: "Inter_400Regular",
    },
    loginButton: {
      height: 50,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    loginButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
    demoNote: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular" },
    footer: { alignItems: "center", paddingTop: 24 },
    footerText: { fontSize: 12, textAlign: "center", fontFamily: "Inter_400Regular" },
  });
}
