import { describe, it, expect } from "vitest";
import {
  MAJOR_GENRES,
  DEFAULT_TAGS,
  MOODS,
  DISCOVER_MOODS,
  ERAS,
} from "@/lib/types";
import { GENRE_IDS } from "@/lib/tmdb";

describe("MAJOR_GENRES", () => {
  it("has 12 genres", () => {
    expect(MAJOR_GENRES).toHaveLength(12);
  });

  it("every genre has a matching TMDB genre ID", () => {
    for (const genre of MAJOR_GENRES) {
      expect(GENRE_IDS[genre]).toBeDefined();
    }
  });

  it("is sorted alphabetically", () => {
    const sorted = [...MAJOR_GENRES].sort();
    expect(MAJOR_GENRES).toEqual(sorted);
  });
});

describe("DEFAULT_TAGS", () => {
  it("has 17 tags", () => {
    expect(DEFAULT_TAGS).toHaveLength(17);
  });

  it("contains no duplicates", () => {
    const unique = new Set(DEFAULT_TAGS);
    expect(unique.size).toBe(DEFAULT_TAGS.length);
  });
});

describe("MOODS", () => {
  it("every mood genre exists in GENRE_IDS or MAJOR_GENRES", () => {
    for (const [, mood] of Object.entries(MOODS)) {
      for (const genre of mood.genres) {
        // Moods can reference genres outside MAJOR_GENRES (e.g. Family, History)
        expect(GENRE_IDS[genre]).toBeDefined();
      }
    }
  });
});

describe("DISCOVER_MOODS", () => {
  it("every discover mood genre exists in GENRE_IDS", () => {
    for (const [, mood] of Object.entries(DISCOVER_MOODS)) {
      for (const genre of mood.genres) {
        expect(GENRE_IDS[genre]).toBeDefined();
      }
    }
  });

  it("has 8 moods", () => {
    expect(Object.keys(DISCOVER_MOODS)).toHaveLength(8);
  });
});

describe("ERAS", () => {
  it("starts with 'All'", () => {
    expect(ERAS[0]).toBe("All");
  });

  it("has decades from 1950s to 2020s", () => {
    expect(ERAS).toContain("2020s");
    expect(ERAS).toContain("1950s");
  });
});
