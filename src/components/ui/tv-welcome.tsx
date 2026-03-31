"use client";

import { Library, Bookmark, Radar, BarChart3 } from "lucide-react";

interface TvWelcomeProps {
  onNavigate: (area: "library" | "watchlist" | "discover" | "stats") => void;
}

const areas = [
  {
    key: "library" as const,
    label: "Library",
    sub: "Your collection",
    icon: Library,
    gradient: "from-vr-blue/20 to-vr-blue/5",
    border: "border-vr-blue/20 hover:border-vr-blue/40",
    iconColor: "text-vr-blue",
    glow: "group-hover:shadow-[0_0_30px_rgba(14,165,233,0.15)]",
  },
  {
    key: "watchlist" as const,
    label: "Watchlist",
    sub: "Queued to watch",
    icon: Bookmark,
    gradient: "from-vr-violet/20 to-vr-violet/5",
    border: "border-vr-violet/20 hover:border-vr-violet/40",
    iconColor: "text-vr-violet",
    glow: "group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]",
  },
  {
    key: "discover" as const,
    label: "Discover",
    sub: "Find something new",
    icon: Radar,
    gradient: "from-pink-500/20 to-pink-500/5",
    border: "border-pink-500/20 hover:border-pink-500/40",
    iconColor: "text-pink-400",
    glow: "group-hover:shadow-[0_0_30px_rgba(244,114,182,0.15)]",
  },
  {
    key: "stats" as const,
    label: "Stats",
    sub: "Your analytics",
    icon: BarChart3,
    gradient: "from-teal-400/20 to-teal-400/5",
    border: "border-teal-400/20 hover:border-teal-400/40",
    iconColor: "text-teal-400",
    glow: "group-hover:shadow-[0_0_30px_rgba(45,212,191,0.15)]",
  },
];

export function TvWelcome({ onNavigate }: TvWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 lg:px-16 lg:py-16">
      {/* Welcome text */}
      <div className="text-center mb-10 lg:mb-14">
        <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-wider mb-2">
          <span className="text-vr-blue text-glow-blue">VR</span>
          <span className="text-vr-violet">dict</span>
        </h1>
        <p className="font-body text-[13px] lg:text-sm text-[#5c5954] tracking-wide">
          Your personal cinema console
        </p>
      </div>

      {/* Area cards */}
      <div className="grid grid-cols-2 gap-4 lg:gap-6 w-full max-w-lg">
        {areas.map((area) => (
          <button
            key={area.key}
            onClick={() => onNavigate(area.key)}
            className={`group relative flex flex-col items-center justify-center p-6 lg:p-8 rounded-xl border bg-gradient-to-b ${area.gradient} ${area.border} ${area.glow} transition-all duration-300 hover:scale-[1.03] cursor-pointer`}
          >
            <area.icon
              size={32}
              className={`${area.iconColor} mb-3 transition-transform duration-300 group-hover:scale-110`}
            />
            <span className="font-display text-sm lg:text-base font-medium text-[#e8e4dc] tracking-wider uppercase">
              {area.label}
            </span>
            <span className="font-body text-[10px] lg:text-[11px] text-[#5c5954] mt-1 tracking-wide">
              {area.sub}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
