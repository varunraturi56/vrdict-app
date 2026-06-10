"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Entry } from "@/lib/types";

interface EntriesContextValue {
  entries: Entry[];
  loading: boolean;
  error: string | null;
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
  error: null,
  updateEntry: () => {},
  removeEntry: () => {},
  addEntry: () => {},
  refresh: async () => {},
});

export function EntriesProvider({
  children,
  initialEntries = null,
}: {
  children: ReactNode;
  initialEntries?: Entry[] | null;
}) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries ?? []);
  const [loading, setLoading] = useState(initialEntries === null);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("entries")
        .select("*")
        .order("added_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setEntries((data ?? []) as Entry[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // server already provided data — skip the client fetch on mount
    if (initialEntries !== null) return;
    fetchEntries();
  }, [fetchEntries, initialEntries]);

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
    <EntriesContext.Provider value={{ entries, loading, error, updateEntry, removeEntry, addEntry, refresh: fetchEntries }}>
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries() {
  return useContext(EntriesContext);
}
