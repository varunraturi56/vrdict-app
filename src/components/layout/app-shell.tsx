"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { BottomNav, TopNav } from "./navigation";
import { LibraryCountsProvider } from "@/lib/library-context";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isSearchPage = pathname === "/search";
  const isTvLayoutPage = pathname === "/" || pathname === "/favourites";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense><TopNav /></Suspense>
      <main
        className={`pb-20 lg:pb-0 lg:pt-[52px] ${
          isTvLayoutPage
            ? "lg:h-screen lg:overflow-hidden lg:flex lg:flex-col lg:pb-0"
            : "flex-1"
        }`}
      >
        {children}
      </main>
      <Suspense><BottomNav /></Suspense>

      {/* Wall zone — darkened bottom edge so ambient glow reads against it */}
      <div className="wall-zone hidden lg:block" />

      {!isSearchPage && (
        <Link
          href="/search"
          className="fixed z-40 bottom-20 right-4 lg:hidden w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(14,165,233,0.4)]"
          style={{
            background: "linear-gradient(135deg, #0ea5e9, #a78bfa)",
          }}
        >
          <Search size={20} />
        </Link>
      )}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LibraryCountsProvider>
      <AppShellInner>{children}</AppShellInner>
    </LibraryCountsProvider>
  );
}
