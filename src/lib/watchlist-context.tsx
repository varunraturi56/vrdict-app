"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WatchlistItem } from "@/lib/types";

interface WatchlistContextValue {
  items: WatchlistItem[];
  loading: boolean;
  error: string | null;
  addItem: (item: WatchlistItem) => void;
  removeItem: (id: string) => void;
  refresh: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextValue>({
  items: [],
  loading: true,
  error: null,
  addItem: () => {},
  removeItem: () => {},
  refresh: async () => {},
});

export function WatchlistProvider({
  children,
  initialItems = null,
}: {
  children: ReactNode;
  initialItems?: WatchlistItem[] | null;
}) {
  const [items, setItems] = useState<WatchlistItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState(initialItems === null);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("watchlist")
        .select("*")
        .order("added_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setItems((data ?? []) as WatchlistItem[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // server already provided data — skip the client fetch on mount
    if (initialItems !== null) return;
    fetchItems();
  }, [fetchItems, initialItems]);

  const addItem = useCallback((item: WatchlistItem) => {
    setItems((prev) => [item, ...prev]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <WatchlistContext.Provider value={{ items, loading, error, addItem, removeItem, refresh: fetchItems }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
