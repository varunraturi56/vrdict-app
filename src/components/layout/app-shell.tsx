"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { BottomNav, Sidebar } from "./navigation";
import { LibraryCountsProvider, useLibraryCounts } from "@/lib/library-context";
import { SidebarProvider, useSidebarState } from "@/lib/sidebar-context";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isSearchPage = pathname === "/search";
  const isLibraryPage = pathname === "/";
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useSidebarState();
  const { counts } = useLibraryCounts();

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          movieCount={counts.movieCount}
          tvCount={counts.tvCount}
        />
      </Suspense>
      <main
        className={`pb-20 lg:pb-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-56"
        } ${
          isLibraryPage
            ? "lg:h-screen lg:overflow-hidden lg:flex lg:flex-col lg:pb-[150px]"
            : "flex-1"
        }`}
      >
        {children}
      </main>
      <Suspense><BottomNav /></Suspense>

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
    <SidebarProvider>
      <LibraryCountsProvider>
        <AppShellInner>{children}</AppShellInner>
      </LibraryCountsProvider>
    </SidebarProvider>
  );
}
