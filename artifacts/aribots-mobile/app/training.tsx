import React from "react";
import { Stack } from "expo-router";
import { SimpleListScreen } from "@/components/SimpleList";

export default function TrainingScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Training" }} />
      <SimpleListScreen
        title="Training"
        subtitle="CME, modules, and clinical training"
        endpoint="/api/training"
        emptyText="No training modules available."
        toItem={(t: any) => ({
          id: t.id,
          title: t.title,
          subtitle: t.description,
          meta: t.duration ? `${t.duration} min` : t.category,
          badge: t.cmeCredits ? `${t.cmeCredits} CME` : undefined,
        })}
      />
    </>
  );
}
