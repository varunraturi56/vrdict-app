"use client";

import { usePathname } from "next/navigation";
import { posterUrl } from "@/lib/tmdb";

import { getAmbientColor, rgba } from "@/lib/ambient-colors";
import type { Entry } from "@/lib/types";

interface PreviewBarProps {
  entry: Entry | null;
  onEdit: (entry: Entry) => void;
  isOn?: boolean;
}

export function PreviewBar({ entry, onEdit, isOn = true }: PreviewBarProps) {
  const pathname = usePathname();
  const ambient = getAmbientColor(pathname);

  const isMovie = entry?.media_type === "movie";

  const glowVars = {
    "--ambient-r": ambient.r,
    "--ambient-g": ambient.g,
    "--ambient-b": ambient.b,
  } as React.CSSProperties;

  return (
    <div className="hidden lg:block flex-shrink-0" style={glowVars}>
      {/* Soundbar — the now-playing bar, sits on the console table */}
      <div className="px-20">
        <div
          className="ec-soundbar"
          style={{
            boxShadow: isOn
              ? `inset 0 0 8px rgba(0,0,0,0.5),
                 -60px 0 60px 15px ${rgba(ambient, 0.10)},
                 60px 0 60px 15px ${rgba(ambient, 0.10)},
                 0 -40px 50px 15px ${rgba(ambient, 0.08)},
                 0 20px 30px 10px ${rgba(ambient, 0.06)}`
              : "inset 0 0 8px rgba(0,0,0,0.5)",
          }}
        >
          {/* Subtle scanlines */}
          <div className="ec-scanlines" />

          {/* Left speaker */}
          <div className="absolute left-0 top-0 bottom-0 w-[60px] z-[3] flex items-center justify-center"
            style={{ borderRight: "1px solid #1a1a1c" }}
          >
            <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle at 45% 40%, #1a1a1e, #101014 50%, #0a0a0e 80%)",
                border: "2px solid #1e1e22",
                boxShadow: "inset 0 0 8px rgba(0,0,0,0.9), inset 0 0 2px rgba(255,255,255,0.03), 0 0 3px rgba(0,0,0,0.5)",
              }}
            >
              <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center"
                style={{
                  background: "radial-gradient(circle at 45% 40%, #222226, #161618)",
                  border: "1px solid #2a2a2e",
                }}
              >
                <div className="w-[8px] h-[8px] rounded-full"
                  style={{
                    background: "radial-gradient(circle at 40% 35%, #2a2a30, #1a1a1e)",
                    border: "1px solid #333",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right speaker */}
          <div className="absolute right-0 top-0 bottom-0 w-[60px] z-[3] flex items-center justify-center"
            style={{ borderLeft: "1px solid #1a1a1c" }}
          >
            <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle at 45% 40%, #1a1a1e, #101014 50%, #0a0a0e 80%)",
                border: "2px solid #1e1e22",
                boxShadow: "inset 0 0 8px rgba(0,0,0,0.9), inset 0 0 2px rgba(255,255,255,0.03), 0 0 3px rgba(0,0,0,0.5)",
              }}
            >
              <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center"
                style={{
                  background: "radial-gradient(circle at 45% 40%, #222226, #161618)",
                  border: "1px solid #2a2a2e",
                }}
              >
                <div className="w-[8px] h-[8px] rounded-full"
                  style={{
                    background: "radial-gradient(circle at 40% 35%, #2a2a30, #1a1a1e)",
                    border: "1px solid #333",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Film details — between speakers */}
          <div className={`ec-content relative z-[2] flex items-center px-16 transition-opacity duration-500 ${isOn ? "opacity-100" : "opacity-0"}`}>
            {entry ? (
              <div className="flex items-center gap-3 w-full min-w-0">
                {/* Poster */}
                {entry.poster && (
                  <img
                    src={posterUrl(entry.poster, "small")}
                    alt={entry.title}
                    className="w-[30px] h-[45px] rounded-[2px] object-cover shrink-0"
                    style={{
                      boxShadow: `0 2px 10px rgba(0,0,0,0.6), 0 0 16px ${rgba(ambient, 0.12)}`,
                    }}
                  />
                )}

                {/* Info — wraps across lines */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: Title + Rating */}
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <h3 className="font-display text-base font-medium text-[#e8e4dc] tracking-wide leading-tight">
                      {entry.title}
                    </h3>
                    <span
                      className="font-mono-stats text-lg font-bold leading-none shrink-0"
                      style={{
                        color: `rgb(${ambient.r}, ${ambient.g}, ${ambient.b})`,
                        textShadow: `0 0 10px ${rgba(ambient, 0.5)}`,
                      }}
                    >
                      {Number(entry.my_rating).toFixed(1)}
                    </span>
                    <span className="font-mono-stats text-xs text-[#5c5954] shrink-0">/10</span>
                  </div>

                  {/* Row 2: Meta + Genres */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[#5c5954]">
                    <span className="font-mono-stats text-sm">{entry.year}</span>
                    {isMovie && entry.runtime ? (
                      <>
                        <span className="text-xs">·</span>
                        <span className="font-mono-stats text-sm">{entry.runtime}m</span>
                      </>
                    ) : null}
                    {!isMovie && entry.seasons ? (
                      <>
                        <span className="text-xs">·</span>
                        <span className="font-mono-stats text-sm">
                          {entry.seasons}S·{entry.episodes}E
                        </span>
                      </>
                    ) : null}
                    {entry.tmdb_rating && (
                      <>
                        <span className="text-xs">·</span>
                        <span className="font-mono-stats text-sm text-[#5c5954]/70">
                          TMDB {Number(entry.tmdb_rating).toFixed(1)}
                        </span>
                      </>
                    )}
                    {entry.genres?.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider text-[#9a968e]"
                        style={{ border: `1px solid ${rgba(ambient, 0.15)}` }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  {/* Row 3: Overview */}
                  {entry.overview && (
                    <p className="text-xs text-[#9a968e]/50 font-body leading-relaxed mt-1 line-clamp-2">
                      {entry.overview}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <p className="font-display text-[10px] uppercase tracking-[0.15em] text-[#5c5954]/15">
                  Hover a film to preview
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wooden console table */}
      <div className="ec-console-table" />
    </div>
  );
}
