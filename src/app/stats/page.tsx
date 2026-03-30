"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { posterUrl } from "@/lib/tmdb";
import type { Entry } from "@/lib/types";

const CHART_COLORS = [
  "#0ea5e9", "#38bdf8", "#0284c7", "#a78bfa", "#c4b5fd",
  "#8b5cf6", "#06b6d4", "#7dd3fc", "#818cf8", "#67e8f9",
];

export default function StatsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeUnit, setTimeUnit] = useState<"hours" | "days">("hours");
  const [timeFilter, setTimeFilter] = useState<"all" | "movies" | "tv">("all");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("entries")
        .select("*")
        .order("my_rating", { ascending: false });
      setEntries(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vr-blue/30 border-t-vr-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <BarChart3 size={36} className="text-vr-blue/20 mb-4" />
        <p className="font-display text-sm uppercase tracking-wider text-[#5c5954]">No Stats Yet</p>
        <p className="font-body text-xs text-[#5c5954] mt-1">Add titles to see analytics.</p>
      </div>
    );
  }

  // Compute stats
  const movies = entries.filter((e) => e.media_type === "movie");
  const tvShows = entries.filter((e) => e.media_type === "tv");

  // Movie time: straightforward runtime
  const movieMin = movies.reduce((s, e) => s + (e.runtime || 0), 0);

  // TV time: episodes watched (based on seasons_watched) * episode runtime
  const tvMin = tvShows.reduce((s, e) => {
    if (!e.runtime || !e.seasons || e.seasons === 0) return s;
    const sw = e.seasons_watched > 0 ? e.seasons_watched : e.seasons;
    const avgEpsPerSeason = e.episodes / e.seasons;
    const epsWatched = Math.round(avgEpsPerSeason * sw);
    return s + (epsWatched * e.runtime);
  }, 0);

  const totalMin = movieMin + tvMin;
  const filteredMin = timeFilter === "movies" ? movieMin : timeFilter === "tv" ? tvMin : totalMin;
  const hrs = Math.round(filteredMin / 60);
  const days = (filteredMin / 1440).toFixed(1);
  const avgRating = (entries.reduce((s, e) => s + e.my_rating, 0) / entries.length).toFixed(1);

  // Genre breakdown (top 8)
  const genreCounts: Record<string, number> = {};
  entries.forEach((e) => (e.genres || []).forEach((g) => { genreCounts[g] = (genreCounts[g] || 0) + 1; }));
  const genreData = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));
  const topGenre = genreData[0];

  // Rating distribution (1-10)
  const ratingDist: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) ratingDist[i] = 0;
  entries.forEach((e) => { const r = Math.round(e.my_rating); if (r >= 1 && r <= 10) ratingDist[r]++; });
  const ratingData = Object.entries(ratingDist).map(([rating, count]) => ({ rating, count }));

  // Your rating vs TMDB scatter
  const scatterData = entries
    .filter((e) => e.tmdb_rating && e.tmdb_rating > 0)
    .map((e) => ({ x: e.tmdb_rating!, y: e.my_rating, title: e.title }));

  // Films by decade
  const decadeCounts: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.year) {
      const d = Math.floor(parseInt(e.year) / 10) * 10 + "s";
      decadeCounts[d] = (decadeCounts[d] || 0) + 1;
    }
  });
  const decadeData = Object.entries(decadeCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([decade, count]) => ({ decade, count }));

  // Top rated
  const topMovies = [...movies].sort((a, b) => b.my_rating - a.my_rating).slice(0, 10);
  const topTv = [...tvShows].sort((a, b) => b.my_rating - a.my_rating).slice(0, 10);

  return (
    <div className="px-4 py-6 lg:px-8 lg:pt-3 lg:pb-8 lg:mt-[52px] overflow-y-auto">
      {/* Header */}
      <h2 className="font-display text-2xl font-bold tracking-wider mb-6">
        <span className="text-gradient-vr">Your Cinema Stats</span>
      </h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Watched" value={String(entries.length)} sub={`${movies.length} films · ${tvShows.length} shows`} />
        <div className="relative">
          <StatCard
            label="Watch Time"
            value={timeUnit === "hours" ? String(hrs) : days}
            sub={timeUnit}
          />
          {/* Filter: All / Movies / TV */}
          <div className="absolute top-3 right-3 flex gap-1">
            {(["all", "movies", "tv"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-1.5 py-0.5 rounded text-[7px] font-display uppercase tracking-wider transition-colors ${
                  timeFilter === f
                    ? "text-vr-blue bg-vr-blue/15 border border-vr-blue/25"
                    : "text-[#5c5954] hover:text-[#9a968e] border border-transparent"
                }`}
              >
                {f === "all" ? "All" : f === "movies" ? "Film" : "TV"}
              </button>
            ))}
          </div>
          {/* Unit toggle */}
          <button
            onClick={() => setTimeUnit((u) => (u === "hours" ? "days" : "hours"))}
            className="absolute bottom-3 right-3 text-[#5c5954] hover:text-[#9a968e] text-sm transition-colors"
            title="Switch units"
          >
            ⇄
          </button>
        </div>
        <StatCard label="Avg. Rating" value={avgRating} sub="out of 10" />
        <StatCard
          label="Top Genre"
          value={topGenre ? topGenre.name : "—"}
          sub={topGenre ? `${topGenre.value} titles` : "no data"}
          smallValue={(topGenre?.name.length || 0) > 9}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Genre breakdown — doughnut */}
        <ChartBox title="Genre Breakdown">
          {genreData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={genreData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={2}
                  stroke="none"
                >
                  {genreData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#16161e", border: "1px solid #2a2a34", borderRadius: 8, fontSize: 11 }}
                  itemStyle={{ color: "#e8e4dc" }}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => <span className="text-[10px] text-[#9a968e] ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartBox>

        {/* Ratings distribution — bar */}
        <ChartBox title="Ratings Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ratingData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" />
              <XAxis dataKey="rating" tick={{ fill: "#5c5954", fontSize: 10 }} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#5c5954", fontSize: 10 }} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#16161e", border: "1px solid #2a2a34", borderRadius: 8, fontSize: 11 }}
                itemStyle={{ color: "#e8e4dc" }}
                labelFormatter={(l) => `Rating: ${l}`}
              />
              <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Your rating vs TMDB — scatter */}
        <ChartBox title="Your Rating vs TMDB">
          {scatterData.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, 10]}
                  tick={{ fill: "#5c5954", fontSize: 10 }}
                  axisLine={false}
                  name="TMDB"
                  label={{ value: "TMDB", position: "insideBottom", offset: -2, fill: "#5c5954", fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[0, 10]}
                  tick={{ fill: "#5c5954", fontSize: 10 }}
                  axisLine={false}
                  name="Yours"
                  label={{ value: "Yours", angle: -90, position: "insideLeft", offset: 15, fill: "#5c5954", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ background: "#16161e", border: "1px solid #2a2a34", borderRadius: 8, fontSize: 11 }}
                  itemStyle={{ color: "#e8e4dc" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(_: any, _name: any, props: any) => {
                    const d = props?.payload;
                    if (!d) return "";
                    return [`You: ${d.y} / TMDB: ${d.x}`, d.title];
                  }}
                />
                <Scatter
                  data={scatterData}
                  fill="rgba(14,165,233,0.6)"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  r={6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Add more titles to unlock" />
          )}
        </ChartBox>

        {/* Films by decade — bar */}
        <ChartBox title="Films by Decade">
          {decadeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={decadeData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" />
                <XAxis dataKey="decade" tick={{ fill: "#5c5954", fontSize: 10 }} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#5c5954", fontSize: 10 }} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#16161e", border: "1px solid #2a2a34", borderRadius: 8, fontSize: 11 }}
                  itemStyle={{ color: "#e8e4dc" }}
                />
                <Bar dataKey="count" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartBox>
      </div>

      {/* Top Rated Movies */}
      {topMovies.length >= 2 && (
        <TopRated title="Top Rated Movies" items={topMovies} accent="blue" />
      )}

      {/* Top Rated TV Shows */}
      {topTv.length >= 2 && (
        <TopRated title="Top Rated TV Shows" items={topTv} accent="violet" />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, smallValue }: { label: string; value: string; sub: string; smallValue?: boolean }) {
  return (
    <div className="p-4 rounded-xl border border-border-glow bg-bg-card/50 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-vr-blue via-vr-violet to-vr-blue opacity-40" />
      <p className="font-display text-[9px] uppercase tracking-[3px] text-[#5c5954] mb-2 font-semibold">{label}</p>
      <p className={`font-display font-bold bg-gradient-to-r from-vr-blue to-vr-violet bg-clip-text text-transparent ${smallValue ? "text-xl" : "text-3xl"}`}>
        {value}
      </p>
      <p className="font-mono-stats text-[11px] text-[#5c5954] mt-1">{sub}</p>
    </div>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-xl border border-border-glow bg-bg-card/50">
      <p className="font-display text-xs uppercase tracking-wider text-[#9a968e] mb-3">{title}</p>
      {children}
    </div>
  );
}

function EmptyChart({ message = "No data yet" }: { message?: string }) {
  return (
    <div className="h-44 rounded-lg bg-bg-deep/50 flex items-center justify-center">
      <span className="font-mono-stats text-xs text-[#5c5954]">{message}</span>
    </div>
  );
}

function TopRated({ title, items, accent }: { title: string; items: Entry[]; accent: "blue" | "violet" }) {
  return (
    <div className="mb-8">
      <p className="font-display text-xs uppercase tracking-wider text-[#9a968e] mb-3">{title}</p>
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none">
        {items.map((e, i) => (
          <div key={e.id} className="flex-shrink-0 w-28 relative group">
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-bg-deep border border-border-glow">
              {e.poster ? (
                <img
                  src={posterUrl(e.poster, "small")}
                  alt={e.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-[#5c5954]">
                  {e.media_type === "movie" ? "🎬" : "📺"}
                </div>
              )}
            </div>
            {/* Rank badge */}
            <span
              className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                i < 3
                  ? `text-white ${accent === "blue" ? "bg-gradient-to-br from-vr-blue to-sky-700" : "bg-gradient-to-br from-vr-violet to-purple-800"}`
                  : "text-[#9a968e] bg-[#1e1e26]"
              }`}
            >
              {i + 1}
            </span>
            <p className="font-display text-[10px] text-[#e8e4dc] mt-1.5 leading-tight line-clamp-2">{e.title}</p>
            <p className="font-mono-stats text-[11px] font-bold mt-0.5 bg-gradient-to-r from-vr-blue to-vr-violet bg-clip-text text-transparent">
              {e.my_rating}/10
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
