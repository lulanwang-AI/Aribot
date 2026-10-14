import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, type ColorValue } from "react-native";

import { useColors } from "@/hooks/useColors";
import { fonts } from "@/components/ui";

type Icon = keyof typeof Feather.glyphMap;

function tabIcon(name: Icon) {
  return ({ color }: { color: ColorValue }) => <Feather name={name} size={22} color={color} />;
}

export default function TabLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
          height: Platform.OS === "web" ? 64 : 84,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.medium },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: tabIcon("activity") }} />
      <Tabs.Screen name="cases" options={{ title: "Cases", tabBarIcon: tabIcon("clipboard") }} />
      <Tabs.Screen name="antibiogram" options={{ title: "Antibiogram", tabBarIcon: tabIcon("grid") }} />
      <Tabs.Screen name="formulary" options={{ title: "Formulary", tabBarIcon: tabIcon("book-open") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: tabIcon("more-horizontal") }} />
    </Tabs>
  );
}
