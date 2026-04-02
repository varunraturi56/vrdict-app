"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { posterUrl } from "@/lib/tmdb";

import { getPageGlow, getSparkGlow, rgba, type RGB } from "@/lib/ambient-colors";
import type { Entry } from "@/lib/types";

interface PreviewBarProps {
  entry: Entry | null;
  onEdit: (entry: Entry) => void;
  isOn?: boolean;
}

export function PreviewBar({ entry, onEdit, isOn = true }: PreviewBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const mediaTab = pathname === "/stats"
    ? (viewParam === "top-tens" ? "tv" : "movie")
    : (searchParams.get("tab") || "movie");
  const isHome = pathname === "/" && !searchParams.get("tab");
  const homeGreen: RGB = [34, 197, 94];
  const glowRgb = isHome ? homeGreen : getPageGlow(pathname, mediaTab);
  const sparkRgb = isHome ? homeGreen : getSparkGlow(pathname, mediaTab);
  // Ambient derived from glowRgb so it switches with movie/tv
  const ambient = { r: glowRgb[0], g: glowRgb[1], b: glowRgb[2] };

  const isMovie = entry?.media_type === "movie";

  // Idle state: show pulse when no entry hovered for 2s, or same entry for 3s, or TV off
  const [showPulse, setShowPulse] = useState(!isOn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!isOn) {
      setShowPulse(true);
      return;
    }

    const currentId = entry?.id ?? null;

    if (currentId === null) {
      // No entry hovered — wait 15s then show pulse
      timerRef.current = setTimeout(() => setShowPulse(true), 15000);
    } else if (currentId === entryIdRef.current) {
      // Same card — wait 15s then show pulse
      timerRef.current = setTimeout(() => setShowPulse(true), 15000);
    } else {
      // New card hovered — hide pulse immediately
      setShowPulse(false);
      entryIdRef.current = currentId;
      // Start 15s timer for staying on same card
      timerRef.current = setTimeout(() => setShowPulse(true), 15000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [entry?.id, isOn]);

  const glowVars = {
    "--ambient-r": ambient.r,
    "--ambient-g": ambient.g,
    "--ambient-b": ambient.b,
  } as React.CSSProperties;

  // Speaker accent: subtle colored ring matching the tab glow
  const speakerAccent = `0 0 6px rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.15)`;
  const speakerBorder = `2px solid rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.12)`;
  const innerRing = `1px solid rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.10)`;
  const dotGlow = `radial-gradient(circle at 40% 35%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.25), rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.08))`;

  const speaker = (side: "left" | "right") => (
    <div
      className={`absolute ${side}-0 top-0 bottom-0 w-[60px] z-[3] flex items-center justify-center`}
      style={{ [side === "left" ? "borderRight" : "borderLeft"]: "1px solid #1a1a1c" }}
    >
      <div
        className="w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all duration-700"
        style={{
          background: "radial-gradient(circle at 45% 40%, #1a1a1e, #101014 50%, #0a0a0e 80%)",
          border: speakerBorder,
          boxShadow: `inset 0 0 8px rgba(0,0,0,0.9), inset 0 0 2px rgba(255,255,255,0.03), 0 0 3px rgba(0,0,0,0.5), ${speakerAccent}`,
        }}
      >
        <div
          className="w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-700"
          style={{
            background: "radial-gradient(circle at 45% 40%, #222226, #161618)",
            border: innerRing,
          }}
        >
          <div
            className="w-[8px] h-[8px] rounded-full transition-all duration-700"
            style={{
              background: dotGlow,
              border: `1px solid rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.15)`,
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="hidden lg:block flex-shrink-0" style={glowVars}>
      {/* Soundbar — the now-playing bar, sits on the console table */}
      <div className="px-32">
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

          {speaker("left")}
          {speaker("right")}

          {/* Pulsar idle — shows when idle or TV off */}
          <div
            className={`absolute inset-0 z-[1] ${showPulse ? "opacity-100 transition-opacity duration-500" : "opacity-0 transition-opacity duration-150 pointer-events-none"}`}
            style={{ background: "#030308" }}
          >
            <div className="ec-idle-container">
              {/* Starfield */}
              <div className="ec-pulsar-stars" />
              {/* Ambient fill */}
              <div className="ec-pulsar-fill" style={{
                background: `radial-gradient(ellipse 80% 100% at 50% 50%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.20), rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.04) 60%, transparent 100%)`,
              }} />
              {/* Wide soft arm */}
              <div className="ec-pulsar-arm" style={{
                height: 18,
                background: `linear-gradient(90deg, transparent, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.08) 8%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.25) 30%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.4) 45%, rgba(255,255,255,0.2) 50%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.4) 55%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.25) 70%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.08) 92%, transparent)`,
                filter: "blur(5px)",
              }} />
              {/* Thin bright core beam */}
              <div className="ec-pulsar-arm ec-pulsar-arm-2" style={{
                height: 3,
                background: `linear-gradient(90deg, transparent 5%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.15) 15%, rgba(255,255,255,0.4) 42%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.4) 58%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.15) 85%, transparent 95%)`,
                filter: "blur(1px)",
              }} />
              {/* Irregular clumps along arms */}
              {[
                { w: 40, h: 20, l: "18%", t: "30%", d: "0s" },
                { w: 30, h: 16, l: "32%", t: "55%", d: "-1.5s" },
                { w: 35, h: 22, r: "20%", t: "25%", d: "-2.5s" },
                { w: 28, h: 18, r: "35%", t: "58%", d: "-0.8s" },
                { w: 22, h: 14, l: "8%", t: "40%", d: "-3s" },
                { w: 25, h: 16, r: "8%", t: "45%", d: "-2s" },
              ].map((c, i) => (
                <div key={i} className="ec-pulsar-clump" style={{
                  width: c.w, height: c.h,
                  ...(c.l ? { left: c.l } : {}),
                  ...(c.r ? { right: c.r } : {}),
                  top: c.t,
                  animationDelay: c.d,
                  background: `radial-gradient(ellipse, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.22), transparent 70%)`,
                }} />
              ))}
              {/* Nebula tendrils */}
              <div className="ec-pulsar-nebula" style={{
                width: 100, height: 60,
                background: `radial-gradient(ellipse, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.30), rgba(${Math.min(255, glowRgb[0] + 60)},${Math.max(0, glowRgb[1] - 20)},${Math.min(255, glowRgb[2] + 40)},0.12) 50%, transparent 75%)`,
              }} />
              <div className="ec-pulsar-nebula ec-pulsar-nebula-2" style={{
                width: 75, height: 50,
                background: `radial-gradient(ellipse, rgba(${Math.min(255, glowRgb[0] + 40)},${glowRgb[1]},${Math.min(255, glowRgb[2] + 20)},0.22), rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.08) 50%, transparent 70%)`,
              }} />
              {/* Inner halo */}
              <div className="ec-pulsar-halo" style={{
                background: `radial-gradient(circle, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.5), rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.12) 50%, transparent 70%)`,
              }} />
              {/* Corona spikes */}
              <div className="ec-pulsar-spike" style={{ width: 3, height: 44, background: `linear-gradient(180deg, transparent, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.4) 70%, transparent)` }} />
              <div className="ec-pulsar-spike" style={{ width: 55, height: 3, background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.3) 75%, transparent)` }} />
              <div className="ec-pulsar-spike" style={{ width: 2, height: 32, transform: "rotate(45deg)", background: `linear-gradient(180deg, transparent, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.35) 30%, rgba(255,255,255,0.45) 50%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.35) 70%, transparent)` }} />
              <div className="ec-pulsar-spike" style={{ width: 2, height: 32, transform: "rotate(-45deg)", background: `linear-gradient(180deg, transparent, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.35) 30%, rgba(255,255,255,0.45) 50%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.35) 70%, transparent)` }} />
              {/* Central star blob */}
              <div className="ec-pulsar-star" style={{
                background: `radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 20%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.6) 45%, rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.2) 70%, transparent 100%)`,
                boxShadow: `0 0 12px rgba(255,255,255,0.8), 0 0 25px rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.9), 0 0 50px rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.5), 0 0 80px rgba(${glowRgb[0]},${glowRgb[1]},${glowRgb[2]},0.25)`,
              }} />
              {/* Spark particles — complementary colour dots flying off the arms */}
              {[
                { l: "35%", t: "42%", sx: "12px", sy: "-10px", dur: "600ms", del: "0.2s" },
                { l: "60%", t: "48%", sx: "8px", sy: "12px", dur: "500ms", del: "0.8s" },
                { l: "25%", t: "52%", sx: "-14px", sy: "-6px", dur: "700ms", del: "1.5s" },
                { l: "72%", t: "44%", sx: "10px", sy: "-14px", dur: "450ms", del: "2.1s" },
                { l: "42%", t: "55%", sx: "-8px", sy: "10px", dur: "650ms", del: "0.5s" },
                { l: "18%", t: "46%", sx: "-16px", sy: "5px", dur: "550ms", del: "2.8s" },
                { l: "80%", t: "50%", sx: "15px", sy: "-8px", dur: "480ms", del: "1.1s" },
                { l: "55%", t: "43%", sx: "-6px", sy: "-15px", dur: "720ms", del: "1.8s" },
                { l: "30%", t: "56%", sx: "11px", sy: "8px", dur: "580ms", del: "2.4s" },
                { l: "68%", t: "53%", sx: "-12px", sy: "-11px", dur: "420ms", del: "0.1s" },
                { l: "15%", t: "44%", sx: "-10px", sy: "-12px", dur: "520ms", del: "0.4s" },
                { l: "85%", t: "52%", sx: "14px", sy: "6px", dur: "680ms", del: "1.3s" },
                { l: "48%", t: "40%", sx: "6px", sy: "-16px", dur: "440ms", del: "2.6s" },
                { l: "38%", t: "58%", sx: "-12px", sy: "9px", dur: "560ms", del: "0.7s" },
                { l: "75%", t: "46%", sx: "16px", sy: "-5px", dur: "620ms", del: "1.9s" },
                { l: "22%", t: "50%", sx: "-8px", sy: "14px", dur: "470ms", del: "2.2s" },
                { l: "58%", t: "56%", sx: "10px", sy: "11px", dur: "530ms", del: "0.3s" },
                { l: "12%", t: "48%", sx: "-18px", sy: "-4px", dur: "750ms", del: "1.6s" },
                { l: "88%", t: "45%", sx: "12px", sy: "-13px", dur: "490ms", del: "2.9s" },
                { l: "45%", t: "54%", sx: "-5px", sy: "16px", dur: "640ms", del: "0.9s" },
              ].map((s, i) => (
                <div key={`spark-${i}`} className="ec-spark" style={{
                  left: s.l, top: s.t,
                  "--sx": s.sx, "--sy": s.sy,
                  animationDuration: s.dur,
                  animationDelay: s.del,
                  background: `rgb(${sparkRgb[0]},${sparkRgb[1]},${sparkRgb[2]})`,
                  boxShadow: `0 0 4px 1px rgba(${sparkRgb[0]},${sparkRgb[1]},${sparkRgb[2]},0.8), 0 0 8px 2px rgba(${sparkRgb[0]},${sparkRgb[1]},${sparkRgb[2]},0.3)`,
                } as React.CSSProperties} />
              ))}
              {/* Arc flashes — complementary colour */}
              <div className="ec-arc" style={{
                left: "30%", top: "44%", width: 28, transform: "rotate(-18deg)",
                background: `rgba(${sparkRgb[0]},${sparkRgb[1]},${sparkRgb[2]},0.7)`,
                boxShadow: `0 0 6px rgba(${sparkRgb[0]},${sparkRgb[1]},${sparkRgb[2]},0.4)`,
                animation: "arc-flash 4.5s 0.6s ease-out infinite",
              }} />
              <div className="ec-arc" style={{
                left: "65%", top: "54%", width: 35, transform: "rotate(22deg)",
                background: `rgba(${sparkRgb[0]},${sparkRgb[1]},${sparkRgb[2]},0.6)`,
                boxShadow: `0 0 5px rgba(${sparkRgb[0]},${sparkRgb[1]},${sparkRgb[2]},0.35)`,
                animation: "arc-flash 5.2s 2.3s ease-out infinite",
              }} />
              <div className="ec-arc" style={{
                left: "20%", top: "50%", width: 22, transform: "rotate(14deg)",
                background: `rgba(${sparkRgb[0]},${sparkRgb[1]},${sparkRgb[2]},0.5)`,
                boxShadow: `0 0 4px rgba(${sparkRgb[0]},${sparkRgb[1]},${sparkRgb[2]},0.3)`,
                animation: "arc-flash 6s 1.4s ease-out infinite",
              }} />
              <div className="ec-arc" style={{
                left: "78%", top: "42%", width: 30, transform: "rotate(-25deg)",
                background: `rgba(${sparkRgb[0]},${sparkRgb[1]},${sparkRgb[2]},0.55)`,
                boxShadow: `0 0 5px rgba(${sparkRgb[0]},${sparkRgb[1]},${sparkRgb[2]},0.35)`,
                animation: "arc-flash 5.8s 3.1s ease-out infinite",
              }} />
            </div>
          </div>

          {/* Film details — between speakers */}
          <div className={`ec-content relative z-[2] flex items-center px-[72px] ${isOn && !showPulse ? "opacity-100 transition-opacity duration-500" : "opacity-0 transition-opacity duration-150"}`}>
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

                {/* Left block: Title, Rating, Meta, Genres */}
                <div className="shrink-0 max-w-[280px]">
                  {/* Title + Rating */}
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <h3 className="font-display text-[12px] font-medium text-[#e8e4dc] tracking-wide leading-tight line-clamp-2">
                      {entry.title}
                    </h3>
                    <span
                      className="font-mono-stats text-sm font-bold leading-none shrink-0"
                      style={{
                        color: `rgb(${ambient.r}, ${ambient.g}, ${ambient.b})`,
                        textShadow: `0 0 10px ${rgba(ambient, 0.5)}`,
                      }}
                    >
                      {Number(entry.my_rating).toFixed(1)}
                    </span>
                    <span className="font-mono-stats text-[8px] text-[#5c5954] shrink-0">/10</span>
                  </div>

                  {/* Meta + Genres — compact */}
                  <div className="flex items-center gap-1 flex-wrap text-[#5c5954]">
                    <span className="font-mono-stats text-[10px]">{entry.year}</span>
                    {isMovie && entry.runtime ? (
                      <>
                        <span className="text-[7px]">·</span>
                        <span className="font-mono-stats text-[10px]">{entry.runtime}m</span>
                      </>
                    ) : null}
                    {!isMovie && entry.seasons ? (
                      <>
                        <span className="text-[7px]">·</span>
                        <span className="font-mono-stats text-[10px]">
                          {entry.seasons}S·{entry.episodes}E
                        </span>
                      </>
                    ) : null}
                    {entry.tmdb_rating && (
                      <>
                        <span className="text-[7px]">·</span>
                        <span className="font-mono-stats text-[10px] text-[#5c5954]/70">
                          TMDB {Number(entry.tmdb_rating).toFixed(1)}
                        </span>
                      </>
                    )}
                    {entry.genres?.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="px-1 py-px rounded-full text-[7px] font-display uppercase tracking-wider text-[#9a968e]"
                        style={{ border: `1px solid ${rgba(ambient, 0.15)}` }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                {entry.overview && (
                  <div className="shrink-0 w-px h-[40px] mx-2" style={{ background: `linear-gradient(180deg, transparent, ${rgba(ambient, 0.15)}, transparent)` }} />
                )}

                {/* Right block: Overview fills remaining space */}
                {entry.overview && (
                  <p className="flex-1 min-w-0 text-[12px] text-[#9a968e]/60 font-body leading-relaxed line-clamp-4">
                    {entry.overview}
                  </p>
                )}
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
