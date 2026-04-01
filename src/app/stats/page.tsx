"use client";

import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BarChart3, Trophy, ChevronLeft, Eye, ArrowLeftRight } from "lucide-react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter,
  ResponsiveContainer,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useEntries } from "@/lib/entries-context";
import { posterUrl } from "@/lib/tmdb";
import type { Entry } from "@/lib/types";
import { TvFrame } from "@/components/ui/tv-frame";
import { LedBars } from "@/components/ui/led-bar";
import { PreviewBar } from "@/components/ui/preview-bar";
import { PAGE_GLOWS } from "@/lib/ambient-colors";

const CHART_COLORS = [
  "#0ea5e9", "#38bdf8", "#0284c7", "#a78bfa", "#c4b5fd",
  "#8b5cf6", "#06b6d4", "#7dd3fc", "#818cf8", "#67e8f9",
];

export default function StatsPage() {
  return <Suspense><StatsContent /></Suspense>;
}

function StatsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get("view"); // "visualise" | "top-tens" | null (category)

  const { entries, loading, updateEntry: ctxUpdateEntry } = useEntries();
  const [tvOn, setTvOn] = useState(true);
  const [timeUnit, setTimeUnit] = useState<"hours" | "days">("hours");
  const [mediaFilter, setMediaFilter] = useState<"all" | "movies" | "tv">("all");
  const [genreModal, setGenreModal] = useState<string | null>(null);
  const [peekedEntry, setPeekedEntry] = useState<Entry | null>(null);
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);

  const flow = view === "visualise" ? "visualise" : view === "top-tens" ? "top-tens" : "category";

  function navigate(v: string | null) {
    if (v) router.push(`/stats?view=${v}`, { scroll: false });
    else router.push("/stats", { scroll: false });
  }

  // TV show enrichment — fill missing season_episode_counts from TMDB
  const enrichedRef = useRef(false);
  useEffect(() => {
    if (loading || enrichedRef.current) return;
    enrichedRef.current = true;
    const tvNeedsFill = entries.filter(
      (e) => e.media_type === "tv" && (!e.season_episode_counts || e.season_episode_counts.length === 0) && e.tmdb_id
    );
    if (tvNeedsFill.length === 0) return;
    (async () => {
      const supabase = createClient();
      for (const entry of tvNeedsFill) {
        try {
          const res = await fetch(`/api/tmdb?action=detail&id=${entry.tmdb_id}&media_type=tv`);
          if (!res.ok) continue;
          const detail = await res.json();
          const counts = (detail.seasons || []).filter((s: { season_number: number }) => s.season_number > 0).sort((a: { season_number: number }, b: { season_number: number }) => a.season_number - b.season_number).map((s: { episode_count: number }) => s.episode_count);
          if (counts.length > 0) {
            const epRuntime = detail.episode_run_time?.[0] || 0;
            await supabase.from("entries").update({ season_episode_counts: counts, ...(epRuntime && !entry.runtime ? { runtime: epRuntime } : {}) }).eq("id", entry.id);
            ctxUpdateEntry({ ...entry, season_episode_counts: counts, runtime: entry.runtime || epRuntime });
          }
        } catch { /* skip */ }
      }
    })();
  }, [loading, entries, ctxUpdateEntry]);

  const movies = useMemo(() => entries.filter((e) => e.media_type === "movie"), [entries]);
  const tvShows = useMemo(() => entries.filter((e) => e.media_type === "tv"), [entries]);

  const movieMin = useMemo(() => movies.reduce((s, e) => s + (e.runtime || 0), 0), [movies]);
  const tvMin = useMemo(() => tvShows.reduce((s, e) => {
    if (!e.seasons || !e.episodes) return s;
    const epRuntime = e.runtime || 45;
    const sw = e.seasons_watched > 0 ? e.seasons_watched : e.seasons;
    const epsWatched = e.season_episode_counts?.length ? e.season_episode_counts.slice(0, sw).reduce((sum, c) => sum + c, 0) : Math.round((e.episodes / e.seasons) * sw);
    return s + (epsWatched * epRuntime);
  }, 0), [tvShows]);

  const filteredMin = mediaFilter === "movies" ? movieMin : mediaFilter === "tv" ? tvMin : movieMin + tvMin;
  const hrs = Math.round(filteredMin / 60);
  const days = (filteredMin / 1440).toFixed(1);

  // Collection filter for count + avg rating
  const collectionEntries = useMemo(() => {
    if (mediaFilter === "movies") return movies;
    if (mediaFilter === "tv") return tvShows;
    return entries;
  }, [mediaFilter, movies, tvShows, entries]);
  const avgRating = useMemo(() => {
    if (mediaFilter !== "all") {
      return collectionEntries.length > 0 ? (collectionEntries.reduce((s, e) => s + e.my_rating, 0) / collectionEntries.length).toFixed(1) : "0";
    }
    const movieAvg = movies.length > 0 ? movies.reduce((s, e) => s + e.my_rating, 0) / movies.length : 0;
    const tvAvg = tvShows.length > 0 ? tvShows.reduce((s, e) => s + e.my_rating, 0) / tvShows.length : 0;
    const count = (movies.length > 0 ? 1 : 0) + (tvShows.length > 0 ? 1 : 0);
    return count > 0 ? ((movieAvg + tvAvg) / count).toFixed(1) : "0";
  }, [mediaFilter, collectionEntries, movies, tvShows]);

  // Genre data uses collection filter so doughnut, top genre, etc. all respect Films/TV filter
  const genreCounts: Record<string, number> = {};
  collectionEntries.forEach((e) => (e.genres || []).forEach((g) => { genreCounts[g] = (genreCounts[g] || 0) + 1; }));
  const genreData = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  const topGenre = genreData[0];

  const ratingDist: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) ratingDist[i] = 0;
  entries.forEach((e) => { const r = Math.round(e.my_rating); if (r >= 1 && r <= 10) ratingDist[r]++; });
  const ratingData = Object.entries(ratingDist).map(([rating, count]) => ({ rating, count }));

  const scatterData = entries.filter((e) => e.tmdb_rating && e.tmdb_rating > 0).map((e) => ({ x: e.tmdb_rating!, y: e.my_rating, title: e.title }));

  const decadeCounts: Record<string, number> = {};
  entries.forEach((e) => { if (e.year) { const d = Math.floor(parseInt(e.year) / 10) * 10 + "s"; decadeCounts[d] = (decadeCounts[d] || 0) + 1; } });
  const decadeData = Object.entries(decadeCounts).sort((a, b) => a[0].localeCompare(b[0])).map(([decade, count]) => ({ decade, count }));

  const topMovies = useMemo(() => [...movies].sort((a, b) => b.my_rating - a.my_rating).slice(0, 10), [movies]);
  const topTv = useMemo(() => [...tvShows].sort((a, b) => b.my_rating - a.my_rating).slice(0, 10), [tvShows]);

  const genreEntries = useMemo(() => {
    if (!genreModal) return [];
    return entries.filter((e) => e.genres?.includes(genreModal)).sort((a, b) => b.my_rating - a.my_rating);
  }, [genreModal, entries]);

  const displayEntry = peekedEntry || topMovies[0] || entries[0] || null;

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" /></div>;
  if (entries.length === 0) return <div className="flex flex-col items-center justify-center min-h-[60vh]"><BarChart3 size={36} className="text-teal-400/20 mb-4" /><p className="font-display text-sm uppercase tracking-wider text-[#5c5954]">No Stats Yet</p></div>;

  const ttStyle = { background: "#16161e", border: "1px solid #2a2a34", borderRadius: 8, fontSize: 11 };
  const ttItem = { color: "#e8e4dc" };
  const CH = 152;
  const GOLD = "255,184,0";

  // Filter pill helper — accent param for teal vs violet cards
  const filterPill = (label: string, value: string, current: string, setter: (v: "all" | "movies" | "tv") => void, accent: "teal" | "violet" = "teal") => (
    <button onClick={() => setter(value as "all" | "movies" | "tv")} className={`px-1 py-px rounded text-[6px] font-display uppercase tracking-wider transition-colors ${current === value ? (accent === "teal" ? "text-teal-400 bg-teal-400/15" : "text-vr-violet bg-vr-violet/15") : "text-[#5c5954] hover:text-[#9a968e]"}`}>{label}</button>
  );

  // ─── Visualise ───
  const visualiseContent = (
    <div className="h-full flex flex-col p-2.5">
      <button onClick={() => navigate(null)} className="flex items-center gap-1 text-[#5c5954] hover:text-[#e8e4dc] transition-colors mb-1.5 shrink-0">
        <ChevronLeft size={14} /><span className="font-display text-[9px] uppercase tracking-wider">Back</span>
      </button>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-2 mb-2 shrink-0">
        <div className="px-3 py-2 rounded-lg border border-teal-400/15 bg-teal-400/[0.04]">
          <div className="flex items-center justify-between">
            <p className="font-display text-[7px] uppercase tracking-[2px] text-[#5c5954]">Collection</p>
            <div className="flex gap-0.5">
              {filterPill("All", "all", mediaFilter, setMediaFilter)}
              {filterPill("Films", "movies", mediaFilter, setMediaFilter)}
              {filterPill("TV", "tv", mediaFilter, setMediaFilter)}
            </div>
          </div>
          <p className="font-mono-stats text-xl font-bold text-teal-400 leading-tight">{collectionEntries.length}</p>
          <p className="font-mono-stats text-[9px] text-[#5c5954]">{movies.length} films · {tvShows.length} shows</p>
        </div>
        <div className="px-3 py-2 rounded-lg border border-teal-400/15 bg-teal-400/[0.04] relative">
          <div className="flex items-center justify-between">
            <p className="font-display text-[7px] uppercase tracking-[2px] text-[#5c5954]">Watch Time</p>
            <div className="flex gap-0.5">
              {filterPill("All", "all", mediaFilter, setMediaFilter)}
              {filterPill("Films", "movies", mediaFilter, setMediaFilter)}
              {filterPill("TV", "tv", mediaFilter, setMediaFilter)}
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="font-mono-stats text-xl font-bold text-teal-400 leading-tight">{timeUnit === "hours" ? hrs.toLocaleString() : days}</p>
            <p className="font-mono-stats text-[10px] text-teal-400/60">{timeUnit === "hours" ? "hrs" : "days"}</p>
          </div>
          <button onClick={() => setTimeUnit((u) => u === "hours" ? "days" : "hours")} className="absolute bottom-1.5 right-2 text-[#5c5954] hover:text-teal-400 transition-colors" title="Switch units">
            <ArrowLeftRight size={10} />
          </button>
        </div>
        <div className="px-3 py-2 rounded-lg border border-vr-violet/15 bg-vr-violet/[0.04]">
          <div className="flex items-center justify-between">
            <p className="font-display text-[7px] uppercase tracking-[2px] text-[#5c5954]">Avg Rating</p>
            <div className="flex gap-0.5">
              {filterPill("All", "all", mediaFilter, setMediaFilter, "violet")}
              {filterPill("Films", "movies", mediaFilter, setMediaFilter, "violet")}
              {filterPill("TV", "tv", mediaFilter, setMediaFilter, "violet")}
            </div>
          </div>
          <div className="flex items-baseline gap-0.5">
            <p className="font-mono-stats text-xl font-bold text-vr-violet leading-tight">{avgRating}</p>
            <p className="font-mono-stats text-[10px] text-vr-violet/50">/ 10</p>
          </div>
        </div>
        <div className="px-3 py-2 rounded-lg border border-vr-violet/15 bg-vr-violet/[0.04]">
          <div className="flex items-center justify-between">
            <p className="font-display text-[7px] uppercase tracking-[2px] text-[#5c5954]">Top Genre</p>
            <div className="flex gap-0.5">
              {filterPill("All", "all", mediaFilter, setMediaFilter, "violet")}
              {filterPill("Films", "movies", mediaFilter, setMediaFilter, "violet")}
              {filterPill("TV", "tv", mediaFilter, setMediaFilter, "violet")}
            </div>
          </div>
          <p className={`font-display font-bold text-vr-violet leading-tight ${(topGenre?.name.length || 0) > 8 ? "text-sm" : "text-lg"}`}>{topGenre?.name || "—"}</p>
          <p className="font-mono-stats text-[9px] text-[#5c5954]">{topGenre ? `${topGenre.value} titles` : ""}</p>
        </div>
      </div>

      {/* Charts 2×2 — each box is a flex column so chart fills and centers */}
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        {/* Genre doughnut */}
        <div className="rounded-lg border border-teal-400/15 bg-[#0c0c10] px-2 py-1.5 flex flex-col min-h-0">
          <p className="font-display text-[7px] uppercase tracking-[1.5px] text-teal-400/60 shrink-0">Genre Breakdown <span className="text-[#5c5954] normal-case tracking-normal">(click to explore)</span></p>
          <div className="flex-1 min-h-0 relative">
            {genreData.length > 0 ? (
              <div className="absolute inset-0 flex">
                <div className="w-[75%] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genreData} cx="42%" cy="50%" innerRadius="34%" outerRadius="55%" dataKey="value" paddingAngle={2} stroke="none" cursor="pointer"
                        onClick={(_, i) => setGenreModal(genreData[i]?.name || null)}
                        onMouseEnter={(_, i) => setHoveredGenre(genreData[i]?.name || null)}
                        onMouseLeave={() => setHoveredGenre(null)}
                      >
                        {genreData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={ttStyle} itemStyle={ttItem} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-[25%] flex flex-col justify-center gap-1">
                  {genreData.slice(0, 8).map((g, i) => (
                    <span key={g.name} className="text-[11px] leading-tight transition-all duration-200"
                      style={{
                        color: hoveredGenre === g.name ? "#fff" : CHART_COLORS[i],
                        fontWeight: hoveredGenre === g.name ? "bold" : "normal",
                      }}
                    >{g.name} <span style={{ color: hoveredGenre === g.name ? "#ccc" : "#5c5954" }}>({g.value})</span></span>
                  ))}
                </div>
              </div>
            ) : <div className="absolute inset-0 flex items-center justify-center"><span className="text-[9px] text-[#5c5954]">No data</span></div>}
          </div>
        </div>

        {/* Rating distribution */}
        <div className="rounded-lg border border-teal-400/15 bg-[#0c0c10] px-2 py-1.5 flex flex-col min-h-0">
          <p className="font-display text-[7px] uppercase tracking-[1.5px] text-teal-400/60 shrink-0">Rating Distribution</p>
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingData} margin={{ top: 5, right: 5, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a22" />
                  <XAxis dataKey="rating" tick={{ fill: "#5c5954", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#5c5954", fontSize: 8 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ttStyle} itemStyle={ttItem} labelFormatter={(l) => `Rating: ${l}/10`} />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Scatter */}
        <div className="rounded-lg border border-vr-violet/15 bg-[#0c0c10] px-2 py-1.5 flex flex-col min-h-0">
          <p className="font-display text-[7px] uppercase tracking-[1.5px] text-vr-violet/60 shrink-0">Your Rating vs TMDB</p>
          <div className="flex-1 min-h-0 relative">
            {scatterData.length > 1 ? (
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 5, right: 5, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a22" />
                    <XAxis type="number" dataKey="x" domain={[0, 10]} tick={{ fill: "#5c5954", fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="y" domain={[0, 10]} tick={{ fill: "#5c5954", fontSize: 8 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={ttStyle} itemStyle={ttItem}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(_: any, _n: any, p: any) => { const d = p?.payload; return d ? [`You: ${d.y} · TMDB: ${d.x}`, d.title] : ""; }}
                    />
                    <Scatter data={scatterData} fill="rgba(139,92,246,0.5)" stroke="#8b5cf6" strokeWidth={1} r={3} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="absolute inset-0 flex items-center justify-center"><span className="text-[9px] text-[#5c5954]">Need more data</span></div>}
          </div>
        </div>

        {/* Decade */}
        <div className="rounded-lg border border-vr-violet/15 bg-[#0c0c10] px-2 py-1.5 flex flex-col min-h-0">
          <p className="font-display text-[7px] uppercase tracking-[1.5px] text-vr-violet/60 shrink-0">Titles by Decade</p>
          <div className="flex-1 min-h-0 relative">
            {decadeData.length > 0 ? (
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={decadeData} margin={{ top: 5, right: 5, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a22" />
                    <XAxis dataKey="decade" tick={{ fill: "#5c5954", fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#5c5954", fontSize: 8 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={ttStyle} itemStyle={ttItem} />
                    <Bar dataKey="count" fill="#a78bfa" radius={[3, 3, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="absolute inset-0 flex items-center justify-center"><span className="text-[9px] text-[#5c5954]">No data</span></div>}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Top Tens (golden theme, centered vertically) ───
  const ROW_H = 185;
  const topTensContent = (
    <div className="h-full flex flex-col justify-center p-3">
      <button onClick={() => navigate(null)} className="flex items-center gap-1 text-[#5c5954] hover:text-[#e8e4dc] transition-colors mb-2 shrink-0 absolute top-3 left-3">
        <ChevronLeft size={14} /><span className="font-display text-[9px] uppercase tracking-wider">Back</span>
      </button>

      <div className="mb-3">
        <p className="font-display text-[10px] uppercase tracking-wider mb-1.5" style={{ color: `rgb(${GOLD})`, textShadow: `0 0 8px rgba(${GOLD},0.4)` }}>Top 10 Movies</p>
        <div className="flex gap-1" style={{ height: ROW_H }}>
          {topMovies.map((e, i) => (
            <div key={e.id} className="flex-1 min-w-0 h-full relative group cursor-pointer animate-slide-in" style={{ animationDelay: `${i * 40}ms` }} onMouseEnter={() => setPeekedEntry(e)}>
              <div className="h-full rounded-md overflow-hidden bg-bg-deep" style={{ border: `1px solid rgba(${GOLD},0.1)` }}>
                {e.poster ? <img src={posterUrl(e.poster, "small")} alt={e.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-[#5c5954] text-[7px] font-display p-0.5 text-center">{e.title}</div>}
              </div>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${i < 3 ? "text-black" : "text-[#9a968e] bg-[#1e1e26]"}`} style={i < 3 ? { background: `linear-gradient(135deg, rgb(${GOLD}), #b8860b)` } : undefined}>{i + 1}</span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-end p-1">
                <div><p className="font-display text-[7px] text-white leading-tight truncate">{e.title}</p><p className="font-mono-stats text-[8px] font-bold" style={{ color: `rgb(${GOLD})` }}>{e.my_rating}/10</p></div>
              </div>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 10 - topMovies.length) }).map((_, i) => <div key={`em-${i}`} className="flex-1 min-w-0 h-full"><div className="h-full rounded-md bg-bg-deep/30" style={{ border: `1px solid rgba(${GOLD},0.05)` }} /></div>)}
        </div>
      </div>

      <div>
        <p className="font-display text-[10px] uppercase tracking-wider mb-1.5" style={{ color: `rgb(${GOLD})`, textShadow: `0 0 8px rgba(${GOLD},0.4)` }}>Top 10 TV Shows</p>
        <div className="flex gap-1" style={{ height: ROW_H }}>
          {topTv.map((e, i) => (
            <div key={e.id} className="flex-1 min-w-0 h-full relative group cursor-pointer animate-slide-in" style={{ animationDelay: `${i * 40 + 200}ms` }} onMouseEnter={() => setPeekedEntry(e)}>
              <div className="h-full rounded-md overflow-hidden bg-bg-deep" style={{ border: `1px solid rgba(${GOLD},0.1)` }}>
                {e.poster ? <img src={posterUrl(e.poster, "small")} alt={e.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-[#5c5954] text-[7px] font-display p-0.5 text-center">{e.title}</div>}
              </div>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${i < 3 ? "text-black" : "text-[#9a968e] bg-[#1e1e26]"}`} style={i < 3 ? { background: `linear-gradient(135deg, rgb(${GOLD}), #b8860b)` } : undefined}>{i + 1}</span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-end p-1">
                <div><p className="font-display text-[7px] text-white leading-tight truncate">{e.title}</p><p className="font-mono-stats text-[8px] font-bold" style={{ color: `rgb(${GOLD})` }}>{e.my_rating}/10</p></div>
              </div>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 10 - topTv.length) }).map((_, i) => <div key={`et-${i}`} className="flex-1 min-w-0 h-full"><div className="h-full rounded-md bg-bg-deep/30" style={{ border: `1px solid rgba(${GOLD},0.05)` }} /></div>)}
        </div>
      </div>
    </div>
  );

  const desktopTvContent = flow === "category" ? <StatsCategorySelect onSelect={navigate} /> : flow === "visualise" ? visualiseContent : topTensContent;

  return (
    <div className="px-4 pt-1 pb-0 flex flex-col flex-1 min-h-0 overflow-hidden lg:px-5 lg:pt-3 lg:pb-0 lg:overflow-hidden">

      {/* ═══ MOBILE ═══ */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0 overflow-y-auto pb-20 pt-3">
        <div className="flex justify-center mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("visualise")} className={`px-5 py-1.5 rounded-[20px] text-xs font-display uppercase tracking-wider transition-all ${flow === "visualise" || flow === "category" ? "text-white bg-gradient-to-r from-teal-500 to-teal-600" : "text-[#5c5954]"}`}>Visualise</button>
            <button onClick={() => navigate("top-tens")} className={`px-5 py-1.5 rounded-[20px] text-xs font-display uppercase tracking-wider transition-all ${flow === "top-tens" ? "text-white bg-gradient-to-r from-amber-500 to-amber-600" : "text-[#5c5954]"}`}>Top Tens</button>
          </div>
        </div>
        {(flow === "visualise" || flow === "category") && (
          <div className="space-y-3 px-1">
            {/* Mobile media filter */}
            <div className="flex justify-center gap-1.5">
              {(["all", "movies", "tv"] as const).map((v) => (
                <button key={v} onClick={() => setMediaFilter(v)} className={`px-3.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-all ${mediaFilter === v ? "text-white bg-gradient-to-r from-teal-500 to-teal-600" : "text-[#5c5954] border border-border-glow"}`}>
                  {v === "all" ? "All" : v === "movies" ? "Films" : "TV"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MobileStatCard label="Total Watched" value={String(collectionEntries.length)} sub={`${movies.length} films · ${tvShows.length} shows`} />
              <MobileStatCard label="Watch Time" value={timeUnit === "hours" ? `${hrs.toLocaleString()} hrs` : `${days} days`} sub="" />
              <MobileStatCard label="Avg. Rating" value={`${avgRating} / 10`} sub="" />
              <MobileStatCard label="Top Genre" value={topGenre?.name || "—"} sub={topGenre ? `${topGenre.value} titles` : ""} />
            </div>
            <MobileChartBox title="Genre Breakdown">
              <div className="flex items-center gap-3">
                <div className="shrink-0" style={{ width: 150, height: 150 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={genreData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2} stroke="none" cursor="pointer" onClick={(_, i) => setGenreModal(genreData[i]?.name || null)}>{genreData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={ttStyle} itemStyle={ttItem} /></PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  {genreData.map((g, i) => (
                    <div key={g.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="font-display text-[9px] uppercase tracking-wider text-[#e8e4dc] truncate">{g.name}</span>
                      <span className="font-mono-stats text-[8px] text-[#5c5954] ml-auto shrink-0">{g.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </MobileChartBox>
            <MobileChartBox title="Rating Distribution">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ratingData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}><CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" /><XAxis dataKey="rating" tick={{ fill: "#5c5954", fontSize: 10 }} axisLine={false} /><YAxis allowDecimals={false} tick={{ fill: "#5c5954", fontSize: 10 }} axisLine={false} /><Tooltip contentStyle={ttStyle} itemStyle={ttItem} /><Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={28} /></BarChart>
              </ResponsiveContainer>
            </MobileChartBox>
            <MobileChartBox title="Your Rating vs TMDB">
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart margin={{ top: 5, right: 5, bottom: 0, left: -12 }}><CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" /><XAxis type="number" dataKey="x" name="TMDB" domain={[0, 10]} tick={{ fill: "#5c5954", fontSize: 10 }} axisLine={false} /><YAxis type="number" dataKey="y" name="You" domain={[0, 10]} tick={{ fill: "#5c5954", fontSize: 10 }} axisLine={false} /><Tooltip contentStyle={ttStyle} itemStyle={ttItem} formatter={(v, name) => [Number(v).toFixed(1), name === "x" ? "TMDB" : "You"]} /><Scatter data={scatterData} fill="rgba(139,92,246,0.5)" stroke="#8b5cf6" strokeWidth={1} r={3} /></ScatterChart>
              </ResponsiveContainer>
            </MobileChartBox>
            <MobileChartBox title="Titles by Decade">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={decadeData} margin={{ top: 5, right: 5, bottom: 0, left: -18 }}><CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" /><XAxis dataKey="decade" tick={{ fill: "#5c5954", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "#5c5954", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={ttStyle} itemStyle={ttItem} /><Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={28} /></BarChart>
              </ResponsiveContainer>
            </MobileChartBox>
          </div>
        )}
        {flow === "top-tens" && (
          <div className="space-y-4 px-1">
            <MobileTopRated title="Top 10 Movies" items={topMovies} />
            <MobileTopRated title="Top 10 TV Shows" items={topTv} />
          </div>
        )}
      </div>

      {/* ═══ DESKTOP ═══ */}
      <div className="hidden lg:flex lg:flex-col flex-1 min-h-0 relative">
        <LedBars />
        <TvFrame isOn={tvOn} onPowerToggle={() => setTvOn(!tvOn)}>
          {desktopTvContent}
        </TvFrame>
        <div className="hidden lg:block px-32"><div className="tv-stand"><div className="tv-stand-neck" /><div className="tv-stand-base" /></div></div>
        <PreviewBar entry={flow !== "category" ? displayEntry : null} onEdit={() => {}} isOn={tvOn} />
      </div>

      {genreModal && <GenreModal genre={genreModal} entries={genreEntries} onClose={() => setGenreModal(null)} />}
    </div>
  );
}

/* ── Category Select ── */
function StatsCategorySelect({ onSelect }: { onSelect: (v: string) => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 500);
    const t3 = setTimeout(() => setPhase(3), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  const rgb1 = "45,212,191";
  const rgb2 = "255,184,0";
  const card = "group relative flex flex-col items-center justify-center w-[160px] lg:w-[190px] h-[240px] lg:h-[280px] rounded-2xl cursor-pointer hover:w-[185px] lg:hover:w-[220px] hover:h-[260px] lg:hover:h-[300px]";
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 lg:px-16">
      <div className={`text-center mb-10 lg:mb-14 transition-all duration-700 ease-out ${phase >= 1 ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4"}`}>
        <div className="flex items-center justify-center gap-3 mb-1">
          <BarChart3 size={36} className="text-teal-400" style={{ filter: "drop-shadow(0 0 8px rgba(45,212,191,0.5))" }} />
          <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-[0.15em] text-teal-400">Stats</h2>
        </div>
        <p className={`font-body text-sm text-[#5c5954] mt-3 tracking-[0.2em] uppercase transition-all duration-600 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>Choose what to browse</p>
      </div>
      <div className="flex gap-5 lg:gap-8">
        <button onClick={() => onSelect("visualise")} className={`${card} ${phase >= 3 ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-20 scale-50 -rotate-6"}`}
          style={{ border: `1px solid rgba(${rgb1},0.15)`, background: `linear-gradient(to bottom, rgba(${rgb1},0.25), rgba(${rgb1},0.08) 50%, transparent)`, transition: phase >= 3 ? "all 700ms cubic-bezier(0.34,1.56,0.64,1) 50ms" : "all 200ms" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `rgba(${rgb1},0.4)`; e.currentTarget.style.boxShadow = `0 0 40px rgba(${rgb1},0.25)`; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = `rgba(${rgb1},0.15)`; e.currentTarget.style.boxShadow = ""; }}
        >
          <Eye size={48} className="mb-4 transition-transform duration-300 group-hover:scale-125" style={{ color: `rgb(${rgb1})` }} />
          <span className="font-display text-[16px] lg:text-[18px] font-medium text-[#e8e4dc] tracking-wider uppercase">Visualise</span>
        </button>
        <button onClick={() => onSelect("top-tens")} className={`${card} ${phase >= 3 ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-20 scale-50 rotate-6"}`}
          style={{ border: `1px solid rgba(${rgb2},0.15)`, background: `linear-gradient(to bottom, rgba(${rgb2},0.25), rgba(${rgb2},0.08) 50%, transparent)`, transition: phase >= 3 ? "all 700ms cubic-bezier(0.34,1.56,0.64,1) 150ms" : "all 200ms" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `rgba(${rgb2},0.4)`; e.currentTarget.style.boxShadow = `0 0 40px rgba(${rgb2},0.25)`; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = `rgba(${rgb2},0.15)`; e.currentTarget.style.boxShadow = ""; }}
        >
          <Trophy size={48} className="mb-4 transition-transform duration-300 group-hover:scale-125" style={{ color: `rgb(${rgb2})` }} />
          <span className="font-display text-[16px] lg:text-[18px] font-medium text-[#e8e4dc] tracking-wider uppercase">Top Tens</span>
        </button>
      </div>
    </div>
  );
}

/* ── Mobile helpers ── */
function MobileStatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-3 rounded-xl border border-border-glow bg-bg-card/50 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-400 via-vr-violet to-teal-400 opacity-40" />
      <p className="font-display text-[8px] uppercase tracking-[2px] text-[#5c5954] mb-1">{label}</p>
      <p className="font-display text-xl font-bold bg-gradient-to-r from-teal-400 to-vr-violet bg-clip-text text-transparent">{value}</p>
      {sub && <p className="font-mono-stats text-[10px] text-[#5c5954] mt-0.5">{sub}</p>}
    </div>
  );
}
function MobileChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="p-4 rounded-xl border border-border-glow bg-bg-card/50"><p className="font-display text-[10px] uppercase tracking-wider text-[#9a968e] mb-2">{title}</p>{children}</div>;
}
function MobileTopRated({ title, items }: { title: string; items: Entry[] }) {
  const GOLD = "255,184,0";
  return (
    <div>
      <p className="font-display text-xs uppercase tracking-wider mb-2" style={{ color: `rgb(${GOLD})` }}>{title}</p>
      <div className="grid grid-cols-5 gap-1.5">
        {items.map((e, i) => (
          <div key={e.id} className="relative">
            <div className="aspect-[2/3] rounded-md overflow-hidden bg-bg-deep" style={{ border: `1px solid rgba(${GOLD},0.15)` }}>
              {e.poster ? <img src={posterUrl(e.poster, "small")} alt={e.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-lg text-[#5c5954]">{e.media_type === "movie" ? "F" : "TV"}</div>}
            </div>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${i < 3 ? "text-black" : "text-[#9a968e] bg-[#1e1e26]"}`} style={i < 3 ? { background: `linear-gradient(135deg, rgb(${GOLD}), #b8860b)` } : undefined}>{i + 1}</span>
            <p className="font-display text-[7px] text-[#e8e4dc] mt-0.5 leading-tight line-clamp-1">{e.title}</p>
            <p className="font-mono-stats text-[8px] font-bold" style={{ color: `rgb(${GOLD})` }}>{e.my_rating}/10</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Genre Modal ── */
function GenreModal({ genre, entries, onClose }: { genre: string; entries: Entry[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:px-40 lg:py-16">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-modal-backdrop" onClick={onClose} />
      <div className="relative w-full max-w-lg lg:max-w-2xl max-h-[70vh] lg:max-h-[60vh] rounded-xl border border-border-glow bg-bg-card animate-modal-enter overflow-hidden flex flex-col">
        <div className="h-px rounded-t-xl" style={{ background: "linear-gradient(90deg, transparent 5%, #2dd4bf 30%, #a78bfa 70%, transparent 95%)" }} />
        <button onClick={onClose} className="absolute top-2.5 right-2.5 z-10 p-1 rounded-lg bg-bg-deep/50 text-[#5c5954] hover:text-[#e8e4dc] transition-colors text-xs">✕</button>
        <div className="p-3 border-b border-border-glow/20 shrink-0">
          <h3 className="font-display text-sm uppercase tracking-wider text-teal-400" style={{ textShadow: "0 0 8px rgba(45,212,191,0.4)" }}>{genre}</h3>
          <p className="font-mono-stats text-[10px] text-[#5c5954]">{entries.length} titles</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 tv-grid-scroll">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-deep/50 transition-colors">
              <div className="w-8 h-12 shrink-0 rounded overflow-hidden bg-bg-deep">
                {e.poster ? <img src={posterUrl(e.poster, "small")} alt={e.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#5c5954] text-[6px]">{e.title.slice(0, 3)}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-[11px] text-[#e8e4dc] truncate">{e.title}</p>
                <div className="flex items-center gap-1.5 text-[9px] text-[#5c5954]">
                  <span className="font-mono-stats">{e.year}</span><span>·</span>
                  <span className={`font-display uppercase tracking-wider ${e.media_type === "movie" ? "text-vr-blue/70" : "text-vr-violet/70"}`}>{e.media_type === "movie" ? "Film" : "TV"}</span>
                  {e.tmdb_rating && <><span>·</span><span className="font-mono-stats">TMDB {Number(e.tmdb_rating).toFixed(1)}</span></>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono-stats text-sm font-bold bg-gradient-to-r from-teal-400 to-vr-violet bg-clip-text text-transparent">{e.my_rating}</p>
                <p className="font-mono-stats text-[7px] text-[#5c5954]">/10</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
