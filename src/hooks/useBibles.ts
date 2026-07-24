import { useQuery } from "@tanstack/react-query";
import { listBibles, type BibleEntry } from "@/lib/bible/api";
import { API_BIBLE_EDITIONS } from "@/lib/bible/bibleEditions";
import { EOTC_BIBLE_ENTRY, EOTC_BIBLE_ID, readCanon, WLC_BIBLE_ENTRY } from "@/lib/bible/canon";

export const BIBLES_QUERY_KEY = ["bibles"] as const;
export const LS_BIBLE_LANGUAGE_KEY = "yb.bibleLanguage";

export const LOCAL_BIBLE_FALLBACKS: BibleEntry[] = [
  { ...EOTC_BIBLE_ENTRY },
  { ...WLC_BIBLE_ENTRY },
  {
    ...API_BIBLE_EDITIONS.CSB,
    language: { id: "eng", name: "English" },
    description: "Bundled Christian Standard Bible",
  },
];

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
    queryFn: () => listBiblesWithLocalFallback(language),
    initialData: localBibleFallbacks(language),
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });
}

export function pickDefaultBibleId(list: BibleEntry[], storedId: string | null): string {
  const rawChoices = list.length > 0 ? list : LOCAL_BIBLE_FALLBACKS;
  const canon = readCanon();
  if (canon === "ethiopian" && rawChoices.some((b) => b.id === EOTC_BIBLE_ID)) {
    return EOTC_BIBLE_ID;
  }
  const choices = canon === "ethiopian" ? rawChoices : rawChoices.filter((b) => b.id !== EOTC_BIBLE_ID);
  if (storedId && choices.some((b) => b.id === storedId)) return storedId;

  const pref = ["CSB", "NKJV", "KJV", "WEB", "ESV", "NIV", "NLT"];
  const byAbbr = (code: string) => choices.find((b) => b.abbreviation.toUpperCase() === code);
  const byName = choices.find(
    (b) => /christian\s+standard\s+bible/i.test(b.name) || /\bcsb\b/i.test(b.name),
  );
  const byNkjv = choices.find(
    (b) => /new\s+king\s+james/i.test(b.name) || b.abbreviation.toUpperCase() === "NKJV",
  );
  const found = byName ?? pref.map(byAbbr).find(Boolean) ?? byNkjv ?? choices[0];
  return found?.id ?? "";
}

function localBibleFallbacks(language: string): BibleEntry[] {
  if (language === "all") return LOCAL_BIBLE_FALLBACKS;
  const matches = LOCAL_BIBLE_FALLBACKS.filter((b) => b.language.id === language);
  return mergeBibleEntries(matches, LOCAL_BIBLE_FALLBACKS);
}

async function listBiblesWithLocalFallback(language: string): Promise<BibleEntry[]> {
  try {
    const remote = await listBibles(language);
    return mergeBibleEntries(remote, localBibleFallbacks(language));
  } catch {
    return localBibleFallbacks(language);
  }
}

function mergeBibleEntries(primary: BibleEntry[], fallback: BibleEntry[]): BibleEntry[] {
  const seen = new Set<string>();
  const merged: BibleEntry[] = [];
  for (const entry of [...primary, ...fallback]) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    merged.push(entry);
  }
  return merged;
}
