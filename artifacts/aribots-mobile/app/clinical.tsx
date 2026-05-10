import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const WORKFLOW_STEPS = [
  { id: "precharting", label: "Pre-Charting", icon: "clipboard", desc: "Patient intake & history" },
  { id: "aiconsult", label: "AI Consult", icon: "cpu", desc: "Ari clinical decision support" },
  { id: "soap", label: "SOAP Note", icon: "file-text", desc: "Structured clinical documentation" },
  { id: "summary", label: "Visit Summary", icon: "check-circle", desc: "Patient-ready summary" },
];

export default function ClinicalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    chiefComplaint: "",
    hpi: "",
    pmh: "",
    medications: "",
    allergies: "",
    exam: "",
    assessment: "",
    plan: "",
  });

  function updateField(key: string, value: string) {
    setFormData(d => ({ ...d, [key]: value }));
  }

  function inputStyle(colors: any) {
    return [styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }];
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 4, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Clinical Workflow</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={[styles.stepsBar, { borderBottomColor: colors.border }]}>
        {WORKFLOW_STEPS.map((step, i) => (
          <TouchableOpacity
            key={step.id}
            style={styles.stepItem}
            onPress={() => { setActiveStep(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <View style={[styles.stepCircle, {
              backgroundColor: i <= activeStep ? colors.primary : colors.muted,
              borderColor: i === activeStep ? colors.primary : "transparent",
              borderWidth: i === activeStep ? 2 : 0,
            }]}>
              <Feather name={step.icon as any} size={14} color={i <= activeStep ? "#fff" : colors.mutedForeground} />
            </View>
            <Text style={[styles.stepLabel, { color: i === activeStep ? colors.primary : colors.mutedForeground }]}>
              {step.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: isWeb ? 34 : insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>{WORKFLOW_STEPS[activeStep].label}</Text>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{WORKFLOW_STEPS[activeStep].desc}</Text>

        {activeStep === 0 && (
          <View style={styles.formSection}>
            {[
              { key: "chiefComplaint", label: "Chief Complaint", placeholder: "e.g., Chest pain for 2 hours" },
              { key: "hpi", label: "History of Present Illness", placeholder: "Describe the current illness...", multiline: true },
              { key: "pmh", label: "Past Medical History", placeholder: "Relevant medical history..." },
              { key: "medications", label: "Current Medications", placeholder: "List medications and doses..." },
              { key: "allergies", label: "Allergies", placeholder: "Drug and environmental allergies..." },
            ].map(field => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                <TextInput
                  style={[inputStyle(colors), field.multiline && styles.textarea]}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={(formData as any)[field.key]}
                  onChangeText={v => updateField(field.key, v)}
                  multiline={field.multiline}
                  numberOfLines={field.multiline ? 3 : 1}
                />
              </View>
            ))}
          </View>
        )}

        {activeStep === 1 && (
          <View style={[styles.ariConsultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.ariIconWrap, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="cpu" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.ariConsultTitle, { color: colors.foreground }]}>Ari Clinical Consultation</Text>
            <Text style={[styles.ariConsultDesc, { color: colors.mutedForeground }]}>
              Based on your pre-charting data, Ari will provide a differential diagnosis, suggested workup, and clinical reasoning.
            </Text>
            <TouchableOpacity
              style={[styles.ariLaunchBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(tabs)/ari")}
            >
              <Feather name="cpu" size={16} color="#fff" />
              <Text style={styles.ariLaunchText}>Open Ari Chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeStep === 2 && (
          <View style={styles.formSection}>
            {[
              { key: "exam", label: "Physical Examination", placeholder: "Vital signs and exam findings..." },
              { key: "assessment", label: "Assessment", placeholder: "Clinical impression and diagnoses..." },
              { key: "plan", label: "Plan", placeholder: "Treatment plan, orders, follow-up..." },
            ].map(field => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                <TextInput
                  style={[inputStyle(colors), styles.textarea]}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={(formData as any)[field.key]}
                  onChangeText={v => updateField(field.key, v)}
                  multiline
                  numberOfLines={4}
                />
              </View>
            ))}
          </View>
        )}

        {activeStep === 3 && (
          <View style={styles.summaryView}>
            <View style={[styles.summarySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.primary }]}>Chief Complaint</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formData.chiefComplaint || "Not entered"}</Text>
            </View>
            <View style={[styles.summarySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.primary }]}>Assessment</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formData.assessment || "Not entered"}</Text>
            </View>
            <View style={[styles.summarySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.primary }]}>Plan</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formData.plan || "Not entered"}</Text>
            </View>
            <TouchableOpacity style={[styles.completeBtn, { backgroundColor: "#10B981" }]}>
              <Feather name="check-circle" size={18} color="#fff" />
              <Text style={styles.completeBtnText}>Complete Visit</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeStep < WORKFLOW_STEPS.length - 1 && (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setActiveStep(s => s + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  stepsBar: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1, gap: 4 },
  stepItem: { flex: 1, alignItems: "center", gap: 5 },
  stepCircle: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" as const },
  content: { padding: 20, gap: 16 },
  stepTitle: { fontSize: 22, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  stepDesc: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -8 },
  formSection: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { height: 46, borderRadius: 10, paddingHorizontal: 14, fontSize: 14, borderWidth: 1, fontFamily: "Inter_400Regular" },
  textarea: { height: 90, paddingTop: 12, textAlignVertical: "top" as const },
  ariConsultCard: { borderRadius: 16, padding: 20, borderWidth: 1, alignItems: "center", gap: 12 },
  ariIconWrap: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  ariConsultTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  ariConsultDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" as const, lineHeight: 22 },
  ariLaunchBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  ariLaunchText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  summaryView: { gap: 14 },
  summarySection: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 6 },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  summaryValue: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  completeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 12, gap: 8 },
  completeBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 12, gap: 8 },
  nextBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
