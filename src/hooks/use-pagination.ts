"use client";

import { useState, useEffect, useMemo } from "react";

/**
 * Handles pagination with automatic page reset when dependencies change.
 * Used on Library, Favourites, Watchlist pages.
 */
export function usePagination<T>(
  items: T[],
  itemsPerPage: number,
  resetDeps: readonly unknown[]
) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

  const pagedItems = useMemo(
    () =>
      items.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [items, currentPage, itemsPerPage]
  );

  // Reset to page 1 when filters/sort change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCurrentPage(1); }, resetDeps);

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    pagedItems,
  };
}
