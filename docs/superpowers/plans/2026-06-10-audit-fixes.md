# VRdict Audit Fixes & Mobile Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the ~18 functional bugs from the 2026-06-10 audit and make the app meaningfully faster on mobile, without changing the UX (must keep matching the original cinelog design).

**Architecture:** Three phases ordered by risk. Phase A fixes bug wiring and adds error surfacing (no visual change). Phase B applies low-risk perf wins (service worker, image attributes, dead code, auth round-trip). Phase C makes the two architectural changes (conditional mobile/desktop tree rendering, server-side initial data, next/image for hot poster grids). Each task ends with build + tests green and a commit; any task can be reverted independently.

**Tech Stack:** Next.js 16.2.1 (Turbopack, `src/proxy.ts` not middleware), React 19, Supabase (@supabase/ssr), Tailwind v4, recharts (stats only), vitest.

**User decisions (locked):** full scope; Stats "All" average = true mean across all titles; re-enable pinch zoom.

**Verification constraints:** All pages sit behind Supabase auth (proxy redirects to /login). Automated runtime checks can only reach /login without credentials. Therefore: every task verifies with `npm run build` + `npx vitest run`; logic fixes get unit tests; UI wiring fixes get a manual smoke-test checklist at each phase end for Varun to run (or Playwright with a session if he provides a test login).

**Branch:** create `audit-fixes` off `main` before Task 1. Commit message suffix every commit with:
`Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

## Phase A — Bug fixes

### Task 1: Toast utility for surfacing errors

The app swallows every Supabase/TMDB error. All later fixes need one tiny way to tell the user something failed. No library — a ~40-line module matching the app's neon style.

**Files:**
- Create: `src/components/ui/toast.tsx`
- Modify: `src/components/layout/app-shell.tsx` (mount the viewport)
- Test: `src/__tests__/toast.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/toast.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastViewport, toast } from "@/components/ui/toast";

