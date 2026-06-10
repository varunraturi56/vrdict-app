import { createClient } from "@/lib/supabase/server";
import type { Entry, WatchlistItem } from "@/lib/types";

export interface InitialData {
  entries: Entry[] | null;
  watchlist: WatchlistItem[] | null;
}

/**
 * Fetched in the root layout so first paint already has data — no
 * JS → hydrate → fetch waterfall on the client. Returns nulls when
 * unauthenticated or on error; the providers fall back to their
 * client-side fetch in that case.
 */
export async function getInitialData(): Promise<InitialData> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) return { entries: null, watchlist: null };

    const [entriesRes, watchlistRes] = await Promise.all([
      supabase.from("entries").select("*").order("added_at", { ascending: false }),
      supabase.from("watchlist").select("*").order("added_at", { ascending: false }),
    ]);

    return {
      entries: entriesRes.error ? null : ((entriesRes.data ?? []) as Entry[]),
      watchlist: watchlistRes.error ? null : ((watchlistRes.data ?? []) as WatchlistItem[]),
    };
  } catch {
    return { entries: null, watchlist: null };
  }
}
