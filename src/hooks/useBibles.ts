import { useQuery } from "@tanstack/react-query";
import { listBibles, type BibleEntry } from "@/lib/bible/api";

export const BIBLES_QUERY_KEY = ["bibles"] as const;

export function useBibles() {
  return useQuery<BibleEntry[]>({
    queryKey: BIBLES_QUERY_KEY,
    queryFn: listBibles,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });
}

export function pickDefaultBibleId(list: BibleEntry[], storedId: string | null): string {
  if (storedId && list.some((b) => b.id === storedId)) return storedId;

  const pref = ["CSB", "KJV", "WEB", "ESV", "NIV", "NLT"];
  const byAbbr = (code: string) => list.find((b) => b.abbreviation.toUpperCase() === code);
  const byName = list.find(
    (b) => /christian\s+standard\s+bible/i.test(b.name) || /\bcsb\b/i.test(b.name),
  );
  const found = byName ?? pref.map(byAbbr).find(Boolean) ?? list[0];
  return found?.id ?? "";
}
