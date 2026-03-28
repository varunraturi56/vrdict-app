"use client";

import { useState, useEffect, useCallback } from "react";
import { Search as SearchIcon, Plus, Bookmark, Check } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import {
  type TmdbSearchResult,
  getDisplayTitle,
  getYear,
  getGenreNames,
  posterUrl,
} from "@/lib/tmdb";
import { createClient } from "@/lib/supabase/client";
import { AddModal } from "@/components/add-modal";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingTmdbIds, setExistingTmdbIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedResult, setSelectedResult] =
    useState<TmdbSearchResult | null>(null);
  const [addingToWatchlist, setAddingToWatchlist] = useState<number | null>(
    null
  );
  const debouncedQuery = useDebounce(query, 350);

  // Load existing entries to mark "already added"
  useEffect(() => {
    async function loadExisting() {
      const supabase = createClient();
      const { data: entries } = await supabase
        .from("entries")
        .select("tmdb_id, media_type");
      const { data: watchlist } = await supabase
        .from("watchlist")
        .select("tmdb_id, media_type");

      const ids = new Set<string>();
      entries?.forEach((e) => ids.add(`${e.media_type}_${e.tmdb_id}`));
      watchlist?.forEach((w) => ids.add(`watchlist_${w.media_type}_${w.tmdb_id}`));
      setExistingTmdbIds(ids);
    }
    loadExisting();
  }, []);

  // Search TMDB
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    async function search() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/tmdb?action=search&query=${encodeURIComponent(debouncedQuery)}`
        );
        const data = await res.json();
        const filtered = (data.results || []).filter(
          (r: TmdbSearchResult) =>
            r.media_type === "movie" || r.media_type === "tv"
        );
        setResults(filtered.slice(0, 12));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    search();
  }, [debouncedQuery]);

  const isInLibrary = useCallback(
    (r: TmdbSearchResult) =>
      existingTmdbIds.has(`${r.media_type}_${r.id}`),
    [existingTmdbIds]
  );

  const isInWatchlist = useCallback(
    (r: TmdbSearchResult) =>
      existingTmdbIds.has(`watchlist_${r.media_type}_${r.id}`),
    [existingTmdbIds]
  );

  async function addToWatchlist(result: TmdbSearchResult) {
    setAddingToWatchlist(result.id);
    try {
      // Fetch full detail first
      const res = await fetch(
        `/api/tmdb?action=detail&id=${result.id}&media_type=${result.media_type}`
      );
      const detail = await res.json();

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const isMovie = result.media_type === "movie";

      await supabase.from("watchlist").insert({
        user_id: user.id,
        tmdb_id: result.id,
        media_type: result.media_type,
        title: isMovie ? detail.title : detail.name,
        year: (isMovie ? detail.release_date : detail.first_air_date)?.substring(0, 4) || null,
        genres: (detail.genres || []).map((g: { name: string }) => g.name),
        poster: detail.poster_path,
        overview: detail.overview,
        tmdb_rating: Math.round((detail.vote_average || 0) * 10) / 10,
        runtime: isMovie ? detail.runtime : (detail.episode_run_time?.[0] || 0),
        seasons: isMovie ? 0 : (detail.number_of_seasons || 0),
        episodes: isMovie ? 0 : (detail.number_of_episodes || 0),
        imdb_id: detail.imdb_id || detail.external_ids?.imdb_id || null,
      });

      setExistingTmdbIds((prev) => {
        const next = new Set(prev);
        next.add(`watchlist_${result.media_type}_${result.id}`);
        return next;
      });
    } catch {
      // silently fail
    } finally {
      setAddingToWatchlist(null);
    }
  }

  function handleAdded(tmdbId: number, mediaType: string) {
    setExistingTmdbIds((prev) => {
      const next = new Set(prev);
      next.add(`${mediaType}_${tmdbId}`);
      return next;
    });
    setSelectedResult(null);
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <SearchIcon size={22} className="text-vr-blue" />
        <h1 className="font-display text-xl font-semibold text-gradient-vr tracking-wider uppercase">
          Search
        </h1>
      </div>

      {/* Search input */}
      <div className="relative mb-6">
        <SearchIcon
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c5954]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search films & TV shows..."
          autoFocus
          className="w-full h-12 rounded-lg border border-border-glow bg-bg-card/50 pl-10 pr-4 font-body text-sm text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/40 focus:ring-1 focus:ring-vr-blue/20 transition-colors"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-vr-blue/30 border-t-vr-blue rounded-full animate-spin" />
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result, i) => {
            const inLibrary = isInLibrary(result);
            const inWatchlist = isInWatchlist(result);

            return (
              <div
                key={`${result.media_type}_${result.id}`}
                className={`flex items-center gap-4 p-3 rounded-xl border border-border-glow bg-bg-card/50 transition-all animate-slide-in hover:bg-bg-card-hover ${
                  inLibrary ? "opacity-50" : ""
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Poster */}
                <div className="flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden bg-bg-deep">
                  {result.poster_path ? (
                    <img
                      src={posterUrl(result.poster_path, "small")}
                      alt={getDisplayTitle(result)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#5c5954] text-xs font-display">
                      N/A
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-body text-sm font-medium text-[#e8e4dc] truncate">
                      {getDisplayTitle(result)}
                    </h3>
                    <span
                      className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider ${
                        result.media_type === "movie"
                          ? "bg-vr-blue/15 text-vr-blue"
                          : "bg-vr-violet/15 text-vr-violet"
                      }`}
                    >
                      {result.media_type === "movie" ? "Film" : "TV"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono-stats text-[11px] text-[#5c5954]">
                      {getYear(result)}
                    </span>
                    {result.vote_average > 0 && (
                      <>
                        <span className="text-[#5c5954]">·</span>
                        <span className="font-mono-stats text-[11px] text-vr-blue/70">
                          ★ {result.vote_average.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-[#5c5954] mt-0.5 truncate">
                    {getGenreNames(result.genre_ids).join(", ")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {inLibrary ? (
                    <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-display uppercase tracking-wider">
                      <Check size={14} /> Added
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => setSelectedResult(result)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider text-white transition-all hover:shadow-[0_0_10px_rgba(14,165,233,0.3)]"
                        style={{
                          background:
                            "linear-gradient(135deg, #0ea5e9, #0284c7)",
                        }}
                      >
                        <Plus size={14} /> Add
                      </button>
                      {!inWatchlist ? (
                        <button
                          onClick={() => addToWatchlist(result)}
                          disabled={addingToWatchlist === result.id}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border border-border-glow text-[#9a968e] hover:text-vr-violet hover:border-vr-violet/30 transition-all disabled:opacity-50"
                        >
                          <Bookmark size={14} />
                        </button>
                      ) : (
                        <span className="px-2 py-1.5 rounded-lg text-xs text-vr-violet/50">
                          <Bookmark size={14} className="fill-current" />
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty states */}
      {!loading && debouncedQuery.length >= 2 && results.length === 0 && (
        <div className="text-center py-16">
          <p className="font-body text-[#5c5954]">
            No results found for &ldquo;{debouncedQuery}&rdquo;
          </p>
        </div>
      )}

      {!debouncedQuery && (
        <div className="text-center py-16">
          <SearchIcon
            size={40}
            className="mx-auto text-[#5c5954]/30 mb-4"
          />
          <p className="font-body text-[#5c5954]">
            Search for films and TV shows to add to your collection
          </p>
        </div>
      )}

      {/* Add modal */}
      {selectedResult && (
        <AddModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
