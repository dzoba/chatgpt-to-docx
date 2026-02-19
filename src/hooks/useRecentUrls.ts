import { useState, useCallback } from "react";

const STORAGE_KEY = "chatgpt-to-word-recent-urls";
const MAX_URLS = 8;

interface RecentEntry {
  url: string;
  title: string;
  timestamp: number;
}

export function useRecentUrls() {
  const [entries, setEntries] = useState<RecentEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const addEntry = useCallback((url: string, title: string) => {
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.url !== url);
      const next = [{ url, title, timestamp: Date.now() }, ...filtered].slice(0, MAX_URLS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* ignore quota errors */ }
      return next;
    });
  }, []);

  const removeEntry = useCallback((url: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.url !== url);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { entries, addEntry, removeEntry };
}
