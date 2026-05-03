import React from "react";
import { Stack, useRouter } from "expo-router";
import { SimpleListScreen } from "@/components/SimpleList";

export default function ChatsScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: "Messages" }} />
      <SimpleListScreen
        title="Messages"
        subtitle="Direct chats with colleagues"
        endpoint="/api/chats"
        emptyText="No conversations yet."
        toItem={(c: any) => ({
          id: c.id,
          title: c.peer?.name || c.title || "Chat",
          subtitle: c.lastMessage?.content || c.lastMessage || "",
          meta: c.peer?.specialty,
          badge: c.unread ? String(c.unread) : undefined,
        })}
        onPressItem={(c) => router.push(`/chats/${c.id}`)}
      />
    </>
  );
}
