import { describe, it, expect } from "vitest";
import { meanRating } from "@/lib/stats-helpers";

describe("meanRating", () => {
  it("computes the true mean across all entries", () => {
    expect(meanRating([{ my_rating: 6 }, { my_rating: 6 }, { my_rating: 9 }])).toBe("7.0");
  });

  it("is weighted per title, not per medium", () => {
    // 3 titles at 6 and 1 at 10 → 28/4 = 7.0 (not (6+10)/2 = 8.0)
    expect(
      meanRating([{ my_rating: 6 }, { my_rating: 6 }, { my_rating: 6 }, { my_rating: 10 }])
    ).toBe("7.0");
  });

  it("returns 0 for empty input", () => {
    expect(meanRating([])).toBe("0");
  });
});
