import React from "react";
import { Image, View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={require("@/assets/images/aribot-mark-1024.png")}
      style={{ width: size, height: size, borderRadius: size / 5 }}
      resizeMode="contain"
    />
  );
}

export function BrandWordmark({ size = 32 }: { size?: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <BrandMark size={size} />
      <Text
        style={{
          fontSize: size * 0.65,
          fontFamily: "Inter_700Bold",
          color: colors.foreground,
          letterSpacing: -0.3,
        }}
      >
        ARIbots
      </Text>
    </View>
  );
}

export function ModeGradient({
  mode,
  children,
  style,
}: {
  mode: "ari" | "er";
  children?: React.ReactNode;
  style?: any;
}) {
  const colors = useColors();
  const stops =
    mode === "er"
      ? [colors.erFrom, colors.erTo]
      : [colors.ariFrom, colors.ariTo];
  return (
    <LinearGradient
      colors={stops as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 16,
  },
});
