import React from "react";
import { useRouter, Stack } from "expo-router";
import { SimpleListScreen } from "@/components/SimpleList";

export default function GroupsScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: "Groups" }} />
      <SimpleListScreen
        title="Groups"
        subtitle="Specialty communities"
        endpoint="/api/groups"
        emptyText="No groups yet."
        toItem={(g: any) => ({
          id: g.id,
          title: g.name,
          subtitle: g.description,
          meta: `${g.memberCount ?? g.members?.length ?? 0} members`,
        })}
        onPressItem={(g) => router.push(`/groups/${g.id}`)}
      />
    </>
  );
}
