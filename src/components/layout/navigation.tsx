"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  Library,
  Star,
  Bookmark,
  Radar,
  BarChart3,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/login/actions/auth";
import { useLibraryCounts } from "@/lib/library-context";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/?view=library", label: "Library", icon: Library },
  { href: "/favourites", label: "Favourites", icon: Star },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/discover", label: "Discover", icon: Radar },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

// Per-tab accent colors: movie/tv text color, glow, bar underline, and sub-tab pill styles
interface TabColors {
  movie: string; tv: string;
  movieGlow: string; tvGlow: string;
  movieBarColor: string; movieBarGlow: string;
  tvBarColor: string; tvBarGlow: string;
  moviePill: string; tvPill: string;
}
const TAB_COLORS: Record<string, TabColors> = {
  "/":           { movie: "text-vr-blue",       tv: "text-vr-violet",      movieGlow: "drop-shadow-[0_0_8px_rgba(14,165,233,0.6)]",   tvGlow: "drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]",  movieBarColor: "rgba(14,165,233,0.6)",   movieBarGlow: "rgba(14,165,233,0.10)",   tvBarColor: "rgba(139,92,246,0.6)",   tvBarGlow: "rgba(139,92,246,0.10)",   moviePill: "text-vr-blue bg-vr-blue/10 border border-vr-blue/25",         tvPill: "text-vr-violet bg-vr-violet/10 border border-vr-violet/25" },
  "/favourites": { movie: "text-amber-400",     tv: "text-gray-300",       movieGlow: "drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]",   tvGlow: "drop-shadow-[0_0_8px_rgba(209,213,219,0.6)]", movieBarColor: "rgba(251,191,36,0.6)",   movieBarGlow: "rgba(251,191,36,0.10)",   tvBarColor: "rgba(200,200,210,0.6)", tvBarGlow: "rgba(200,200,210,0.10)", moviePill: "text-amber-400 bg-amber-400/10 border border-amber-400/25",   tvPill: "text-gray-300 bg-gray-300/10 border border-gray-300/25" },
  "/watchlist":  { movie: "text-vr-violet",     tv: "text-cyan-400",       movieGlow: "drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]",   tvGlow: "drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]",  movieBarColor: "rgba(139,92,246,0.6)",   movieBarGlow: "rgba(139,92,246,0.10)",   tvBarColor: "rgba(6,182,212,0.6)",   tvBarGlow: "rgba(6,182,212,0.10)",   moviePill: "text-vr-violet bg-vr-violet/10 border border-vr-violet/25",   tvPill: "text-cyan-400 bg-cyan-400/10 border border-cyan-400/25" },
  "/discover":   { movie: "text-pink-400",      tv: "text-orange-400",     movieGlow: "drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]",  tvGlow: "drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]",  movieBarColor: "rgba(244,114,182,0.6)",  movieBarGlow: "rgba(244,114,182,0.10)",  tvBarColor: "rgba(249,115,22,0.6)",  tvBarGlow: "rgba(249,115,22,0.10)",  moviePill: "text-pink-400 bg-pink-400/10 border border-pink-400/25",      tvPill: "text-orange-400 bg-orange-400/10 border border-orange-400/25" },
  "/stats":      { movie: "text-teal-400",      tv: "text-teal-400",       movieGlow: "drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]",   tvGlow: "drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]",  movieBarColor: "rgba(45,212,191,0.6)",   movieBarGlow: "rgba(45,212,191,0.10)",   tvBarColor: "rgba(45,212,191,0.6)",  tvBarGlow: "rgba(45,212,191,0.10)",  moviePill: "text-teal-400 bg-teal-400/10 border border-teal-400/25",      tvPill: "text-teal-400 bg-teal-400/10 border border-teal-400/25" },
};

function getTabColors(pathname: string) {
  if (pathname === "/") return TAB_COLORS["/"];
  for (const key of Object.keys(TAB_COLORS)) {
    if (key !== "/" && pathname.startsWith(key)) return TAB_COLORS[key];
  }
  return TAB_COLORS["/"];
}

