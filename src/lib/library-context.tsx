"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface LibraryCounts {
  movieCount: number;
  tvCount: number;
}

const LibraryCountsContext = createContext<{
  counts: LibraryCounts;
  setCounts: (counts: LibraryCounts) => void;
}>({
  counts: { movieCount: 0, tvCount: 0 },
  setCounts: () => {},
});

export function LibraryCountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<LibraryCounts>({ movieCount: 0, tvCount: 0 });
  return (
    <LibraryCountsContext.Provider value={{ counts, setCounts }}>
      {children}
    </LibraryCountsContext.Provider>
  );
}

export function useLibraryCounts() {
  return useContext(LibraryCountsContext);
}
