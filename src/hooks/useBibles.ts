import { useQuery } from "@tanstack/react-query";
import { listBibles, type BibleEntry } from "@/lib/bible/api";
import { EOTC_BIBLE_ID, readCanon } from "@/lib/bible/canon";

export const BIBLES_QUERY_KEY = ["bibles"] as const;
export const LS_BIBLE_LANGUAGE_KEY = "yb.bibleLanguage";

export function readBibleLanguage(): string {
  try {
    return localStorage.getItem(LS_BIBLE_LANGUAGE_KEY) ?? "eng";
  } catch {
    return "eng";
  }
}

export function useBibles(language = readBibleLanguage()) {
  return useQuery<BibleEntry[]>({
    queryKey: [...BIBLES_QUERY_KEY, language],
    queryFn: () => listBibles(language),
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });
}

export function pickDefaultBibleId(list: BibleEntry[], storedId: string | null): string {
  if (readCanon() === "ethiopian" && list.some((b) => b.id === EOTC_BIBLE_ID)) {
    return EOTC_BIBLE_ID;
  }
  if (storedId && list.some((b) => b.id === storedId)) return storedId;

  const pref = ["CSB", "NKJV", "KJV", "WEB", "ESV", "NIV", "NLT"];
  const byAbbr = (code: string) => list.find((b) => b.abbreviation.toUpperCase() === code);
  const byName = list.find(
    (b) => /christian\s+standard\s+bible/i.test(b.name) || /\bcsb\b/i.test(b.name),
  );
  const byNkjv = list.find(
    (b) => /new\s+king\s+james/i.test(b.name) || b.abbreviation.toUpperCase() === "NKJV",
  );
  const found = byName ?? pref.map(byAbbr).find(Boolean) ?? byNkjv ?? list[0];
  return found?.id ?? "";
}
