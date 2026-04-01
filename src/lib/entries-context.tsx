"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Entry } from "@/lib/types";

interface EntriesContextValue {
  entries: Entry[];
  loading: boolean;
  /** Replace one entry in-place (after edit) */
  updateEntry: (updated: Entry) => void;
  /** Remove an entry (after delete) */
  removeEntry: (id: string) => void;
  /** Add an entry (after adding from discover/watchlist) */
  addEntry: (entry: Entry) => void;
  /** Force a full re-fetch from Supabase */
  refresh: () => Promise<void>;
}

const EntriesContext = createContext<EntriesContextValue>({
  entries: [],
  loading: true,
  updateEntry: () => {},
  removeEntry: () => {},
  addEntry: () => {},
  refresh: async () => {},
});

export function EntriesProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("entries")
      .select("*")
      .order("added_at", { ascending: false });
    setEntries((data || []) as Entry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const updateEntry = useCallback((updated: Entry) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addEntry = useCallback((entry: Entry) => {
    setEntries((prev) => [entry, ...prev]);
  }, []);

  return (
    <EntriesContext.Provider value={{ entries, loading, updateEntry, removeEntry, addEntry, refresh: fetchEntries }}>
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries() {
  return useContext(EntriesContext);
}