// Mobile bottom nav items — separate from desktop navItems
const mobileNavItems = [
  { href: "/", label: "Home", icon: Home, color: "text-green-400", glow: "drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" },
  { href: "/?view=library", label: "Library", icon: Library, color: null, glow: null },
  { href: "/favourites", label: "Favourites", icon: Star, color: null, glow: null },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark, color: null, glow: null },
  { href: "/discover", label: "Discover", icon: Radar, color: null, glow: null },
  { href: "/stats", label: "Stats", icon: BarChart3, color: null, glow: null },
];

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mediaTab = searchParams.get("tab") || "movie";
  const view = searchParams.get("view");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="border-t border-border-glow bg-[#0a0a0e]">
        <div className="flex items-center justify-around px-1 py-1.5">
          {mobileNavItems.map((item) => {
            const isHome = item.href === "/";
            const isLibrary = item.href === "/?view=library";
            const isActive = isHome
              ? pathname === "/" && !searchParams.get("tab") && !view
              : isLibrary
              ? pathname === "/" && (!!searchParams.get("tab") || view === "library")
              : pathname.startsWith(item.href);

            const colorPath = isHome || isLibrary ? "/" : item.href;
            const colors = getTabColors(colorPath);
            const iconColor = isActive
              ? (item.color || (mediaTab === "tv" ? colors.tv : colors.movie))
              : "";
            const iconGlow = isActive
              ? (item.glow || (mediaTab === "tv" ? colors.tvGlow : colors.movieGlow))
              : "";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 ${
                  isActive
                    ? iconColor
                    : "text-[#5c5954] hover:text-[#9a968e]"
                }`}
              >
                <item.icon
                  size={22}
                  className={iconGlow}
                />
                <span
                  className={`font-display text-[8px] uppercase tracking-wider ${
                    isActive ? iconColor : ""
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mediaTab = searchParams.get("tab") || "movie";
  const { counts } = useLibraryCounts();
  const isLibrary = pathname === "/";
  const isFavourites = pathname === "/favourites";
  const isWatchlist = pathname === "/watchlist";
  const isDiscover = pathname === "/discover";
  const hasMediaTabs = isLibrary || isFavourites || isWatchlist || isDiscover;
  const [mediaTabsCollapsed, setMediaTabsCollapsed] = useState(false);
  const mediaTabsExpanded = hasMediaTabs && !mediaTabsCollapsed;

  return (
    <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-[52px] items-center px-6 border-b border-border-glow bg-bg-card/90 backdrop-blur-xl">
      {/* Logo + divider — far left */}
      <Link href="/" className="shrink-0 mr-auto flex items-center gap-2.5">
        <img src="/logo.png" alt="VRdict" className="w-10 h-10 rounded-lg" />
        <h1 className="font-display text-xl font-semibold tracking-wider">
          <span className="text-vr-blue text-glow-blue">VR</span>
          <span className="text-vr-violet">dict</span>
        </h1>
        <div className="w-px h-6 bg-gradient-to-b from-transparent via-vr-blue/40 to-transparent" />
      </Link>

      {/* Nav tabs — centered */}
      <nav className="flex items-center gap-8 transition-all duration-300">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" && !searchParams.get("tab") && !searchParams.get("view")
              : item.href === "/?view=library"
              ? pathname === "/" && (!!searchParams.get("tab") || searchParams.get("view") === "library")
              : pathname.startsWith(item.href);

          const isMediaTabHost = item.href === "/?view=library" || item.href === "/favourites" || item.href === "/watchlist" || item.href === "/discover";
          // Only show sub-tabs when a media tab is actually selected (not on category view)
          const hasSelectedTab = !!searchParams.get("tab");
          const isOnCategoryView = searchParams.get("view") === "library";
          const isThisTabActive = isActive;
          const isThisTabMediaHost = isMediaTabHost && isThisTabActive && hasSelectedTab && !isOnCategoryView;

          // Per-tab colors — Home gets green
          const isHomeItem = item.href === "/";
          const colorPath = item.href.startsWith("/?") ? "/" : item.href;
          const colors = getTabColors(colorPath);
          // Library on category view (no tab selected) gets default blue
          const isLibraryCategory = item.href === "/?view=library" && isOnCategoryView;
          const activeColor = isHomeItem ? "text-green-400" : isLibraryCategory ? colors.movie : (mediaTab === "tv" ? colors.tv : colors.movie);
          const activeGlow = isHomeItem ? "drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" : isLibraryCategory ? colors.movieGlow : (mediaTab === "tv" ? colors.tvGlow : colors.movieGlow);

          return (
            <div key={item.href} className="flex items-center gap-0 transition-all duration-300">
              <Link
                href={item.href}
                onClick={() => {
                  setMediaTabsCollapsed(false);
                }}
                className={`relative flex flex-col items-center gap-0.5 transition-all duration-200 group ${
                  isActive
                    ? activeColor
                    : "text-[#5c5954] hover:text-[#9a968e]"
                }`}
              >
                <item.icon
                  size={24}
                  className={
                    isActive
                      ? activeGlow
                      : "group-hover:drop-shadow-[0_0_4px_rgba(14,165,233,0.15)]"
                  }
                />
                <span
                  className={`font-display text-[9px] uppercase tracking-[0.15em] ${
                    isActive ? activeColor : ""
                  }`}
                >
                  {item.label}
                </span>
                {/* Active tab downward glow — matches tab color */}
                {isActive && (
                  <div
                    className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 w-12 h-[2px] rounded-full"
                    style={{
                      background: isHomeItem ? "rgba(34,197,94,0.6)" : isLibraryCategory ? "rgba(14,165,233,0.6)" : (mediaTab === "tv" ? colors.tvBarColor : colors.movieBarColor),
                      boxShadow: `0 4px 15px 2px ${isHomeItem ? "rgba(34,197,94,0.10)" : isLibraryCategory ? "rgba(14,165,233,0.10)" : (mediaTab === "tv" ? colors.tvBarGlow : colors.movieBarGlow)}`,
                    }}
                  />
                )}
              </Link>

              {/* Movies/TV sub-tabs — expand inline for Library & Favourites */}
              {isMediaTabHost && (
                <div
                  className="flex items-center overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxWidth: mediaTabsExpanded && isThisTabMediaHost ? 200 : 0,
                    opacity: mediaTabsExpanded && isThisTabMediaHost ? 1 : 0,
                    marginLeft: mediaTabsExpanded && isThisTabMediaHost ? 12 : 0,
                  }}
                >
                  <Link
                    href={`${item.href.startsWith("/?") || item.href === "/" ? "/" : item.href}?tab=movie`}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-all duration-200 ${
                      mediaTab === "movie"
                        ? colors.moviePill
                        : "text-[#5c5954] hover:text-[#9a968e] border border-transparent"
                    }`}
                  >
                    Movies
                  </Link>
                  <Link
                    href={`${item.href.startsWith("/?") || item.href === "/" ? "/" : item.href}?tab=tv`}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-all duration-200 ml-1.5 ${
                      mediaTab === "tv"
                        ? colors.tvPill
                        : "text-[#5c5954] hover:text-[#9a968e] border border-transparent"
                    }`}
                  >
                    TV
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sign out — far right */}
      <form action={logout} className="ml-auto shrink-0">
        <button
          type="submit"
          className="flex flex-col items-center gap-0.5 text-[#5c5954] hover:text-[#9a968e] transition-all group"
          title="Sign Out"
        >
          <LogOut
            size={24}
            className="group-hover:drop-shadow-[0_0_4px_rgba(239,68,68,0.3)]"
          />
          <span className="font-display text-[9px] uppercase tracking-[0.15em]">
            Sign Out
          </span>
        </button>
      </form>
    </header>
  );
}
