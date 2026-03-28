"use client";

import { useState, useEffect } from "react";
import { X, Star, RotateCcw } from "lucide-react";
import {
  type TmdbSearchResult,
  type TmdbMovieDetail,
  type TmdbTvDetail,
  getDisplayTitle,
  getYear,
  posterUrl,
} from "@/lib/tmdb";
import { DEFAULT_TAGS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface AddModalProps {
  result: TmdbSearchResult;
  onClose: () => void;
  onAdded: (tmdbId: number, mediaType: string) => void;
}

export function AddModal({ result, onClose, onAdded }: AddModalProps) {
  const [detail, setDetail] = useState<TmdbMovieDetail | TmdbTvDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [myRating, setMyRating] = useState(7);
  const [yearWatched, setYearWatched] = useState(
    new Date().getFullYear().toString()
  );
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [recommended, setRecommended] = useState(false);
  const [rewatch, setRewatch] = useState(false);

  const isMovie = result.media_type === "movie";

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

  // Year options (last 30 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) =>
    (currentYear - i).toString()
  );

  // Tag suggestions (filter out already applied)
  const allTags = [...DEFAULT_TAGS];
  const suggestions = allTags.filter(
    (t) =>
      !tags.includes(t) &&
      (!tagInput || t.toLowerCase().includes(tagInput.toLowerCase()))
  );

  function addTag(tag: string) {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  async function handleSave() {
    if (!detail) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const movieDetail = detail as TmdbMovieDetail;
      const tvDetail = detail as TmdbTvDetail;

      const entry = {
        user_id: user.id,
        tmdb_id: result.id,
        media_type: result.media_type,
        title: isMovie ? movieDetail.title : tvDetail.name,
        year:
          (isMovie
            ? movieDetail.release_date
            : tvDetail.first_air_date
          )?.substring(0, 4) || null,
        genres: (detail.genres || []).map((g) => g.name),
        poster: detail.poster_path,
        overview: detail.overview,
        tmdb_rating: Math.round((detail.vote_average || 0) * 10) / 10,
        runtime: isMovie
          ? movieDetail.runtime
          : tvDetail.episode_run_time?.[0] || 0,
        seasons: isMovie ? 0 : tvDetail.number_of_seasons || 0,
        episodes: isMovie ? 0 : tvDetail.number_of_episodes || 0,
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

  // Rating colour gradient (1=red → 10=green via amber)
  function ratingColor(val: number): string {
    if (val <= 4) return "#ef4444";
    if (val <= 6) return "#ffb800";
    if (val <= 8) return "#0ea5e9";
    return "#39ff14";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border-glow bg-bg-card animate-slide-in">
        {/* Top gradient line (matches original modal) */}
        <div
          className="h-px rounded-t-xl"
          style={{
            background:
              "linear-gradient(90deg, transparent 5%, #38bdf8 30%, #a78bfa 70%, transparent 95%)",
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-bg-deep/50 text-[#5c5954] hover:text-[#e8e4dc] transition-colors"
        >
          <X size={18} />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-vr-blue/30 border-t-vr-blue rounded-full animate-spin" />
          </div>
        ) : detail ? (
          <div className="p-5">
            {/* Header: poster + info */}
            <div className="flex gap-4 mb-5">
              <div className="flex-shrink-0 w-28 rounded-lg overflow-hidden bg-bg-deep">
                {detail.poster_path ? (
                  <img
                    src={posterUrl(detail.poster_path, "medium")}
                    alt={getDisplayTitle(result)}
                    className="w-full aspect-[2/3] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] flex items-center justify-center text-[#5c5954] text-xs">
                    No poster
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[9px] font-display uppercase tracking-wider mb-1 ${
                    isMovie
                      ? "bg-vr-blue/15 text-vr-blue"
                      : "bg-vr-violet/15 text-vr-violet"
                  }`}
                >
                  {isMovie ? "Film" : "TV"}
                </span>
                <h2 className="font-display text-lg font-medium text-[#e8e4dc] tracking-wide leading-tight">
                  {getDisplayTitle(result)}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="font-mono-stats text-xs text-[#5c5954]">
                    {getYear(result)}
                  </span>
                  {isMovie && (detail as TmdbMovieDetail).runtime > 0 && (
                    <>
                      <span className="text-[#5c5954]">·</span>
                      <span className="font-mono-stats text-xs text-[#5c5954]">
                        {(detail as TmdbMovieDetail).runtime} min
                      </span>
                    </>
                  )}
                  {!isMovie && (
                    <>
                      <span className="text-[#5c5954]">·</span>
                      <span className="font-mono-stats text-xs text-[#5c5954]">
                        {(detail as TmdbTvDetail).number_of_seasons}S ·{" "}
                        {(detail as TmdbTvDetail).number_of_episodes}E
                      </span>
                    </>
                  )}
                  {detail.vote_average > 0 && (
                    <>
                      <span className="text-[#5c5954]">·</span>
                      <span className="font-mono-stats text-xs text-vr-blue/70">
                        TMDB {detail.vote_average.toFixed(1)}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {detail.genres.map((g) => (
                    <span
                      key={g.id}
                      className="px-2 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider border border-border-glow text-[#9a968e]"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Overview */}
            {detail.overview && (
              <p className="text-xs text-[#9a968e] font-body leading-relaxed mb-5 line-clamp-3">
                {detail.overview}
              </p>
            )}

            <div className="divider-gradient mb-5" />

            {/* Rating slider */}
            <div className="mb-5">
              <label className="font-display text-[11px] uppercase tracking-wider text-[#9a968e] block mb-2">
                Your Rating
              </label>
              <div className="flex items-center gap-4">
                <span
                  className="font-mono-stats text-3xl font-bold min-w-[3ch] text-center"
                  style={{ color: ratingColor(myRating) }}
                >
                  {myRating.toFixed(1)}
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={myRating}
                  onChange={(e) => setMyRating(parseFloat(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-bg-deep cursor-pointer accent-vr-blue"
                />
              </div>
            </div>

            {/* Year watched */}
            <div className="mb-5">
              <label className="font-display text-[11px] uppercase tracking-wider text-[#9a968e] block mb-2">
                Year Watched
              </label>
              <select
                value={yearWatched}
                onChange={(e) => setYearWatched(e.target.value)}
                className="w-full h-10 rounded-lg border border-border-glow bg-bg-deep/50 px-3 font-mono-stats text-xs text-[#e8e4dc] focus:outline-none focus:border-vr-blue/40"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="mb-5">
              <label className="font-display text-[11px] uppercase tracking-wider text-[#9a968e] block mb-2">
                Tags
              </label>
              {/* Applied tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => removeTag(tag)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider bg-vr-blue/15 text-vr-blue border border-vr-blue/20 hover:bg-vr-blue/25 transition-colors"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              )}
              {/* Tag input */}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault();
                    addTag(tagInput.trim());
                  }
                }}
                placeholder="Type to filter or add custom tag..."
                className="w-full h-9 rounded-lg border border-border-glow bg-bg-deep/50 px-3 font-body text-xs text-[#e8e4dc] placeholder:text-[#5c5954]/50 focus:outline-none focus:border-vr-blue/40 mb-2"
              />
              {/* Suggested tags */}
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {suggestions.slice(0, 10).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="px-2 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider border border-border-glow text-[#5c5954] hover:text-[#9a968e] hover:border-vr-blue/20 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex gap-4 mb-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={recommended}
                  onChange={(e) => setRecommended(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${
                    recommended
                      ? "bg-vr-violet/20 border-vr-violet/40"
                      : "border-border-glow bg-bg-deep/50 group-hover:border-vr-violet/30"
                  }`}
                >
                  {recommended && (
                    <Star size={12} className="text-vr-violet fill-current" />
                  )}
                </div>
                <span className="font-display text-[11px] uppercase tracking-wider text-[#9a968e]">
                  Favourite
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rewatch}
                  onChange={(e) => setRewatch(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${
                    rewatch
                      ? "bg-vr-blue/20 border-vr-blue/40"
                      : "border-border-glow bg-bg-deep/50 group-hover:border-vr-blue/30"
                  }`}
                >
                  {rewatch && (
                    <RotateCcw size={12} className="text-vr-blue" />
                  )}
                </div>
                <span className="font-display text-[11px] uppercase tracking-wider text-[#9a968e]">
                  Rewatch
                </span>
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-11 rounded-lg border border-border-glow font-display text-sm uppercase tracking-wider text-[#5c5954] hover:text-[#9a968e] hover:bg-white/[0.02] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 rounded-lg font-display text-sm uppercase tracking-wider text-white transition-all disabled:opacity-50 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                }}
              >
                {saving ? "Adding..." : "Add to Collection"}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="font-body text-[#5c5954]">
              Failed to load details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
