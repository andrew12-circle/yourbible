import { useQuery } from "@tanstack/react-query";
import { listBibles, type BibleEntry } from "@/lib/bible/api";
import { EOTC_BIBLE_ID, readCanon } from "@/lib/bible/canon";
import { isBundledBibleId } from "@/lib/bible/bibleEditions";

export const BIBLES_QUERY_KEY = ["bibles"] as const;
export const LS_BIBLE_LANGUAGE_KEY = "yb.bibleLanguage";
export const BUNDLED_READER_LANGUAGE = "eng";

export function readBibleLanguage(): string {
  try {
    const stored = localStorage.getItem(LS_BIBLE_LANGUAGE_KEY);
    if (!stored || stored === BUNDLED_READER_LANGUAGE) return BUNDLED_READER_LANGUAGE;

    // The reader no longer has remote translation fallbacks. Normalize legacy
    // language selections rather than leaving the selector with no local text.
    localStorage.setItem(LS_BIBLE_LANGUAGE_KEY, BUNDLED_READER_LANGUAGE);
    return BUNDLED_READER_LANGUAGE;
  } catch {
    return BUNDLED_READER_LANGUAGE;
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

/** Editions that can safely be used by the active reader canon. */
export function readerBibleOptions(list: BibleEntry[]): BibleEntry[] {
  if (readCanon() === "ethiopian") {
    return list.filter((bible) => bible.id === EOTC_BIBLE_ID);
  }

  // Do not let a legacy/API-only entry become the Protestant default. The
  // reader's guaranteed local editions are the only reliable choices here.
  return list.filter((bible) => isBundledBibleId(bible.id));
}

export function pickDefaultBibleId(list: BibleEntry[], storedId: string | null): string {
  const eligible = readerBibleOptions(list);
  if (readCanon() === "ethiopian") return eligible[0]?.id ?? "";
  if (storedId && eligible.some((b) => b.id === storedId)) return storedId;

  const pref = ["CSB", "NKJV", "KJV", "WEB", "ESV", "NIV", "NLT"];
  const byAbbr = (code: string) => eligible.find((b) => b.abbreviation.toUpperCase() === code);
  const byName = eligible.find(
    (b) => /christian\s+standard\s+bible/i.test(b.name) || /\bcsb\b/i.test(b.name),
  );
  const byNkjv = eligible.find(
    (b) => /new\s+king\s+james/i.test(b.name) || b.abbreviation.toUpperCase() === "NKJV",
  );
  const found = byName ?? pref.map(byAbbr).find(Boolean) ?? byNkjv;
  return found?.id ?? "";
}
