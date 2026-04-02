"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { posterUrl } from "@/lib/tmdb";
import { DEFAULT_TAGS, type Entry } from "@/lib/types";

function ratingColor(val: number): string {
  if (val <= 4) return "#ef4444";
  if (val <= 6) return "#ffb800";
  if (val <= 8) return "#0ea5e9";
  return "#39ff14";
}

export function EntryDetailModal({
  entry, onClose, onUpdate, onDelete,
}: {
  entry: Entry;
  onClose: () => void;
  onUpdate: (updated: Entry) => void;
  onDelete: (id: string) => void;
}) {
  const [myRating, setMyRating] = useState(Number(entry.my_rating));
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [recommended, setRecommended] = useState(entry.recommended);
  const [rewatch, setRewatch] = useState(entry.rewatch);
  const [seasonsWatched, setSeasonsWatched] = useState(entry.seasons_watched > 0 ? entry.seasons_watched : (entry.media_type === "tv" ? entry.seasons : 0));
  const [yearWatched, setYearWatched] = useState(entry.year_watched || "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [yearDropOpen, setYearDropOpen] = useState(false);
  const [seasonDropOpen, setSeasonDropOpen] = useState(false);
  const yearRef = useRef<HTMLDivElement>(null);
  const seasonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) setYearDropOpen(false);
      if (seasonRef.current && !seasonRef.current.contains(e.target as Node)) setSeasonDropOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isMovie = entry.media_type === "movie";
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => (currentYear - i).toString());

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("entries")
      .update({ my_rating: myRating, tags, recommended, rewatch, seasons_watched: seasonsWatched, year_watched: yearWatched || null })
      .eq("id", entry.id).select().single();
    if (!error && data) onUpdate(data as Entry);
    else onClose();
    setSaving(false);
  }

  async function handleDelete() {
    const supabase = createClient();
    await supabase.from("entries").delete().eq("id", entry.id);
    onDelete(entry.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:px-40 lg:py-16">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-modal-backdrop" onClick={onClose} />
      <div className="relative w-full max-w-lg lg:max-w-2xl rounded-xl border border-border-glow bg-bg-card animate-modal-enter">
        <div className="h-px rounded-t-xl" style={{ background: "linear-gradient(90deg, transparent 5%, #38bdf8 30%, #a78bfa 70%, transparent 95%)" }} />
        <button onClick={onClose} className="absolute top-2.5 right-2.5 z-10 p-1 rounded-lg bg-bg-deep/50 text-[#5c5954] hover:text-[#e8e4dc] transition-colors text-xs">✕</button>

        <div className="p-3">
          {/* Top: poster + info side by side */}
          <div className="flex gap-3 mb-2">
            <div className="flex-shrink-0 w-16 lg:w-20 rounded-md overflow-hidden bg-bg-deep">
              {entry.poster ? (
                <img src={posterUrl(entry.poster, "small")} alt={entry.title} className="w-full aspect-[2/3] object-cover" />
              ) : (
                <div className="w-full aspect-[2/3] flex items-center justify-center text-[#5c5954] text-[9px]">No poster</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className={`inline-block px-1.5 py-px rounded text-[8px] font-display uppercase tracking-wider mb-0.5 ${isMovie ? "bg-vr-blue/15 text-vr-blue" : "bg-vr-violet/15 text-vr-violet"}`}>
                {isMovie ? "Film" : "TV"}
              </span>
              <h2 className="font-display text-sm font-medium text-[#e8e4dc] tracking-wide leading-tight">{entry.title}</h2>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[10px]">
                <span className="font-mono-stats text-[#5c5954]">{entry.year}</span>
                {isMovie && entry.runtime ? (<><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-[#5c5954]">{entry.runtime}m</span></>) : null}
                {!isMovie && (<><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-[#5c5954]">{entry.seasons}S·{entry.episodes}E</span></>)}
                {entry.tmdb_rating && (<><span className="text-[#5c5954]">·</span><span className="font-mono-stats text-vr-blue/70">TMDB {Number(entry.tmdb_rating).toFixed(1)}</span></>)}
                {entry.imdb_id && (
                  <a href={`https://www.imdb.com/title/${entry.imdb_id}`} target="_blank" rel="noopener noreferrer" className="text-vr-blue/50 hover:text-vr-blue transition-colors">IMDb ↗</a>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {entry.genres?.slice(0, 4).map((g) => (
                  <span key={g} className="px-1.5 py-px rounded-full text-[8px] font-display uppercase tracking-wider border border-border-glow text-[#9a968e]">{g}</span>
                ))}
              </div>
            </div>
          </div>

          {entry.overview && <p className="text-[10px] lg:text-[11px] text-[#9a968e] font-body leading-relaxed mb-2 line-clamp-2 lg:line-clamp-none">{entry.overview}</p>}
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
                    <button onClick={() => { setYearWatched(""); setYearDropOpen(false); }} className={`w-full text-left px-3 py-1.5 font-mono-stats text-[10px] transition-colors ${!yearWatched ? "text-vr-blue bg-bg-deep/60" : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"}`}>—</button>
                    {years.map((y) => (
                      <button key={y} onClick={() => { setYearWatched(y); setYearDropOpen(false); }} className={`w-full text-left px-3 py-1.5 font-mono-stats text-[10px] transition-colors ${yearWatched === y ? "text-vr-blue bg-bg-deep/60" : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"}`} style={yearWatched === y ? { textShadow: "0 0 6px rgba(14,165,233,0.4)" } : undefined}>{y}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isMovie && entry.seasons > 0 && (
            <div className="mb-2">
              <label className="font-display text-[9px] uppercase tracking-wider text-[#9a968e] block mb-1">Seasons Watched <span className="text-[#5c5954] normal-case tracking-normal">({entry.seasons} total)</span></label>
              <div className="relative" ref={seasonRef}>
                <button
                  onClick={() => setSeasonDropOpen(!seasonDropOpen)}
                  className="w-full h-7 rounded-md border border-vr-violet/20 bg-[#0e0e14] pl-2 pr-5 font-mono-stats text-[10px] text-vr-violet text-left cursor-pointer hover:bg-bg-deep/70 transition-all"
                  style={{ textShadow: "0 0 6px rgba(139,92,246,0.3)" }}
                >
                  {seasonsWatched} of {entry.seasons}
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-vr-violet/50 text-[8px]">{seasonDropOpen ? "▲" : "▼"}</span>
                </button>
                {seasonDropOpen && (
                  <div className="absolute top-full left-0 mt-1 z-30 w-full max-h-[120px] overflow-y-auto rounded-lg border border-border-glow/30 bg-[#0e0e14] shadow-2xl animate-drawer-enter tv-grid-scroll">
                    {Array.from({ length: entry.seasons }, (_, i) => i + 1).map((s) => (
                      <button key={s} onClick={() => { setSeasonsWatched(s); setSeasonDropOpen(false); }} className={`w-full text-left px-3 py-1.5 font-mono-stats text-[10px] transition-colors ${seasonsWatched === s ? "text-vr-violet bg-bg-deep/60" : "text-[#5c5954] hover:text-[#9a968e] hover:bg-bg-deep/30"}`} style={seasonsWatched === s ? { textShadow: "0 0 6px rgba(139,92,246,0.4)" } : undefined}>{s} of {entry.seasons}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="px-2.5 h-7 rounded-md border border-red-500/20 text-red-400/60 font-display text-[9px] uppercase tracking-wider hover:bg-red-500/10 hover:text-red-400 transition-colors">Remove</button>
            ) : (
              <button onClick={handleDelete} className="px-2.5 h-7 rounded-md bg-red-500/20 border border-red-500/30 text-red-400 font-display text-[9px] uppercase tracking-wider">Confirm</button>
            )}
            <button onClick={handleSave} disabled={saving} className="px-4 h-7 rounded-md font-display text-[9px] uppercase tracking-wider text-white disabled:opacity-50 hover:shadow-[0_0_12px_rgba(14,165,233,0.3)] transition-all" style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}>
              {saving ? "..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
