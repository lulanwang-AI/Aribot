import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? "rgba(157,176,194,0.55)" : "rgba(90,108,125,0.55)",
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? "rgba(8,26,44,0.9)" : "rgba(244,249,255,0.9)",
          borderTopWidth: 0,
          elevation: 0,
          height: isWeb ? 84 : 82,
          paddingBottom: isWeb ? 24 : 18,
          // Glass border top
          borderTopColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.70)",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          marginTop: 2,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={[
                StyleSheet.absoluteFill,
                {
                  borderTopWidth: 1,
                  borderTopColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.70)",
                },
              ]}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark ? "rgba(8,26,44,0.92)" : "rgba(244,249,255,0.92)",
                  borderTopWidth: 1,
                  borderTopColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.70)",
                },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="ari"
        options={{
          title: "Ari",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="cpu" tintColor={color} size={24} />
            ) : (
              <Feather name="cpu" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="triage"
        options={{
          title: "Triage",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="cross.circle" tintColor={color} size={24} />
            ) : (
              <Feather name="alert-circle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={24} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="ellipsis.circle" tintColor={color} size={24} />
            ) : (
              <Feather name="grid" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
