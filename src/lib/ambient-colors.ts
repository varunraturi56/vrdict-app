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

export function getAmbientColor(pathname: string): AmbientColor {
  return AMBIENT_MAP[pathname] || AMBIENT_MAP["/"];
}

export function rgba(c: AmbientColor, a: number): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
}
