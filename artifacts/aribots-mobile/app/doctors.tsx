import React from "react";
import { Stack } from "expo-router";
import { SimpleListScreen } from "@/components/SimpleList";

export default function DoctorsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Doctors" }} />
      <SimpleListScreen
        title="Doctors"
        subtitle="Verified clinicians on ARIbots"
        endpoint="/api/doctors"
        emptyText="No doctors found."
        toItem={(d: any) => ({
          id: d.id,
          title: d.name,
          subtitle: d.bio || d.hospital,
          meta: d.specialty,
        })}
      />
    </>
  );
}
