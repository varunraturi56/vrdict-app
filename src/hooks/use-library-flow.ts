"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { MediaType } from "@/lib/types";

export type FlowState =
  | { stage: "welcome" }
  | { stage: "category"; area: string }
  | { stage: "results"; area: string; mediaType: MediaType };

/**
 * Manages the desktop progressive-disclosure flow (welcome → category → results)
 * and keeps it in sync with URL query params.
 */
export function useLibraryFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mediaTab = (searchParams.get("tab") || "movie") as MediaType;
  const hasTab = searchParams.get("tab");

  const [flow, setFlow] = useState<FlowState>(
    hasTab
      ? { stage: "results", area: "Library", mediaType: (hasTab || "movie") as MediaType }
      : { stage: "welcome" }
  );

  // Sync flow with URL changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    const view = searchParams.get("view");
    if (tab) {
      setFlow({ stage: "results", area: "Library", mediaType: tab as MediaType });
    } else if (view === "library") {
      setFlow({ stage: "category", area: "Library" });
    } else {
      setFlow({ stage: "welcome" });
    }
  }, [searchParams]);

  // Explicit Home button reset
  useEffect(() => {
    function handleGoHome() { setFlow({ stage: "welcome" }); }
    window.addEventListener("vrdict:go-home", handleGoHome);
    return () => window.removeEventListener("vrdict:go-home", handleGoHome);
  }, []);

  const activeMediaType = flow.stage === "results" ? flow.mediaType : mediaTab;

  function handleWelcomeNavigate(area: "library" | "favourites" | "watchlist" | "discover" | "stats") {
    if (area === "library") {
      setFlow({ stage: "category", area: "Library" });
      router.push("/?view=library", { scroll: false });
    } else if (area === "favourites") {
      router.push("/favourites");
    } else if (area === "watchlist") {
      router.push("/watchlist");
    } else if (area === "discover") {
      router.push("/discover");
    } else if (area === "stats") {
      router.push("/stats");
    }
  }

  function handleCategorySelect(mediaType: MediaType) {
    setFlow({ stage: "results", area: "Library", mediaType });
    router.push(`/?tab=${mediaType}`, { scroll: false });
  }

  function handleBackToCategory() {
    setFlow({ stage: "category", area: "Library" });
    router.push("/?view=library", { scroll: false });
  }

  function handleBackToWelcome() {
    setFlow({ stage: "welcome" });
    router.push("/", { scroll: false });
  }

  return {
    flow,
    mediaTab,
    hasTab,
    activeMediaType,
    searchParams,
    router,
    handleWelcomeNavigate,
    handleCategorySelect,
    handleBackToCategory,
    handleBackToWelcome,
  };
}
