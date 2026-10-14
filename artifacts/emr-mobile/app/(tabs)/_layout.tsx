import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, type ColorValue } from "react-native";

import { useColors } from "@/hooks/useColors";
import { fonts } from "@/components/ui";
import { emrApi } from "@/lib/emr";

type Icon = keyof typeof Feather.glyphMap;

function tabIcon(name: Icon) {
  return ({ color }: { color: ColorValue }) => <Feather name={name} size={22} color={color} />;
}

export default function TabLayout() {
  const c = useColors();
  const unread = useQuery({ queryKey: ["inbasket", "unread"], queryFn: emrApi.unreadCounts, refetchInterval: 60_000 });
  const badge = unread.data?.total ? unread.data.total : undefined;
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
        tabBarBadgeStyle: { backgroundColor: c.bad, color: "#ffffff", fontFamily: fonts.semibold, fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: tabIcon("calendar") }} />
      <Tabs.Screen name="patients" options={{ title: "Patients", tabBarIcon: tabIcon("users") }} />
      <Tabs.Screen name="inbasket" options={{ title: "In-basket", tabBarIcon: tabIcon("inbox"), tabBarBadge: badge }} />
      <Tabs.Screen name="ari" options={{ title: "Ari", tabBarIcon: tabIcon("message-circle") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: tabIcon("more-horizontal") }} />
    </Tabs>
  );
}
