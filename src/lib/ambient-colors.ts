export interface AmbientColor {
  r: number;
  g: number;
  b: number;
}

const AMBIENT_MAP: Record<string, AmbientColor> = {
  "/": { r: 0, g: 240, b: 255 },
  "/favourites": { r: 255, g: 184, b: 0 },
  "/watchlist": { r: 176, g: 38, b: 255 },
  "/discover": { r: 255, g: 0, b: 170 },
  "/stats": { r: 45, g: 212, b: 191 },
};

export type RGB = [number, number, number];

export const PAGE_GLOWS: Record<string, { movie: RGB; tv: RGB }> = {
  "/":           { movie: [14, 165, 233],  tv: [139, 92, 246] },
  "/favourites": { movie: [255, 184, 0],   tv: [200, 200, 210] },
  "/watchlist":  { movie: [139, 92, 246],  tv: [6, 182, 212] },
  "/discover":   { movie: [244, 114, 182], tv: [249, 115, 22] },
  "/stats":      { movie: [45, 212, 191],  tv: [45, 212, 191] },
};

export function getPageGlow(pathname: string, mediaTab: string): RGB {
  const colors = PAGE_GLOWS[pathname] || PAGE_GLOWS["/"];
  return mediaTab === "tv" ? colors.tv : colors.movie;
}

export function getSparkGlow(pathname: string, mediaTab: string): RGB {
  const colors = PAGE_GLOWS[pathname] || PAGE_GLOWS["/"];
  return mediaTab === "tv" ? colors.movie : colors.tv;
}

export function getAmbientColor(pathname: string): AmbientColor {
  return AMBIENT_MAP[pathname] || AMBIENT_MAP["/"];
}

export function rgba(c: AmbientColor, a: number): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
}
