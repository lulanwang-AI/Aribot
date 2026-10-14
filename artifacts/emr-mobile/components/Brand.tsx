import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { fonts } from "@/components/ui";

export const BRAND_NAME = "Ari EMR";
export const BRAND_TAGLINE = "The chart, the schedule and the in-basket";

export function BrandMark({ size = 36 }: { size?: number }) {
  return <Image source={require("@/assets/images/mark.png")} style={{ width: size, height: size, borderRadius: size / 4.5 }} resizeMode="contain" />;
}

export function BrandWordmark({ size = 32 }: { size?: number }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <BrandMark size={size} />
      <Text style={[styles.word, { color: c.foreground, fontSize: size * 0.6 }]}>{BRAND_NAME}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  word: { fontFamily: fonts.bold, letterSpacing: -0.4 },
});
