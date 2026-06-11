const LS_RECENT = "yb.search.recent";
const MAX = 8;

export function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(LS_RECENT);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(query: string): void {
  const q = query.trim();
  if (q.length < 2) return;
  const next = [q, ...readRecentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(
    0,
    MAX,
  );
  try {
    localStorage.setItem(LS_RECENT, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
