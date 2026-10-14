import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BrandMark } from "@/components/Brand";
import { Button, Card, Chip, ErrorText, KeyValue, ListRow, Loading, Screen, SectionTitle, Select, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_ORDER, amrApi } from "@/lib/amr";
import { getBaseUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export default function MoreScreen() {
  const c = useColors();
  const { user, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const reference = useQuery({ queryKey: ["amr", "reference"], queryFn: amrApi.reference, staleTime: Infinity });

  const categories = useMemo(() => {
    const syndromes = reference.data?.syndromes ?? [];
    const names = Array.from(new Set(syndromes.map((s) => s.category)));
    names.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
    });
    return names.map((name) => ({ name, syndromes: syndromes.filter((s) => s.category === name) }));
  }, [reference.data]);

  return (
    <Screen title="More" testID="screen-more">
      <Card>
        <View style={styles.accountRow}>
          <BrandMark size={44} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: c.foreground }]}>{user?.name ?? "Signed in"}</Text>
            <Text style={[styles.sub, { color: c.mutedForeground }]}>{[user?.specialty, user?.hospital].filter(Boolean).join(" · ") || "Stewardship clinician"}</Text>
          </View>
          {user?.role ? <Chip label={user.role} small /> : null}
        </View>
        <Button label="Sign out" variant="outline" icon="log-out" onPress={() => signOut()} testID="button-sign-out" />
      </Card>

      <SectionTitle>Ask Ari</SectionTitle>
      <ListRow title="Ask Ari a stewardship question" subtitle="Dosing, spectrum, duration and guideline questions. Do not include patient identifiers." onPress={() => router.push("/ari")} testID="row-ask-ari" />

      <SectionTitle>Appearance</SectionTitle>
      <Select
        options={[
          { value: "system", label: "System" },
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
        value={mode}
        onChange={setMode}
        testID="select-theme"
      />

      <SectionTitle>Syndrome guidance</SectionTitle>
      <ErrorText error={reference.error} />
      {reference.isLoading ? (
        <Loading />
      ) : (
        categories.map((cat) => (
          <View key={cat.name} style={{ gap: 8 }}>
            <Text style={[styles.category, { color: c.mutedForeground }]}>{cat.name}</Text>
            {cat.syndromes.map((s) => (
              <ListRow key={s.id} title={s.name} subtitle={s.guideline} onPress={() => router.push(`/syndrome/${s.id}`)} testID={`row-syndrome-${s.id}`} />
            ))}
          </View>
        ))
      )}

      <SectionTitle>About</SectionTitle>
      <Card>
        <KeyValue k="Knowledge base" v={reference.data?.knowledgeBaseVersion ?? "-"} />
        <KeyValue k="Engine" v="Deterministic, antibiogram-weighted" />
        <KeyValue k="Server" v={getBaseUrl().replace(/^https?:\/\//, "") || "same origin"} />
        <Button label="Open the web workspace" variant="ghost" icon="external-link" small onPress={() => Linking.openURL(`${getBaseUrl()}/products/ari-amr`)} />
      </Card>
      <Text style={[styles.disclaimer, { color: c.mutedForeground }]}>
        Decision support for licensed clinicians. Recommendations are generated from the syndrome, the patient's risk profile and the regional antibiogram; they never replace clinical judgement.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  name: { fontSize: 16, fontFamily: fonts.semibold },
  sub: { fontSize: 13, fontFamily: fonts.regular, marginTop: 2 },
  category: { fontSize: 12, fontFamily: fonts.semibold, marginTop: 6 },
  disclaimer: { fontSize: 12, fontFamily: fonts.regular, lineHeight: 17 },
});
