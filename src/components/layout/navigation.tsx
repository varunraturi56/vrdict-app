"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Library,
  Film,
  Tv,
  Star,
  Bookmark,
  Radar,
  BarChart3,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { logout } from "@/app/login/actions/auth";

const navItems = [
  { href: "/favourites", label: "Favourites", icon: Star },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/discover", label: "Discover", icon: Radar },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

const bottomNavItems = [
  { href: "/", label: "Library", icon: Library },
  { href: "/favourites", label: "Favourites", icon: Star },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/discover", label: "Discover", icon: Radar },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="glass border-t border-border-glow">
        <div className="flex items-center justify-around px-1 py-1.5">
          {bottomNavItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "text-vr-blue"
                    : "text-[#5c5954] hover:text-[#9a968e]"
                }`}
              >
                <item.icon
                  size={22}
                  className={
                    isActive
                      ? "drop-shadow-[0_0_8px_rgba(14,165,233,0.6)]"
                      : ""
                  }
                />
                <span
                  className={`font-display text-[8px] uppercase tracking-wider ${
                    isActive ? "text-glow-blue" : ""
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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  movieCount?: number;
  tvCount?: number;
}

export function Sidebar({ collapsed, onToggle, movieCount = 0, tvCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mediaTab = searchParams.get("tab") || "movie";
  const isLibrary = pathname === "/";

  return (
    <aside
      className={`hidden lg:flex fixed left-0 top-0 bottom-0 flex-col z-50 border-r border-border-glow bg-bg-card/80 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Branding — VR blue, dict purple */}
      <div className={`pt-7 pb-5 ${collapsed ? "px-3 text-center" : "px-5"}`}>
        <h1 className={`font-display font-semibold tracking-wider ${collapsed ? "text-lg" : "text-2xl"}`}>
          {collapsed ? (
            <span className="text-vr-blue">VR</span>
          ) : (
            <>
              <span className="text-vr-blue">VR</span>
              <span className="text-vr-violet">dict</span>
            </>
          )}
        </h1>
        {!collapsed && (
          <p className="font-display text-[9px] uppercase tracking-[0.3em] text-[#5c5954] mt-1">
            Personal Cinelog
          </p>
        )}
      </div>

      {/* Gradient divider */}
      <div className={`${collapsed ? "mx-2" : "mx-4"} divider-gradient`} />

      {/* Nav items — vertically centered */}
      <nav className={`flex-1 flex flex-col justify-center space-y-0.5 ${collapsed ? "px-1.5" : "px-3"}`}>
        {/* Library — clickable parent, defaults to movies */}
        <Link
          href="/?tab=movie"
          className={`relative flex items-center rounded-lg transition-all duration-200 group ${
            collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2.5"
          } ${
            isLibrary
              ? "text-vr-blue bg-vr-blue/5"
              : "text-[#5c5954] hover:text-[#9a968e] hover:bg-white/[0.02]"
          }`}
          title={collapsed ? "Library" : undefined}
        >
          {isLibrary && (
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
              style={{
                background: "linear-gradient(180deg, #0ea5e9, #a78bfa)",
                boxShadow: "0 0 10px rgba(14, 165, 233, 0.5), 0 0 20px rgba(167, 139, 250, 0.3)",
              }}
            />
          )}
          <Library
            size={18}
            className={`shrink-0 ${
              isLibrary
                ? "drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]"
                : "group-hover:drop-shadow-[0_0_4px_rgba(14,165,233,0.15)]"
            }`}
          />
          {!collapsed && (
            <span className={`font-display text-xs uppercase tracking-wider ${
              isLibrary ? "text-glow-blue" : ""
            }`}>
              Library
            </span>
          )}
        </Link>

        {/* Movies / TV sub-items — only visible when on library page or always visible */}
        {isLibrary && (
          <>
            <Link
              href="/?tab=movie"
              className={`relative flex items-center rounded-lg transition-all duration-200 group ${
                collapsed ? "justify-center px-2 py-1.5" : "gap-2.5 pl-9 pr-4 py-1.5"
              } ${
                mediaTab === "movie"
                  ? "text-vr-blue"
                  : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
              title={collapsed ? `Movies (${movieCount})` : undefined}
            >
              <Film size={14} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className={`font-display text-[10px] uppercase tracking-wider flex-1 ${
                    mediaTab === "movie" ? "text-vr-blue" : ""
                  }`}>
                    Movies
                  </span>
                  {movieCount > 0 && (
                    <span className="font-mono-stats text-[9px] text-[#5c5954]">{movieCount}</span>
                  )}
                </>
              )}
            </Link>

            <Link
              href="/?tab=tv"
              className={`relative flex items-center rounded-lg transition-all duration-200 group ${
                collapsed ? "justify-center px-2 py-1.5" : "gap-2.5 pl-9 pr-4 py-1.5"
              } ${
                mediaTab === "tv"
                  ? "text-vr-violet"
                  : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
              title={collapsed ? `TV Shows (${tvCount})` : undefined}
            >
              <Tv size={14} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className={`font-display text-[10px] uppercase tracking-wider flex-1 ${
                    mediaTab === "tv" ? "text-vr-violet" : ""
                  }`}>
                    TV Shows
                  </span>
                  {tvCount > 0 && (
                    <span className="font-mono-stats text-[9px] text-[#5c5954]">{tvCount}</span>
                  )}
                </>
              )}
            </Link>
          </>
        )}

        {/* Divider */}
        <div className={`${collapsed ? "mx-1" : "mx-2"} divider-gradient opacity-20 !my-2`} />

        {/* Other nav items */}
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center rounded-lg transition-all duration-200 group ${
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2.5"
              } ${
                isActive
                  ? "text-vr-blue bg-vr-blue/5"
                  : "text-[#5c5954] hover:text-[#9a968e] hover:bg-white/[0.02]"
              }`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
                  style={{
                    background: "linear-gradient(180deg, #0ea5e9, #a78bfa)",
                    boxShadow:
                      "0 0 10px rgba(14, 165, 233, 0.5), 0 0 20px rgba(167, 139, 250, 0.3)",
                  }}
                />
              )}

              <item.icon
                size={18}
                className={`shrink-0 ${
                  isActive
                    ? "drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]"
                    : "group-hover:drop-shadow-[0_0_4px_rgba(14,165,233,0.15)]"
                }`}
              />
              {!collapsed && (
                <span
                  className={`font-display text-xs uppercase tracking-wider ${
                    isActive ? "text-glow-blue" : ""
                  }`}
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom area */}
      <div className={`pb-5 ${collapsed ? "px-1.5" : "px-4"}`}>
        <div className={`${collapsed ? "mx-1" : "mx-2"} divider-gradient opacity-30 mb-3`} />

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={`flex items-center w-full rounded-lg text-[#5c5954] hover:text-[#9a968e] hover:bg-white/[0.02] transition-all group mb-1 ${
            collapsed ? "justify-center px-2 py-2" : "gap-2 px-4 py-2"
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <>
              <PanelLeftClose size={16} />
              <span className="font-display text-xs uppercase tracking-wider">Collapse</span>
            </>
          )}
        </button>

        <form action={logout}>
          <button
            type="submit"
            className={`flex items-center w-full rounded-lg text-[#5c5954] hover:text-[#9a968e] hover:bg-white/[0.02] transition-all group ${
              collapsed ? "justify-center px-2 py-2" : "gap-2 px-4 py-2"
            }`}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut
              size={16}
              className="group-hover:drop-shadow-[0_0_4px_rgba(239,68,68,0.3)]"
            />
            {!collapsed && (
              <span className="font-display text-xs uppercase tracking-wider">
                Sign Out
              </span>
            )}
          </button>
        </form>
      </div>
    </aside>
  );
}
