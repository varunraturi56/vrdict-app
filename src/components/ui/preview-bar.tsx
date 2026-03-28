"use client";

import { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";
import { useSidebarState } from "@/lib/sidebar-context";
import type { Entry } from "@/lib/types";

interface PreviewBarProps {
  entry: Entry | null;
  onEdit: (entry: Entry) => void;
  isOn: boolean;
}

export function PreviewBar({ entry, onEdit, isOn }: PreviewBarProps) {
  const { collapsed } = useSidebarState();
  const [flickering, setFlickering] = useState(false);
  const [idle, setIdle] = useState(false);
  const prevEntryId = useRef<string | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CRT flicker when entry changes
  useEffect(() => {
    if (entry && entry.id !== prevEntryId.current && prevEntryId.current !== null) {
      setFlickering(true);
      const t = setTimeout(() => setFlickering(false), 100);
      return () => clearTimeout(t);
    }
    prevEntryId.current = entry?.id ?? null;
  }, [entry]);

  // Idle detection — 2s after last entry change, go idle
  useEffect(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2000);
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [entry]);

  const isMovie = entry?.media_type === "movie";

  // Sidebar offset for fixed positioning
  const sidebarWidth = collapsed ? "64px" : "224px";

  return (
    <div
      className="hidden lg:block fixed bottom-0 right-0 z-40 transition-all duration-300"
      style={{ left: sidebarWidth }}
    >
      {/* TV screen — sits directly on the shelf, no gap */}
      {isOn && (
        <div className="preview-tv-wrap">
          <div className="preview-tv-outer">
            <div className="preview-tv-screen">
              {/* Scanlines */}
              <div className="preview-scanlines" />

              {/* Idle pulse overlay */}
              {idle && isOn && (
                <div className="preview-idle-pulse" />
              )}

              {/* Screen content */}
              <div className={`relative z-[1] h-full flex items-center px-5 transition-opacity duration-100 ${
                flickering ? "opacity-70" : "opacity-100"
              } ${idle ? "opacity-0" : ""}`}>
                {entry && isOn ? (
                  <div className="flex items-center gap-4 w-full min-w-0">
                    {/* Poster */}
                    {entry.poster && (
                      <img
                        src={posterUrl(entry.poster, "small")}
                        alt={entry.title}
                        className="w-[55px] h-[82px] rounded-[4px] object-cover shadow-[0_2px_12px_rgba(0,0,0,0.6)] shrink-0"
                      />
                    )}

                    {/* Title + Rating */}
                    <div className="shrink-0 min-w-0 max-w-[180px]">
                      <h3 className="font-display text-[14px] font-medium text-[#e8e4dc] tracking-wide leading-tight line-clamp-2 mb-0.5">
                        {entry.title}
                      </h3>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono-stats text-[18px] font-bold text-gradient-vr leading-none">
                          {Number(entry.my_rating).toFixed(1)}
                        </span>
                        <span className="font-mono-stats text-xs text-[#5c5954]">/10</span>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-col gap-0.5 shrink-0 text-[#5c5954]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono-stats text-xs">{entry.year}</span>
                        {isMovie && entry.runtime ? (
                          <>
                            <span className="text-[10px]">·</span>
                            <span className="font-mono-stats text-xs">{entry.runtime} min</span>
                          </>
                        ) : null}
                        {!isMovie && entry.seasons ? (
                          <>
                            <span className="text-[10px]">·</span>
                            <span className="font-mono-stats text-xs">{entry.seasons}S · {entry.episodes}E</span>
                          </>
                        ) : null}
                      </div>
                      {entry.tmdb_rating && (
                        <span className="font-mono-stats text-[10px] text-[#5c5954]/70">
                          TMDB {Number(entry.tmdb_rating).toFixed(1)}
                        </span>
                      )}
                    </div>

                    {/* Genres */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {entry.genres?.slice(0, 3).map((g) => (
                        <span
                          key={g}
                          className="px-2 py-0.5 rounded-full text-[9px] font-display uppercase tracking-wider border border-border-glow/60 text-[#9a968e]"
                        >
                          {g}
                        </span>
                      ))}
                    </div>

                    {/* Overview — wraps to show full text */}
                    <p className="flex-1 min-w-0 text-[11px] text-[#9a968e]/60 font-body line-clamp-3 leading-relaxed">
                      {entry.overview}
                    </p>

                    {/* Edit */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
                      className="shrink-0 px-3 py-1.5 rounded-lg border border-border-glow/40 text-[#5c5954] hover:text-vr-blue hover:border-vr-blue/30 transition-all flex items-center gap-1.5"
                    >
                      <Pencil size={12} />
                      <span className="font-display text-[9px] uppercase tracking-wider">Edit</span>
                    </button>
                  </div>
                ) : isOn ? (
                  <div className="flex items-center justify-center w-full">
                    <p className="font-display text-[11px] uppercase tracking-[0.15em] text-[#5c5954]/20">
                      Tune in — Hover a film to preview
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wooden shelf — always visible */}
      <div className="preview-shelf" />
    </div>
  );
}
