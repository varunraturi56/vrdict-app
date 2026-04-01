"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { BottomNav, TopNav } from "./navigation";
import { LibraryCountsProvider } from "@/lib/library-context";
import { EntriesProvider } from "@/lib/entries-context";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isSearchPage = pathname === "/search";
  const isTvLayoutPage = pathname === "/" || pathname === "/favourites" || pathname === "/watchlist" || pathname === "/discover" || pathname === "/stats";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense><TopNav /></Suspense>
      <main
        className={`lg:pt-[52px] ${
          isTvLayoutPage
            ? "h-[100dvh] overflow-hidden flex flex-col lg:h-screen"
            : "pb-20 lg:pb-0 flex-1"
        }`}
      >
        {children}
      </main>
      <Suspense><BottomNav /></Suspense>

      {/* Wall zone — darkened bottom edge so ambient glow reads against it */}
      <div className="wall-zone hidden lg:block" />

{/* Search FAB removed — search is inline on each page */}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <EntriesProvider>
      <LibraryCountsProvider>
        <AppShellInner>{children}</AppShellInner>
      </LibraryCountsProvider>
    </EntriesProvider>
  );
}
