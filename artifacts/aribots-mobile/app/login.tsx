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
  useColorScheme,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("doctor@aribots.local");
  const [password, setPassword] = useState("demo");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) { setError("Please enter your credentials"); return; }
    setLoading(true); setError("");
    try {
      await signIn(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } catch (e: any) {
      setError(e.message || "Login failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  }

  async function handleDemo() {
    setDemoLoading(true); setError("");
    try {
      await signIn("doctor@aribots.local", "demo");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } catch (e: any) {
      setError(e.message || "Demo failed.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setDemoLoading(false); }
  }

  const isIOS = Platform.OS === "ios";

  return (
    <View style={styles.root}>
      {/* Full-screen gradient background */}
      <LinearGradient
        colors={isDark
          ? ["#0b2e4d", "#081a2c", "#03101d"]
          : ["#d8e8ff", "#f4f9ff", "#edfaff"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Radial glow top-left */}
      <View style={[styles.radialBlob, styles.radialTL, {
        backgroundColor: isDark ? "rgba(18,58,90,0.55)" : "rgba(216,232,255,0.7)"
      }]} />
      {/* Radial glow top-right */}
      <View style={[styles.radialBlob, styles.radialTR, {
        backgroundColor: isDark ? "rgba(11,73,72,0.35)" : "rgba(205,247,238,0.5)"
      }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, {
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 32,
          }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            {/* Floating glass logo */}
            <View style={styles.logoWrap}>
              <View style={[styles.logoBlur, { backgroundColor: "#ffffff" }]}>
                <Image
                  source={require("@/assets/images/aribot-mark.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={[styles.brandName, { color: isDark ? "#eaf2fc" : "#0c1c2c" }]}>
              ARIbots
            </Text>
            <Text style={[styles.tagline, { color: isDark ? "#9db0c2" : "#5a6c7d" }]}>
              Clinical AI for Physicians
            </Text>
          </View>

          {/* Glass card */}
          <View style={styles.cardWrap}>
            {isIOS ? (
              <BlurView
                intensity={55}
                tint={isDark ? "dark" : "light"}
                style={[styles.card, {
                  borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.72)",
                }]}
              >
                <CardContent
                  isDark={isDark}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  loading={loading}
                  demoLoading={demoLoading}
                  error={error}
                  handleLogin={handleLogin}
                  handleDemo={handleDemo}
                />
              </BlurView>
            ) : (
              <View style={[styles.card, {
                backgroundColor: isDark ? "rgba(28,44,64,0.68)" : "rgba(255,255,255,0.68)",
                borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.72)",
              }]}>
                <CardContent
                  isDark={isDark}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  loading={loading}
                  demoLoading={demoLoading}
                  error={error}
                  handleLogin={handleLogin}
                  handleDemo={handleDemo}
                />
              </View>
            )}
          </View>

          <Text style={[styles.footer, { color: isDark ? "#68798c" : "#93a2b1" }]}>
            For licensed physicians & healthcare professionals only
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}


function CardContent({
  isDark, email, setEmail, password, setPassword,
  loading, demoLoading, error, handleLogin, handleDemo
}: any) {
  const txt = isDark ? "#eaf2fc" : "#0c1c2c";
  const txt2 = isDark ? "#9db0c2" : "#5a6c7d";
  const inputBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.55)";
  const inputBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.72)";

  return (
    <View style={styles.cardInner}>
      <Text style={[styles.cardTitle, { color: txt }]}>Sign In</Text>
      <Text style={[styles.cardSub, { color: txt2 }]}>Doctor-only access</Text>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)" }]}>
          <Text style={[styles.errorTxt, { color: "#EF4444" }]}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: txt2 }]}>Email</Text>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: txt, borderColor: inputBorder }]}
          value={email}
          onChangeText={setEmail}
          placeholder="doctor@hospital.com"
          placeholderTextColor={isDark ? "#68798c" : "#93a2b1"}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: txt2 }]}>Password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: txt, borderColor: inputBorder }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          placeholderTextColor={isDark ? "#68798c" : "#93a2b1"}
          secureTextEntry
        />
      </View>

      {/* Primary gradient button */}
      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading || demoLoading}
        activeOpacity={0.85}
        style={styles.btnWrap}
      >
        <LinearGradient
          colors={["#2a7bff", "#12b5c9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, (loading || demoLoading) && { opacity: 0.65 }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.btnTxt}>Sign In</Text>}
        </LinearGradient>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(20,55,95,0.12)" }]} />
        <Text style={[styles.dividerTxt, { color: txt2 }]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(20,55,95,0.12)" }]} />
      </View>

      {/* Demo button */}
      <TouchableOpacity
        onPress={handleDemo}
        disabled={loading || demoLoading}
        activeOpacity={0.85}
        style={[styles.demoBtn, {
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)",
          borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.72)",
          opacity: (loading || demoLoading) ? 0.65 : 1,
        }]}
      >
        {demoLoading
          ? <ActivityIndicator color={isDark ? "#4a90ff" : "#1e6bff"} size="small" />
          : <Text style={[styles.demoBtnTxt, { color: isDark ? "#4a90ff" : "#1e6bff" }]}>Try the Demo</Text>}
      </TouchableOpacity>

      <Text style={[styles.demoNote, { color: isDark ? "#68798c" : "#93a2b1" }]}>
        Demo account: doctor@aribots.local / demo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  radialBlob: {
    position: "absolute",
    borderRadius: 999,
  },
  radialTL: { width: 320, height: 320, top: -60, left: -80 },
  radialTR: { width: 260, height: 260, top: -40, right: -60 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  hero: { alignItems: "center", marginBottom: 36 },
  logoWrap: {
    width: 112,
    height: 112,
    borderRadius: 32,
    overflow: "hidden",
    marginBottom: 22,
    shadowColor: "rgba(20,45,95,0.25)",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 44,
    elevation: 12,
  },
  logoBlur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 32,
    borderColor: "rgba(255,255,255,0.7)",
  },
  logo: { width: 72, height: 72 },
  brandName: {
    fontSize: 34,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    fontWeight: "500",
  },
  cardWrap: {
    width: "100%",
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "rgba(20,55,95,0.18)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 48,
    elevation: 14,
    marginBottom: 28,
  },
  card: {
    borderRadius: 30,
    borderWidth: 1,
  },
  cardInner: {
    padding: 26,
    gap: 0,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  cardSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    marginBottom: 20,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorTxt: { fontSize: 14, fontFamily: "Inter_400Regular" },
  fieldGroup: { gap: 7, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_500Medium" },
  input: {
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 15,
    fontSize: 15.5,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
  },
  btnWrap: {
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 6,
    shadowColor: "rgba(30,90,200,0.4)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 26,
    elevation: 8,
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: {
    color: "#fff",
    fontSize: 16.5,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 18,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerTxt: { fontSize: 13, fontFamily: "Inter_400Regular" },
  demoBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  demoBtnTxt: {
    fontSize: 15.5,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  demoNote: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 12,
  },
  footer: {
    fontSize: 12,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
});
