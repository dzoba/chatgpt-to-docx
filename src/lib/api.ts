import type { Conversation } from "./types";

export async function fetchConversation(url: string): Promise<Conversation> {
  const response = await fetch("/api/fetchConversation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  if (!data.conversation) {
    throw new Error("No conversation data returned");
  }

  return data.conversation;
}