describe("toast", () => {
  it("renders a message pushed via toast() and removes it after timeout", async () => {
    render(<ToastViewport />);
    act(() => { toast("Save failed — try again"); });
    expect(screen.getByText("Save failed — try again")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`npx vitest run src/__tests__/toast.test.tsx`, fails: module not found)

- [ ] **Step 3: Implement `src/components/ui/toast.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string };
type Listener = (toasts: Toast[]) => void;

let nextId = 1;
let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function emit() { listeners.forEach((l) => l([...toasts])); }

/** Show a transient error/info message. Safe to call from any client code. */
export function toast(message: string, durationMs = 4000) {
  const id = nextId++;
  toasts = [...toasts, { id, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, durationMs);
}

export function ToastViewport() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const listener: Listener = (t) => setItems(t);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className="px-4 py-2 rounded-lg border border-red-500/30 bg-[#0e0e14]/95 text-red-300 font-body text-xs shadow-2xl animate-fade-up"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Mount viewport in `app-shell.tsx`** — inside `AppShellInner`'s returned fragment, after `<Suspense><BottomNav /></Suspense>`, add `<ToastViewport />` and import `{ ToastViewport }` from `@/components/ui/toast`. Also add it to the `isLoginPage` early-return branch: `return <>{children}<ToastViewport /></>;`

- [ ] **Step 5: Run test — expect PASS.** Then `npm run build` + `npx vitest run` — all green.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: add toast utility for surfacing errors"`

---

### Task 2: Stop discarding edits on failed saves; check all mutation errors

**Files:**
- Modify: `src/components/entry-detail-modal.tsx:50-66`
- Modify: `src/app/favourites/page.tsx` (delete local `EntryDetailModal` lines ~579-776, import shared one)
- Modify: `src/components/add-modal.tsx:50-65,118-121`
- Modify: `src/app/watchlist/page.tsx:197-250` (`addToWatchlist`, `removeFromWatchlist`, `moveToLibrary`)
- Modify: `src/lib/entries-context.tsx` (no change needed to context; home page consumes error in Task 3)

- [ ] **Step 1: Fix `entry-detail-modal.tsx` save/delete**

Replace `handleSave`/`handleDelete` bodies:

```tsx
async function handleSave() {
  setSaving(true);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("entries")
    .update({ my_rating: myRating, tags, recommended, rewatch, seasons_watched: seasonsWatched, year_watched: yearWatched || null })
    .eq("id", entry.id).select().single();
  setSaving(false);
  if (!error && data) onUpdate(data as Entry);
  else toast("Save failed — your changes were not stored.");
  // modal stays open on failure so edits are not lost
}

async function handleDelete() {
  const supabase = createClient();
  const { error } = await supabase.from("entries").delete().eq("id", entry.id);
  if (error) { toast("Delete failed — entry was not removed."); setConfirmDelete(false); return; }
  onDelete(entry.id);
}
```

Add `import { toast } from "@/components/ui/toast";`

- [ ] **Step 2: De-duplicate the favourites modal** — in `src/app/favourites/page.tsx`: delete the entire local `EntryDetailModal` function (the block from the comment `/* ── Entry Detail / Edit Modal` to end of file) and the now-unused imports it exclusively used (`createClient`, `DEFAULT_TAGS`, `useRef`, `ChevronDown` — verify each with `rg` before removing). Add `import { EntryDetailModal } from "@/components/entry-detail-modal";`. Note: the local copy's accent gradient was gold (`#ffb800`); the shared one is blue. Keep the shared one's look — single source of truth wins (acceptable per "no redesign": it's the same modal Library already shows).

- [ ] **Step 3: Fix `add-modal.tsx`** — guard the detail fetch and surface insert errors:

```tsx
// in the detail-fetch effect, replace `setDetail(await res.json())`:
if (!res.ok) { setDetail(null); setDetailError(true); return; }
setDetail(await res.json());
```

(There is an existing failed-state branch keyed on detail being null — read the file around lines 50-90 first and wire `detailError` into whatever it renders for the failure case; if no such state exists, render `<p>Failed to load details.</p>` in place of the detail card.)

For the save handler (`:118-121`): replace `if (!error) onAdded(...)` with:

```tsx
if (error) { toast("Could not add to library."); setSaving(false); return; }
onAdded(data as Entry);
```

(match the actual variable names in the file — read before editing).

- [ ] **Step 4: Fix watchlist mutations** (`src/app/watchlist/page.tsx`):

```tsx
async function addToWatchlist(result: TmdbSearchResult) {
  const existing = items.find((i) => i.tmdb_id === result.id && i.media_type === result.media_type);
  if (existing) return;
  const detailRes = await fetch(`/api/tmdb?action=detail&id=${result.id}&media_type=${result.media_type}`);
  if (!detailRes.ok) { toast("Could not fetch details from TMDB."); return; }
  const detail = await detailRes.json();
  const supabase = createClient();
  const item = buildWatchlistItem(result, detail);
  const { data, error } = await supabase.from("watchlist").insert(item).select().single();
  if (error || !data) { toast("Could not add to watchlist."); return; }
  ctxAddItem(data as WatchlistItem);
  setAddQuery("");
  setAddResults([]);
}

async function removeFromWatchlist(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("watchlist").delete().eq("id", id);
  if (error) { toast("Could not remove from watchlist."); return; }
  ctxRemoveItem(id);
}
```

(The `media_type` addition to the dedupe check is audit bug 17 — also apply the same two-field check to the `alreadyAdded` computation at `watchlist/page.tsx:892`.)

- [ ] **Step 5: Fix `moveToLibrary` + sync entries context (audit bug 10):**

```tsx
const { addEntry: ctxAddEntry } = useEntries();   // add to existing useWatchlist destructuring area; import useEntries from "@/lib/entries-context"

async function moveToLibrary(item: WatchlistItem) {
  setMovingToLibrary(item.id);
  const supabase = createClient();
  const entry = { /* keep existing field mapping exactly as-is */ };
  const { data, error } = await supabase.from("entries").insert(entry).select().single();
  if (error || !data) {
    toast("Could not move to library.");
    setMovingToLibrary(null);
    return;
  }
  ctxAddEntry(data as Entry);
  const { error: delError } = await supabase.from("watchlist").delete().eq("id", item.id);
  if (!delError) ctxRemoveItem(item.id);
  else toast("Added to library, but could not remove from watchlist.");
  setMovingToLibrary(null);
}
```

- [ ] **Step 6: Verify + commit** — `npm run build && npx vitest run` green. Commit: `fix: surface mutation errors, keep edits on failed save, sync moveToLibrary with library context`

---

### Task 3: Show entries-context load errors on pages

**Files:**
- Modify: `src/app/page.tsx:27,65-71`

- [ ] **Step 1:** Destructure `error` and `refresh` from `useEntries()` in `LibraryContent`. After the `if (loading)` block add:

```tsx
if (error) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <p className="font-body text-sm text-[#9a968e]">Could not load your library.</p>
      <button
        onClick={() => refresh()}
        className="px-4 py-1.5 rounded-lg border border-vr-blue/30 text-vr-blue font-display text-xs uppercase tracking-wider hover:bg-vr-blue/10 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
```

Also set `loading` true again during refresh: in `entries-context.tsx` `fetchEntries`, add `setLoading(true);` as the first line of the `try` block.

- [ ] **Step 2: Verify + commit** — build/tests green. Commit: `fix: surface library load errors with retry instead of silent empty state`

---

### Task 4: Watchlist — rewatch pagination, rewatch card modal, reactive isMobile, derive rewatch from context

**Files:**
- Create: `src/hooks/use-media-query.ts`
- Modify: `src/app/watchlist/page.tsx`
- Test: `src/__tests__/use-media-query.test.tsx`

- [ ] **Step 1: Write failing hook test**

```tsx
// src/__tests__/use-media-query.test.tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMediaQuery } from "@/hooks/use-media-query";

describe("useMediaQuery", () => {
  it("returns matchMedia state after mount", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Run — FAIL.** Implement the hook:

```tsx
// src/hooks/use-media-query.ts
"use client";

import { useState, useEffect } from "react";

/**
 * SSR-safe media query hook. Returns null on the server and during the
 * first client render (so prerendered HTML never mismatches), then the
 * live boolean, updated on viewport changes.
 */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}
```

Run test — PASS.

- [ ] **Step 3: Replace the two ad-hoc viewport reads in watchlist** —
  - `isWideGrid` block (`:75-83`) → `const isWideGrid = useMediaQuery("(min-width: 1280px)") ?? false;` (delete the useState/useEffect block).
  - `const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;` (`:167`) → `const isMobile = useMediaQuery("(max-width: 1023px)") ?? false;` and remove the eslint-disable on the `filteredRewatchItems` memo (deps are now honest).

- [ ] **Step 4: Fix rewatch pagination wiring (audit bug 9)** — destructure the rewatch pagination fully:

```tsx
const rewatchPagination = usePagination(filteredRewatchItems, itemsPerPage, [activeMediaType]);
```

Change `renderCardGrid` to take the pagination object instead of reaching for the outer state:

```tsx
function renderCardGrid(
  cardItems: (WatchlistItem | Entry)[],
  isRewatch: boolean,
  pager: { currentPage: number; setCurrentPage: (fn: (p: number) => number | number) => void; totalPages: number },
)
```

Inside the function replace every `currentPage` with `pager.currentPage`, every `setCurrentPage` with `pager.setCurrentPage`, and `pages` with `pager.totalPages`. Call sites become:

```tsx
: renderCardGrid(pagedRewatchItems, true, rewatchPagination))
: renderCardGrid(pagedItems, false, { currentPage, setCurrentPage, totalPages })
```

(Note `usePagination`'s `setCurrentPage` is a React state setter — the type above can simply be `React.Dispatch<React.SetStateAction<number>>`; use that.)

- [ ] **Step 5: Fix rewatch cards opening the wrong modal (audit bug 11)** — rewatch items are library `Entry` rows. In the desktop grid click handler (`:339`) and the mobile list click handler (`:557`), route rewatch items to the shared library modal instead:
  - Add state: `const [selectedRewatchEntry, setSelectedRewatchEntry] = useState<Entry | null>(null);`
  - Desktop: `onClick={() => isRewatch ? setSelectedRewatchEntry(item as Entry) : setSelectedItem(item as WatchlistItem)}`. Mobile: `onClick={() => showRewatch ? setSelectedRewatchEntry(item as Entry) : setSelectedItem(item as WatchlistItem)}`.
  - Render alongside the existing `WatchlistDetailModal`:

```tsx
{selectedRewatchEntry && (
  <EntryDetailModal
    entry={selectedRewatchEntry}
    onClose={() => setSelectedRewatchEntry(null)}
    onUpdate={(updated) => { ctxUpdateEntry(updated); setSelectedRewatchEntry(null); }}
    onDelete={(id) => { ctxRemoveEntry(id); setSelectedRewatchEntry(null); }}
  />
)}
```

  - Import `EntryDetailModal` from `@/components/entry-detail-modal` and pull `updateEntry: ctxUpdateEntry, removeEntry: ctxRemoveEntry` from the `useEntries()` call added in Task 2.

- [ ] **Step 6: Derive rewatch items from the entries context** — delete the `rewatchFetchedRef`/`loadRewatch` effect (`:104-120`) and the `rewatchItems`/`rewatchLoading` state. Replace with:

```tsx
const { entries } = useEntries(); // already imported in Task 2
const rewatchItems = useMemo(
  () => entries.filter((e) => e.rewatch).sort((a, b) => b.my_rating - a.my_rating),
  [entries]
);
```

Remove the `rewatchLoading` spinner branch in `desktopTvContent` (context loading already gates the page). This also makes rewatch state live-update when edited from the Library.

- [ ] **Step 7: Verify + commit** — build/tests green. Commit: `fix: watchlist rewatch pagination, rewatch detail modal, reactive breakpoints, derive rewatch from context`

---

### Task 5: Stats — true-mean average, media filter applied to all charts

**Files:**
- Create: `src/lib/stats-helpers.ts`
- Modify: `src/app/stats/page.tsx:99-124`
- Test: `src/__tests__/stats-helpers.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/__tests__/stats-helpers.test.ts
import { describe, it, expect } from "vitest";
import { meanRating } from "@/lib/stats-helpers";

describe("meanRating", () => {
  it("computes the true mean across all entries", () => {
    expect(meanRating([{ my_rating: 6 }, { my_rating: 6 }, { my_rating: 9 }])).toBe("7.0");
  });
  it("returns 0 for empty input", () => {
    expect(meanRating([])).toBe("0");
  });
});
```

- [ ] **Step 2: Run — FAIL. Implement:**

```ts
// src/lib/stats-helpers.ts
export function meanRating(entries: { my_rating: number }[]): string {
  if (entries.length === 0) return "0";
  return (entries.reduce((s, e) => s + e.my_rating, 0) / entries.length).toFixed(1);
}
```

Run — PASS.

- [ ] **Step 3: Use it in stats page** — replace the whole `avgRating` useMemo (`:99-107`) with:

```tsx
const avgRating = useMemo(() => meanRating(collectionEntries), [collectionEntries]);
```

- [ ] **Step 4: Apply the media filter to the other three charts** — at `:117` change `entries.forEach` → `collectionEntries.forEach`; at `:120` change `entries.filter` → `collectionEntries.filter`; at `:123` change `entries.forEach` → `collectionEntries.forEach`. (Doughnut already uses `collectionEntries`.)

- [ ] **Step 5: Verify + commit** — build/tests green. Commit: `fix: stats true-mean average and media filter applied to all charts`

---

### Task 6: Discover — sort wiring, fetch cancellation, cache restore, pagination dead-end, trending rating leak, dropdown dismissal, cache poisoning, breadcrumb reset, res.ok

This is the highest-bug-density file (1269 lines) and the audit findings came with exact line anchors. **Read `src/app/discover/page.tsx` in full before editing.** Apply each fix below; the line refs are from the audit and may drift a few lines as edits land.

**Files:**
- Modify: `src/app/discover/page.tsx`
- Modify: `src/lib/tmdb.ts` (sort helper, TV-valid genres)
- Test: `src/__tests__/tmdb.test.ts` (extend)

- [ ] **Step 1: Add a media-type-aware sort helper to `tmdb.ts` with a failing test first:**

```ts
// append to src/__tests__/tmdb.test.ts
import { tmdbSortParam } from "@/lib/tmdb";

describe("tmdbSortParam", () => {
  it("maps year sort to the right date field per media type", () => {
    expect(tmdbSortParam("year", "movie")).toBe("primary_release_date.desc");
    expect(tmdbSortParam("year", "tv")).toBe("first_air_date.desc");
  });
  it("maps popular and default", () => {
    expect(tmdbSortParam("popular", "movie")).toBe("popularity.desc");
    expect(tmdbSortParam("tmdb", "tv")).toBe("vote_average.desc");
  });
});
```

Implementation in `tmdb.ts` (export):

```ts
export function tmdbSortParam(sortKey: string, mediaType: string): string {
  switch (sortKey.toLowerCase()) {
    case "year": return mediaType === "tv" ? "first_air_date.desc" : "primary_release_date.desc";
    case "popular": return "popularity.desc";
    default: return "vote_average.desc"; // "TMDB"
  }
}
```

**Match the actual sort keys used in discover's `SORT_OPTIONS`/`sortBy` state — read them first and adjust the case labels in both test and implementation to the real values.** Run test — PASS.

- [ ] **Step 2: Wire `sortBy` into `fetchDiscover` (audit bug 1)** — where `sortOrders` is hardcoded (`~:214`), make the *primary* request use `tmdbSortParam(sortBy, mediaTab)` and keep the two supplementary requests as-is (they exist to diversify the pool). Replace the hardcoded client sort (`~:266`) with a comparator matching `sortBy`:

```ts
const bySort = (a: DiscoverItem, b: DiscoverItem) => {
  if (sortKey === "year") return (b.release_date || b.first_air_date || "").localeCompare(a.release_date || a.first_air_date || "");
  if (sortKey === "popular") return (b.popularity || 0) - (a.popularity || 0);
  return (b.vote_average || 0) - (a.vote_average || 0);
};
```

(Use the file's real item type/field names; if `popularity` isn't kept on mapped items, retain it during mapping.)

- [ ] **Step 3: Add stale-response protection (audit bug 5)** — module pattern, applied to `fetchDiscover`, the search-add effect, the keyword-resolution effect, and `search/page.tsx`'s search effect:

```ts
const requestSeq = useRef(0);
// at the start of every fetch:
const seq = ++requestSeq.current;
// before every setState with results:
if (seq !== requestSeq.current) return; // a newer request superseded this one
```

Remove the `loadingRef.current = false` force-resets (`~:311,334`) — the seq guard replaces them. In `search/page.tsx`, also clear results when the input is emptied *inside* the guard so an in-flight response can't repopulate an empty box.

- [ ] **Step 4: Fix session-cache restore (audit bug 4)** — when writing the cache, store the page: `sessionStorage.setItem(key, JSON.stringify({ results, page: pageRef.current }))`. When restoring (`~:66-77`), parse both and set `pageRef.current = cached.page ?? 1`. Keep backward compat: if the parsed value is an array (old format), treat it as `{ results: parsed, page: 1 }`.

- [ ] **Step 5: Fix the tab-switch cache poisoning (audit bug 8)** — keep a `resultsTabRef` that records which tab the current `results` belong to (set it where results are set, inside the seq guard). The cache-write effect writes only when `resultsTabRef.current === mediaTab`.

- [ ] **Step 6: Fix the pagination dead-end (audit bug 3)** — make `handleNextPage` await the append before advancing past the known last page:

```ts
async function handleNextPage() {
  const maxKnown = Math.ceil(results.length / 14); // ceil, not floor — leftover items reachable (fixes off-by-one)
  if (currentPage < maxKnown) { setCurrentPage((p) => p + 1); return; }
  if (!hasMoreRef.current || loadingRef.current) return;
  const before = results.length;
  await fetchDiscover(pageRef.current, true);
  // fetchDiscover sets results; advance only if something new arrived
  setCurrentPage((p) => p + 1 /* guarded below */);
}
```

Simplest robust form: after the awaited fetch, compare lengths via a ref (`resultsLenRef`) updated where results are set, and only `setCurrentPage(p => p + 1)` if `resultsLenRef.current > before`. Also change the `totalPages` computation from `Math.floor` to `Math.ceil`, and add the prev-arrow + spinner to the empty-results branch (copy the arrow JSX from the grid branch) so the user is never stranded.

- [ ] **Step 7: Stop trending bypassing the rating filter (audit bug 6)** — extend the trending-skip condition (`~:240-244`) to also skip when a rating filter is active, OR client-filter the trending batch by the active minimum rating before merging. Prefer the client filter (keeps trending visible with high-rated items): `trendingItems.filter(r => (r.vote_average || 0) >= minRating)` where `minRating` is derived the same way the discover requests derive `vote_avg_gte`.

- [ ] **Step 8: Dropdown dismissal (audit bug 7 + watchlist)** — in discover's outside-click handler (`~:88-96`) add: `if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) { setSearchResults([]); }` (use the real setter name). In `watchlist/page.tsx`'s `WatchlistToolbar`, create `addBoxRef`, attach it to the add-input wrapper div (`:876`), and clear `addResults` in its outside-click handler via a new `onDismissAddResults` prop wired to `() => setAddResults([])`.

- [ ] **Step 9: Breadcrumb reset clears rating filter** — in `handleBreadcrumbClick`-equivalent (`~:423-434`) add `setRatingFilter("any")` (match the actual default key).

- [ ] **Step 10: `res.ok` checks** — discover's `addToWatchlist` (`~:378`) and detail fetches: same pattern as Task 2 Step 4 (toast + return).

- [ ] **Step 11: Hide TV-invalid genres (audit bug 7/10)** — in `tmdb.ts` export:

```ts
/** Genres with no TMDB TV equivalent — hidden on the TV tab in Discover. */
export const MOVIE_ONLY_GENRES = new Set(["Horror", "Thriller", "Romance", "History", "Music", "TV Movie"]);
```

In discover's genre dropdown render, filter: `genres.filter(g => mediaTab !== "tv" || !MOVIE_ONLY_GENRES.has(g))`. If a hidden genre is currently selected when switching to TV, clear it (add to the existing tab-change reset effect). Quick sanity-check the set against TMDB's TV genre list (`GENRE_MAP` TV ids) before committing — only exclude genres that truly have no TV id and no entry in `MOVIE_TO_TV_GENRE_ID`.

- [ ] **Step 12: Memoize the hero candidates (audit bug 2)** — replace `useHeroRotation(results.slice(0, 20), heroFilter)` (`~:135`) with:

```ts
const heroCandidates = useMemo(() => results.slice(0, 20), [results]);
const heroEntry = useHeroRotation(heroCandidates, heroFilter);
```

- [ ] **Step 13: Verify + commit** — `npm run build && npx vitest run` green. Commit: `fix: discover sort, stale fetches, cache restore, pagination dead-end, rating leak, dropdown dismissal`

---

## Phase B — Low-risk performance

### Task 7: Service worker — real poster caching, zero overhead elsewhere

**Files:**
- Modify: `public/sw.js` (full rewrite)

- [ ] **Step 1: Replace `public/sw.js` with:**

```js
// VRdict Service Worker — PWA installability + cache-first TMDB posters.
// TMDB image URLs are content-addressed (path changes when the image changes),
// so cache-first is safe. All other requests fall through to the network with
// no respondWith() — the SW adds zero latency to app/API traffic.
const CACHE_NAME = "vrdict-v4";
const TMDB_IMAGES = "https://image.tmdb.org/t/p/";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(TMDB_IMAGES)) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok || res.type === "opaque") cache.put(request, res.clone());
      return res;
    })
  );
});
```

- [ ] **Step 2: Verify + commit** — build green (sw.js isn't bundled, but run it anyway). Commit: `perf: service worker caches TMDB posters cache-first, stops intercepting app traffic`

*(Note: if Task C3 migrates hot grids to next/image, those posters route through `/_next/image` instead and skip this cache — it still covers modals/heroes/small thumbs left as `<img>`.)*

---

### Task 8: Image attributes + right-size posters

**Files:**
- Modify: `src/app/watchlist/page.tsx:343,560,902,923` — card thumbs render at 36-45px; change `posterUrl(item.poster, "medium")` → `posterUrl(item.poster, "small")` on the 36px card thumb (`:343`) and add `loading="lazy"` + explicit `width`/`height` attributes matching the rendered size on all four.
- Modify: `src/app/search/page.tsx:175-179` — add `loading="lazy"`.
- Modify: `src/app/stats/page.tsx:543` (GenreModal list) — add `loading="lazy"`.
- Modify: discover search-dropdown thumbnails (audit noted `~:598,623`) — add `loading="lazy"`.
- All grid/list `<img>` without `width`/`height`: add them (use the CSS-rendered dimensions; e.g. watchlist card thumb `width={36} height={54}`). Skip images whose box is fluid (aspect-ratio grids) — they don't shift layout.

- [ ] **Step 1: Apply the edits above** (read each call site, keep classNames untouched).
- [ ] **Step 2: Verify + commit** — build/tests green. Commit: `perf: lazy-load and right-size poster images`

---

### Task 9: Viewport zoom, dead code, dependency hygiene

**Files:**
- Modify: `src/app/layout.tsx:28-34` — delete `maximumScale: 1,` and `userScalable: false,` (user decision: re-enable zoom).
- Delete: `src/lib/supabase/middleware.ts` (dead — `proxy.ts` is the live copy; verify with `rg -l "supabase/middleware" src` → must return nothing first).
- Modify: `package.json` — remove `"shadcn"` from dependencies; run `npm install` to update the lockfile. (`rg -l "from \"shadcn\"" src` must be empty first.)
- Modify: `.gitignore` — add `supabase/` (folder only contains CLI `.temp`).

- [ ] **Step 1: Apply, verify imports with rg, `npm install`, build/tests green.**
- [ ] **Step 2: Commit** — `chore: re-enable pinch zoom, remove dead middleware and unused shadcn dep`

---

### Task 10: Proxy — validate JWT locally instead of a network call per navigation

**Files:**
- Modify: `src/proxy.ts:28-30`

- [ ] **Step 1: Check API availability:** `rg "getClaims" node_modules/@supabase/supabase-js/dist/module/auth-js/* node_modules/@supabase/auth-js/dist/module/*.d.ts 2>/dev/null | head -3`. 
  - **If found:** replace the `getUser()` block with:

```ts
const { data } = await supabase.auth.getClaims();
const user = data?.claims ?? null;
```

  (`getClaims` verifies the JWT signature against cached JWKS — no per-request auth-server round trip. The rest of the redirect logic is unchanged; `user` truthiness checks still work.)
  - **If not found:** leave `getUser()` in place and instead narrow the matcher so prefetch/RSC requests skip the check — add as the first line of `proxy()`:

```ts
if (request.headers.get("purpose") === "prefetch" || request.headers.get("next-router-prefetch")) {
  return NextResponse.next({ request });
}
```

- [ ] **Step 2: Manual check:** `npm run dev`, load `/login` (no redirect loop), then confirm an unauthenticated `/` request still redirects to `/login` (`curl -sI localhost:3000/ | head -5` → 307 to /login).
- [ ] **Step 3: Commit** — `perf: validate session locally in proxy instead of per-navigation auth round trip`

---

## Phase C — Architectural performance

### Task 11: Render only one tree per viewport (mobile vs desktop)

Every page currently mounts both UIs and hides one with CSS. Use `useMediaQuery` (Task 4) to unmount the inactive tree *after* hydration — first paint stays identical (no hydration mismatch), then the phone drops the desktop TV-set tree entirely.

**Files:**
- Modify: `src/app/page.tsx` (`:79-131`), `src/app/watchlist/page.tsx` (`:613,737`), `src/app/favourites/page.tsx` (`:389,527`), `src/app/stats/page.tsx` (`:368,435`), and `src/app/discover/page.tsx` (find its equivalent `lg:hidden` / `hidden lg:` pair).

- [ ] **Step 1: In each page add** `const isDesktop = useMediaQuery("(min-width: 1024px)");` **and wrap:**

```tsx
{isDesktop !== true && (
  <div className="lg:hidden ...">  {/* existing mobile wrapper, unchanged */}
    ...
  </div>
)}
{isDesktop !== false && (
  <div className="hidden lg:flex ...">  {/* existing desktop wrapper, unchanged */}
    ...
  </div>
)}
```

The `!== true` / `!== false` forms keep both rendered while the hook is `null` (server + first client render), preserving hydration. Keep all existing responsive classNames — they remain the safety net.

In `page.tsx` the desktop view has no wrapper div (the component hides itself internally at `desktop-view.tsx:150`); wrap the `<LibraryDesktopView .../>` call in `{isDesktop !== false && (...)}` without adding a div.

- [ ] **Step 2: Also gate the desktop-only hero/pagination hooks where cheap:** in `page.tsx`, `useHeroRotation` runs on desktop pointlessly — leave hooks alone (rules of hooks), this task only gates JSX.

- [ ] **Step 3: Verify** — build/tests green; `npm run dev` + check `/login` renders; manual checklist entry added (below).
- [ ] **Step 4: Commit** — `perf: unmount inactive mobile/desktop tree after hydration`

---

### Task 12: Server-side initial data for entries + watchlist

Eliminate the JS→hydrate→fetch waterfall: fetch both tables in the root layout (server) and seed the client providers. Pages render with data on first paint.

**Files:**
- Create: `src/lib/supabase/initial-data.ts`
- Modify: `src/app/layout.tsx`, `src/components/layout/app-shell.tsx`, `src/lib/entries-context.tsx`, `src/lib/watchlist-context.tsx`

- [ ] **Step 1: Read `src/lib/watchlist-context.tsx` and `src/lib/supabase/server.ts` in full** (the watchlist context hasn't been read this session — mirror whatever its fetch/order logic is).

- [ ] **Step 2: Create the server fetcher:**

```ts
// src/lib/supabase/initial-data.ts
import { createClient } from "@/lib/supabase/server";
import type { Entry, WatchlistItem } from "@/lib/types";

