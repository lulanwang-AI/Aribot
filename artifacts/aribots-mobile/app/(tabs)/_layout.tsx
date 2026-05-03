import { Tabs, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

export default function TabLayout() {
  const colors = useColors();
  const { authed, ready } = useAuth();
  const isWeb = Platform.OS === "web";

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  if (!authed) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          ...(isWeb ? { height: 84 } : {}),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ari"
        options={{
          title: "Ari",
          tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="triage"
        options={{
          title: "Triage",
          tabBarIcon: ({ color, size }) => <Feather name="activity" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: "News",
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size ?? 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
