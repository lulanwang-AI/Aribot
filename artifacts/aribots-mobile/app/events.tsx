import React from "react";
import { Stack } from "expo-router";
import { SimpleListScreen } from "@/components/SimpleList";

export default function EventsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Events" }} />
      <SimpleListScreen
        title="Events"
        subtitle="Conferences, CME, and meetups"
        endpoint="/api/events"
        emptyText="No upcoming events."
        toItem={(e: any) => ({
          id: e.id,
          title: e.title,
          subtitle: e.description,
          meta: `${new Date(e.date).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}${e.location ? ` • ${e.location}` : ""}`,
          badge: e.virtual ? "Virtual" : undefined,
        })}
      />
    </>
  );
}
