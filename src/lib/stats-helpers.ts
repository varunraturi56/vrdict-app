/** True mean of my_rating across entries, one decimal. "0" for empty input. */
export function meanRating(entries: { my_rating: number }[]): string {
  if (entries.length === 0) return "0";
  return (entries.reduce((s, e) => s + e.my_rating, 0) / entries.length).toFixed(1);
}
