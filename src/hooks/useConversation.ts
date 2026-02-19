import { useState, useCallback } from "react";
import type { Conversation } from "../lib/types";
import { fetchConversation as fetchConversationApi } from "../lib/api";

type Status = "idle" | "loading" | "success" | "error";

export function useConversation() {
  const [status, setStatus] = useState<Status>("idle");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchConversation = useCallback(async (url: string): Promise<Conversation | null> => {
    setStatus("loading");
    setError(null);

    try {
      const data = await fetchConversationApi(url);
      setConversation(data);
      setSelectedIds(new Set(data.messages.map((m) => m.id)));
      setStatus("success");
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setStatus("error");
      return null;
    }
  }, []);

  const toggleMessage = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (conversation) {
      setSelectedIds(new Set(conversation.messages.map((m) => m.id)));
    }
  }, [conversation]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    status,
    conversation,
    selectedIds,
    error,
    fetchConversation,
    toggleMessage,
    selectAll,
    deselectAll,
  };
}
