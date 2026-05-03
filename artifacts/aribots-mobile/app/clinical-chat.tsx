import { Redirect, Stack } from "expo-router";
import React from "react";

export default function ClinicalChatScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "AI Consult" }} />
      <Redirect href="/(tabs)/ari" />
    </>
  );
}
