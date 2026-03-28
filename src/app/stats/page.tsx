import { BarChart3 } from "lucide-react";

export default function StatsPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 size={22} className="text-vr-blue" />
        <h1 className="font-display text-xl font-semibold text-gradient-vr tracking-wider uppercase">
          Stats
        </h1>
      </div>

      {/* Stat cards placeholder */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total Watched", value: "—", sub: "0 films · 0 shows" },
          { label: "Watch Time", value: "—", sub: "hours" },
          { label: "Avg Rating", value: "—", sub: "out of 10" },
          { label: "Top Genre", value: "—", sub: "no data" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl border border-border-glow bg-bg-card/50"
          >
            <p className="font-display text-[9px] uppercase tracking-wider text-[#5c5954] mb-2">
              {stat.label}
            </p>
            <p className="font-mono-stats text-2xl text-vr-blue/40">
              {stat.value}
            </p>
            <p className="font-mono-stats text-[10px] text-[#5c5954] mt-1">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {["Genre Breakdown", "Ratings Distribution", "Your vs TMDB", "By Decade"].map(
          (title) => (
            <div
              key={title}
              className="p-5 rounded-xl border border-border-glow bg-bg-card/50"
            >
              <p className="font-display text-xs uppercase tracking-wider text-[#9a968e] mb-3">
                {title}
              </p>
              <div className="h-44 rounded-lg bg-bg-deep/50 flex items-center justify-center">
                <span className="font-mono-stats text-xs text-[#5c5954]">
                  // chart
                </span>
              </div>
            </div>
          )
        )}
      </div>

      {/* Top rated placeholder rows */}
      <div className="space-y-6">
        {["Top 10 Movies", "Top 10 TV Shows"].map((section) => (
          <div key={section}>
            <p className="font-display text-xs uppercase tracking-wider text-[#9a968e] mb-3">
              {section}
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-28 aspect-[2/3] rounded-lg border border-border-glow bg-bg-card/30"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
