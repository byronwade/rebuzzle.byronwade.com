/** Build a URL-safe slug for community puzzles / creator handles. */
export function slugifyHandle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function profilePathForUsername(username: string): string {
  return `/u/${encodeURIComponent(username)}`;
}

export function communityPuzzlePath(slug: string): string {
  return `/community/puzzles/${encodeURIComponent(slug)}`;
}