export interface InitialData {
  entries: Entry[] | null;
  watchlist: WatchlistItem[] | null;
}

/** Fetched in the root layout. Returns nulls when unauthenticated or on error —
 *  providers fall back to their client-side fetch. */
export async function getInitialData(): Promise<InitialData> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { entries: null, watchlist: null };
    const [entriesRes, watchlistRes] = await Promise.all([
      supabase.from("entries").select("*").order("added_at", { ascending: false }),
      supabase.from("watchlist").select("*").order("added_at", { ascending: false }), // match watchlist-context's real ordering
    ]);
    return {
      entries: entriesRes.error ? null : ((entriesRes.data ?? []) as Entry[]),
      watchlist: watchlistRes.error ? null : ((watchlistRes.data ?? []) as WatchlistItem[]),
    };
  } catch {
    return { entries: null, watchlist: null };
  }
}
```

- [ ] **Step 3: Thread it through the layout:**

```tsx
// layout.tsx — RootLayout becomes async
export default async function RootLayout({ children }: ...) {
  const initialData = await getInitialData();
  ...
  <AppShell initialData={initialData}>{children}</AppShell>
```

`AppShell` accepts and forwards: `<EntriesProvider initialEntries={initialData.entries}><WatchlistProvider initialItems={initialData.watchlist}>...`. Note: this makes all routes dynamic (cookies). That's correct here — every page is auth-gated and personal; static prerender of empty shells was buying nothing.

- [ ] **Step 4: Seed the providers.** In `entries-context.tsx`:

```tsx
export function EntriesProvider({ children, initialEntries = null }: { children: ReactNode; initialEntries?: Entry[] | null }) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries ?? []);
  const [loading, setLoading] = useState(initialEntries === null);
  ...
  useEffect(() => {
    if (initialEntries !== null) return; // server already provided data
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchEntries]);
```

Mirror the same pattern in `watchlist-context.tsx` with its own types/fetch.

- [ ] **Step 5: Verify** — build green (routes now show `ƒ` dynamic instead of `○` static — expected); tests green; dev-server `/login` works; unauthenticated `/` still redirects.
- [ ] **Step 6: Commit** — `perf: server-fetch initial entries/watchlist, eliminate post-hydration data waterfall`

---

### Task 13: next/image for the hot poster grids

**Files:**
- Modify: `next.config.ts`
- Modify: `src/components/library/mobile-view.tsx:177`, `src/components/library/desktop-view.tsx:215`, `src/app/favourites/page.tsx` (both grids), `src/app/stats/page.tsx` (top-tens + MobileTopRated), discover's main results grid (`~:1048-1119` mobile + desktop grid)

- [ ] **Step 1: Configure the loader:**

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" }],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Swap grid images.** Pattern for the aspect-ratio grid cells (mobile library, favourites, discover):

```tsx
import Image from "next/image";

