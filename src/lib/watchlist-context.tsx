"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WatchlistItem } from "@/lib/types";

interface WatchlistContextValue {
  items: WatchlistItem[];
  loading: boolean;
  addItem: (item: WatchlistItem) => void;
  removeItem: (id: string) => void;
  refresh: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextValue>({
  items: [],
  loading: true,
  addItem: () => {},
  removeItem: () => {},
  refresh: async () => {},
});

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("watchlist")
      .select("*")
      .order("added_at", { ascending: false });
    setItems((data || []) as WatchlistItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback((item: WatchlistItem) => {
    setItems((prev) => [item, ...prev]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <WatchlistContext.Provider value={{ items, loading, addItem, removeItem, refresh: fetchItems }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
