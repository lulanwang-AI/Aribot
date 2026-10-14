import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { fonts } from "@/components/ui";

export default function NotFoundScreen() {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: c.background, padding: 24 }}>
      <Text style={{ color: c.foreground, fontFamily: fonts.semibold, fontSize: 18 }}>This screen does not exist.</Text>
      <Link href="/" style={{ color: c.primary, fontFamily: fonts.medium }}>
        Back to today
      </Link>
    </View>
  );
}