<div className="aspect-[2/3] relative">
  {entry.poster ? (
    <Image
      src={posterUrl(entry.poster, "medium")}
      alt={entry.title}
      fill
      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 10vw"
      className="object-cover rounded-[6px]"
    />
  ) : ( ...unchanged fallback... )}
</div>
```

`fill` requires the parent to be `position: relative` — the grid cells already have fixed aspect boxes; add `relative` where missing. Keep every existing className. For fixed-size thumbs (stats top-tens at ~`ROW_H` height) keep `<img>` from Task 8 — `fill` inside flex-height boxes is fiddly and the win is small; only convert cells with a clean aspect-ratio container.

- [ ] **Step 3: Visual check on dev server** (login page + ask Varun to eyeball grids), build/tests green.
- [ ] **Step 4: Commit** — `perf: next/image with AVIF/WebP for poster grids`

---

## Final verification

- [ ] `npm run build` — clean; `npx vitest run` — all green (54 original + new tests).
- [ ] Manual smoke-test checklist for Varun (auth-gated flows I can't drive without credentials):
  1. Library: open entry → edit rating → Save with network throttled to offline → modal stays open + toast (not silently closed).
  2. Watchlist: Rewatch toggle with >12 items → arrows actually change the cards; click a rewatch card → library edit modal opens.
  3. Watchlist: "Watched — Add to Library" → title appears in Library immediately, no reload.
  4. Discover: change Sort → order visibly changes; switch Movies/TV fast on slow 3G throttle → no wrong-tab results; navigate away + back → infinite scroll still loads.
  5. Discover desktop: hammer next-arrow at the last page → no "No results found" trap, arrows always present.
  6. Stats: Films/TV pills now change all four charts; "All" average = true mean.
  7. Mobile (real phone): cold load noticeably faster; pinch zoom works; posters load as AVIF/WebP (devtools network).
- [ ] Merge: fast-forward `audit-fixes` → `main` after Varun's smoke test (do not merge before).

## Explicitly out of scope (deferred)

- Font reduction (all three families are load-bearing for the design).
- Virtualization / `content-visibility` on long mobile lists (revisit if still slow after Phase C).
- recharts replacement (route-split already; only affects /stats).
- Escape-key handling on modals (small a11y win; do as a follow-up).
- Discover "Any rating" hidden floors (by design until Varun says otherwise).
