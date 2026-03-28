"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Library,
  Star,
  Bookmark,
  Radar,
  BarChart3,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/login/actions/auth";

const navItems = [
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
          {navItems.map((item) => {
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

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-[52px] items-center px-6 border-b border-border-glow bg-bg-card/90 backdrop-blur-xl">
      {/* Logo — far left */}
      <Link href="/" className="shrink-0 mr-auto">
        <h1 className="font-display text-xl font-semibold tracking-wider">
          <span className="text-vr-blue text-glow-blue">VR</span>
          <span className="text-vr-violet">dict</span>
        </h1>
      </Link>

      {/* Nav tabs — centered */}
      <nav className="flex items-center gap-8">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 transition-all duration-200 group ${
                isActive
                  ? "text-vr-blue"
                  : "text-[#5c5954] hover:text-[#9a968e]"
              }`}
            >
              <item.icon
                size={24}
                className={
                  isActive
                    ? "drop-shadow-[0_0_8px_rgba(14,165,233,0.6)]"
                    : "group-hover:drop-shadow-[0_0_4px_rgba(14,165,233,0.15)]"
                }
              />
              <span
                className={`font-display text-[9px] uppercase tracking-[0.15em] ${
                  isActive ? "text-glow-blue" : ""
                }`}
              >
                {item.label}
              </span>
            </Link>
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
