"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface MobileDropdownProps {
  value: string;
  options: { key: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
  rgb?: string;
}

export function MobileDropdown({ value, options, onChange, className = "", rgb = "14,165,233" }: MobileDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = options.find((o) => o.key === value)?.label || value || options[0]?.label;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 h-7 w-full px-3 rounded-lg bg-[#0e0e14] font-display text-[10px] uppercase tracking-wider transition-all"
        style={{ border: `1px solid rgba(${rgb},0.2)`, color: `rgb(${rgb})` }}
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown size={10} className={`shrink-0 opacity-50 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-full min-w-[120px] max-h-[200px] overflow-y-auto rounded-lg border border-border-glow/30 bg-[#0e0e14] shadow-2xl animate-drawer-enter tv-grid-scroll">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`w-full text-left px-3 py-2 font-display text-[10px] uppercase tracking-wider transition-colors ${
                opt.key === value
                  ? "bg-bg-deep/60"
                  : "text-[#5c5954] hover:text-[#9a968e] active:text-[#9a968e] hover:bg-bg-deep/30 active:bg-bg-deep/30"
              }`}
              style={opt.key === value ? { color: `rgb(${rgb})`, textShadow: `0 0 6px rgba(${rgb},0.4)` } : undefined}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
