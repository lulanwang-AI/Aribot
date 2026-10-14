import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { BrandMark } from "@/components/Brand";
import { Button, Card, Chip, KeyValue, Screen, SectionTitle, Select, fonts } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { EMR_BASE_PATH, getOrigin } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { emrApi } from "@/lib/emr";
import { useTheme } from "@/lib/theme";

export default function MoreScreen() {
  const c = useColors();
  const { user, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const ari = useQuery({ queryKey: ["ari", "status"], queryFn: emrApi.ariStatus, staleTime: 60_000 });

  return (
    <Screen title="More" testID="screen-more">
      <Card>
        <View style={styles.accountRow}>
          <BrandMark size={44} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: c.foreground }]}>{user?.name ?? "Signed in"}</Text>
            <Text style={[styles.sub, { color: c.mutedForeground }]}>{user?.role ? user.role.replace(/^\w/, (ch) => ch.toUpperCase()) : "Clinician"}</Text>
          </View>
          <Chip label={ari.data?.available ? "Ari online" : ari.isLoading ? "Checking Ari" : "Ari offline"} tone={ari.data?.available ? "good" : "muted"} small />
        </View>
        <Button label="Sign out" variant="outline" icon="log-out" onPress={() => signOut()} testID="button-sign-out" />
      </Card>

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

      <SectionTitle>About</SectionTitle>
      <Card>
        <KeyValue k="Workspace" v="Ari EMR" />
        <KeyValue k="Clinical AI" v={ari.data?.available ? "Ari available" : "Deterministic fallbacks"} />
        <KeyValue k="Server" v={getOrigin().replace(/^https?:\/\//, "") || "same origin"} />
        <Button label="Open the web EMR" variant="ghost" icon="external-link" small onPress={() => Linking.openURL(`${getOrigin()}${EMR_BASE_PATH}/`)} />
      </Card>
      <Text style={[styles.disclaimer, { color: c.mutedForeground }]}>
        Every chart view and note written from this app is recorded in the EMR's audit log, exactly as from the desktop. Ari drafts are suggestions for a clinician to review and sign.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  name: { fontSize: 16, fontFamily: fonts.semibold },
  sub: { fontSize: 13, fontFamily: fonts.regular, marginTop: 2 },
  disclaimer: { fontSize: 12, fontFamily: fonts.regular, lineHeight: 17 },
});
