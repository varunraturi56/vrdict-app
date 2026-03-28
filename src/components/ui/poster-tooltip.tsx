"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { posterUrl } from "@/lib/tmdb";
import type { Entry } from "@/lib/types";

interface PosterTooltipProps {
  entry: Entry;
  anchorRect: DOMRect;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function PosterTooltip({
  entry,
  anchorRect,
  onMouseEnter,
  onMouseLeave,
}: PosterTooltipProps) {
  const [mounted, setMounted] = useState(false);
  const [side, setSide] = useState<"right" | "left">("right");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Flip to left if tooltip would overflow viewport right edge
    const tooltipWidth = 300;
    const gap = 12;
    if (anchorRect.right + gap + tooltipWidth > window.innerWidth) {
      setSide("left");
    } else {
      setSide("right");
    }
  }, [anchorRect]);

  if (!mounted) return null;

  const gap = 12;
  const top = anchorRect.top + window.scrollY;
  const left =
    side === "right"
      ? anchorRect.right + gap
      : anchorRect.left - 300 - gap;

  // Arrow position (vertically centered on the card)
  const arrowTop = anchorRect.height / 2;

  const isMovie = entry.media_type === "movie";

  return createPortal(
    <div
      className="fixed z-[100] w-[300px] animate-fade-up"
      style={{
        top: `${anchorRect.top}px`,
        left: `${left}px`,
        maxHeight: "80vh",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Arrow */}
      <div
        className="absolute w-0 h-0"
        style={{
          top: `${Math.min(arrowTop, 60)}px`,
          ...(side === "right"
            ? {
                left: "-6px",
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                borderRight: "6px solid #0c0f1e",
              }
            : {
                right: "-6px",
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                borderLeft: "6px solid #0c0f1e",
              }),
        }}
      />

      {/* Card */}
      <div className="rounded-lg border border-border-glow bg-bg-card p-4 shadow-xl shadow-black/40">
        <h3 className="font-display text-sm font-medium text-[#e8e4dc] tracking-wide mb-1.5 leading-tight">
          {entry.title}
        </h3>

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-mono-stats text-sm text-vr-blue font-bold">
            {Number(entry.my_rating).toFixed(1)}
            <span className="text-[#5c5954] font-normal">/10</span>
          </span>
          {entry.tmdb_rating && (
            <>
              <span className="text-[#5c5954] text-xs">·</span>
              <span className="font-mono-stats text-xs text-[#5c5954]">
                TMDB {Number(entry.tmdb_rating).toFixed(1)}
              </span>
            </>
          )}
          <span className="text-[#5c5954] text-xs">·</span>
          <span className="font-mono-stats text-xs text-[#5c5954]">
            {entry.year}
          </span>
          {isMovie && entry.runtime ? (
            <>
              <span className="text-[#5c5954] text-xs">·</span>
              <span className="font-mono-stats text-xs text-[#5c5954]">
                {entry.runtime} min
              </span>
            </>
          ) : null}
          {!isMovie && entry.seasons ? (
            <>
              <span className="text-[#5c5954] text-xs">·</span>
              <span className="font-mono-stats text-xs text-[#5c5954]">
                {entry.seasons}S · {entry.episodes}E
              </span>
            </>
          ) : null}
        </div>

        {/* Genres */}
        <p className="text-[11px] text-[#9a968e] font-body mb-2">
          {entry.genres?.join(" · ")}
        </p>

        {/* Overview */}
        {entry.overview && (
          <p className="text-[11px] text-[#9a968e] font-body leading-relaxed mb-2.5 line-clamp-4">
            {entry.overview}
          </p>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[9px] font-display uppercase tracking-wider border border-vr-blue/20 bg-vr-blue/10 text-vr-blue/80"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
