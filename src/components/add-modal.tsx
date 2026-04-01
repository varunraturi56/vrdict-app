"use client";

import { useState, useEffect, useRef } from "react";
import { Star, RotateCcw, ChevronDown } from "lucide-react";
import {
  type TmdbSearchResult,
  type TmdbMovieDetail,
  type TmdbTvDetail,
  getDisplayTitle,
  getYear,
  posterUrl,
  normalizeGenres,
} from "@/lib/tmdb";
import { DEFAULT_TAGS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface AddModalProps {
  result: TmdbSearchResult;
  onClose: () => void;
  onAdded: (tmdbId: number, mediaType: string) => void;
  onAddToWatchlist?: (result: TmdbSearchResult) => void;
  isInWatchlist?: boolean;
}

export function AddModal({ result, onClose, onAdded, onAddToWatchlist, isInWatchlist }: AddModalProps) {
  const [detail, setDetail] = useState<TmdbMovieDetail | TmdbTvDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [myRating, setMyRating] = useState(7);
  const [yearWatched, setYearWatched] = useState(new Date().getFullYear().toString());
  const [tags, setTags] = useState<string[]>([]);
  const [recommended, setRecommended] = useState(false);
  const [rewatch, setRewatch] = useState(false);
  const [yearDropOpen, setYearDropOpen] = useState(false);
  const yearRef = useRef<HTMLDivElement>(null);

  const isMovie = result.media_type === "movie";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) setYearDropOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch full detail
  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(
          `/api/tmdb?action=detail&id=${result.id}&media_type=${result.media_type}`
        );
        const data = await res.json();
        setDetail(data);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [result.id, result.media_type]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => (currentYear - i).toString());

  function ratingColor(val: number): string {
    if (val <= 4) return "#ef4444";
    if (val <= 6) return "#ffb800";
    if (val <= 8) return "#0ea5e9";
    return "#39ff14";
  }

  async function handleSave() {
    if (!detail) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const movieDetail = detail as TmdbMovieDetail;
      const tvDetail = detail as TmdbTvDetail;

      const entry = {
        user_id: user.id,
        tmdb_id: result.id,
        media_type: result.media_type,
        title: isMovie ? movieDetail.title : tvDetail.name,
        year: (isMovie ? movieDetail.release_date : tvDetail.first_air_date)?.substring(0, 4) || null,
        genres: normalizeGenres((detail.genres || []).map((g) => g.name)),
        poster: detail.poster_path,
        overview: detail.overview,
        tmdb_rating: Math.round((detail.vote_average || 0) * 10) / 10,
        runtime: isMovie ? movieDetail.runtime : (tvDetail.episode_run_time?.[0] || 0),
        seasons: isMovie ? 0 : tvDetail.number_of_seasons || 0,
        episodes: isMovie ? 0 : tvDetail.number_of_episodes || 0,
        season_episode_counts: isMovie
          ? []
          : (tvDetail.seasons || [])
              .filter((s) => s.season_number > 0)
              .sort((a, b) => a.season_number - b.season_number)
              .map((s) => s.episode_count),
        imdb_id: isMovie
          ? movieDetail.imdb_id || movieDetail.external_ids?.imdb_id || null
          : tvDetail.external_ids?.imdb_id || null,
        my_rating: myRating,
        tags,
        recommended,
        rewatch,
        year_watched: yearWatched,
      };

      const { error } = await supabase.from("entries").insert(entry);
      if (!error) {
        onAdded(result.id, result.media_type);
      }
    } catch {
      // fail silently
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:px-40 lg:py-16">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-modal-backdrop" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border-glow bg-bg-card animate-modal-enter">
        <div className="h-px rounded-t-xl" style={{ background: "linear-gradient(90deg, transparent 5%, #38bdf8 30%, #a78bfa 70%, transparent 95%)" }} />
        <button onClick={onClose} className="absolute top-2.5 right-2.5 z-10 p-1 rounded-lg bg-bg-deep/50 text-[#5c5954] hover:text-[#e8e4dc] transition-colors text-xs">✕</button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-vr-blue/30 border-t-vr-blue rounded-full animate-spin" />
          </div>
        ) : detail ? (
          <div className="p-3">
            {/* Top: poster + info side by side */}
            <div className="flex gap-3 mb-2">
              <div className="flex-shrink-0 w-16 rounded-md overflow-hidden bg-bg-deep">
                {detail.poster_path ? (
                  <img src={posterUrl(detail.poster_path, "small")} alt={getDisplayTitle(result)} className="w-full aspect-[2/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[2/3] flex items-center justify-center text-[#5c5954] text-[9px]">No poster</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`inline-block px-1.5 py-px rounded text-[8px] font-display uppercase tracking-wider mb-0.5 ${isMovie ? "bg-vr-blue/15 text-vr-blue" : "bg-vr-violet/15 text-vr-violet"}`}>
                  {isMovie ? "Film" : "TV"}
                </span>
                <h2 className="font-display text-sm font-medium text-[#e8e4dc] tracking-wide leading-tight">{getDisplayTitle(result)}</h2>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[10px]">
                  <span className="font-mono-stats text-[#5c5954]">{getYear(result)}</span>
                  {isMovie && (detail as TmdbMovieDetail).runtime > 0 && (
                    <><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-[#5c5954]">{(detail as TmdbMovieDetail).runtime}m</span></>
                  )}
                  {!isMovie && (
                    <><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-[#5c5954]">{(detail as TmdbTvDetail).number_of_seasons}S·{(detail as TmdbTvDetail).number_of_episodes}E</span></>
                  )}
                  {detail.vote_average > 0 && (
                    <><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-vr-blue/70">TMDB {detail.vote_average.toFixed(1)}</span></>
                  )}
                  {(() => {
                    const imdbId = isMovie
                      ? (detail as TmdbMovieDetail).imdb_id || (detail as TmdbMovieDetail).external_ids?.imdb_id
                      : (detail as TmdbTvDetail).external_ids?.imdb_id;
                    return imdbId ? (
                      <a href={`https://www.imdb.com/title/${imdbId}`} target="_blank" rel="noopener noreferrer" className="text-vr-blue/50 hover:text-vr-blue transition-colors">IMDb ↗</a>
                    ) : null;
                  })()}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {detail.genres?.slice(0, 4).map((g) => (
                    <span key={g.id} className="px-1.5 py-px rounded-full text-[8px] font-display uppercase tracking-wider border border-border-glow text-[#9a968e]">{g.name}</span>
                  ))}
                </div>
              </div>
            </div>

            {detail.overview && <p className="text-[10px] text-[#9a968e] font-body leading-relaxed mb-2 line-clamp-2">{detail.overview}</p>}
            <div className="divider-gradient mb-2" />

            {/* Rating + Year Watched side by side */}
            <div className="flex gap-3 mb-2">
              <div className="flex-1">
                <label className="font-display text-[9px] uppercase tracking-wider text-[#9a968e] block mb-1">Your Rating</label>
                <div className="flex items-center gap-2">
                  <span className="font-mono-stats text-xl font-bold min-w-[2.5ch] text-center" style={{ color: ratingColor(myRating) }}>{myRating.toFixed(1)}</span>
                  <input type="range" min="1" max="10" step="0.5" value={myRating} onChange={(e) => setMyRating(parseFloat(e.target.value))} className="flex-1 h-1.5 rounded-full appearance-none bg-bg-deep cursor-pointer accent-vr-blue" />
                </div>
              </div>
              <div className="w-24 shrink-0" ref={yearRef}>
                <label className="font-display text-[9px] uppercase tracking-wider text-[#9a968e] block mb-1">Year Watched</label>
                <div className="relative">
                  <button
                    onClick={() => setYearDropOpen(!yearDropOpen)}
                    className="w-full h-7 rounded-md border border-vr-blue/20 bg-[#0e0e14] pl-2 pr-5 font-mono-stats text-[10px] text-vr-blue text-left cursor-pointer hover:bg-bg-deep/70 transition-all"
                    style={{ textShadow: "0 0 6px rgba(14,165,233,0.3)" }}
                  >
                    {yearWatched || "—"}
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-vr-blue/50 text-[8px]">{yearDropOpen ? "▲" : "▼"}</span>
                  </button>
                  {yearDropOpen && (
                    <div className="absolute top-full left-0 mt-1 z-30 w-full max-h-[160px] overflow-y-auto rounded-lg border border-border-glow/30 bg-[#0e0e14] shadow-2xl animate-drawer-enter tv-grid-scroll">
                      {years.map((y) => (
                        <button key={y} onClick={() => { setYearWatched(y); setYearDropOpen(false); }} className={`w-full text-left px-3 py-1.5 font-mono-stats text-[10px] transition-colors ${yearWatched === y ? "text-vr-blue bg-bg-deep/60" : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"}`} style={yearWatched === y ? { textShadow: "0 0 6px rgba(14,165,233,0.4)" } : undefined}>{y}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tags — compact */}
            <div className="mb-2">
              <label className="font-display text-[9px] uppercase tracking-wider text-[#9a968e] block mb-1">Tags</label>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <button key={tag} onClick={() => setTags(tags.filter((t) => t !== tag))} className="px-2 py-0.5 rounded-full text-[8px] font-display uppercase tracking-wider bg-vr-blue/15 text-vr-blue border border-vr-blue/20 hover:bg-vr-blue/25 transition-colors">{tag} ×</button>
                ))}
                {DEFAULT_TAGS.filter((t) => !tags.includes(t)).slice(0, 8).map((tag) => (
                  <button key={tag} onClick={() => setTags([...tags, tag])} className="px-2 py-0.5 rounded-full text-[8px] font-display uppercase tracking-wider border border-border-glow text-[#5c5954] hover:border-vr-blue/30 hover:text-vr-blue transition-colors">{tag}</button>
                ))}
              </div>
            </div>

            {/* Checkboxes + Actions in one row */}
            <div className="flex items-center gap-3 pt-2 border-t border-border-glow/30">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={recommended} onChange={(e) => setRecommended(e.target.checked)} className="sr-only" />
                <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center text-[8px] ${recommended ? "bg-vr-violet/20 border-vr-violet/40" : "border-border-glow bg-bg-deep/50"}`}>
                  {recommended && "⭐"}
                </div>
                <span className="font-display text-[9px] uppercase tracking-wider text-[#9a968e]">Fav</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} className="sr-only" />
                <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center text-[8px] ${rewatch ? "bg-vr-blue/20 border-vr-blue/40" : "border-border-glow bg-bg-deep/50"}`}>
                  {rewatch && "🔁"}
                </div>
                <span className="font-display text-[9px] uppercase tracking-wider text-[#9a968e]">Rewatch</span>
              </label>
              <div className="flex-1" />
              {onAddToWatchlist && !isInWatchlist && (
                <button
                  onClick={() => { onAddToWatchlist(result); onClose(); }}
                  className="px-2.5 h-7 rounded-md border border-vr-violet/20 text-vr-violet/60 font-display text-[9px] uppercase tracking-wider hover:bg-vr-violet/10 hover:text-vr-violet transition-colors"
                >
                  Watchlist
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 h-7 rounded-md font-display text-[9px] uppercase tracking-wider text-white disabled:opacity-50 hover:shadow-[0_0_12px_rgba(14,165,233,0.3)] transition-all"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
              >
                {saving ? "..." : "Add"}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="font-body text-[#5c5954]">Failed to load details</p>
          </div>
        )}
      </div>
    </div>
  );
}
