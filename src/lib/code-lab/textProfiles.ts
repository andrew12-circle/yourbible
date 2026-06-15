import type { TextProfileId } from "@/lib/code-lab/types";

export interface TextProfile {
  id: TextProfileId;
  label: string;
  isRtl: boolean;
  normalizeRaw(raw: string): string;
  normalizeQuery(term: string, caseSensitive?: boolean): string;
}

/** Strip Hebrew niqqud, cantillation, and non-letter chars. */
function hebrewConsonants(raw: string): string {
  let out = "";
  for (const ch of raw.normalize("NFC")) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x0591 && code <= 0x05c7) continue;
    if (code >= 0x05d0 && code <= 0x05ea) out += ch;
  }
  return out;
}

function latinLetters(raw: string, caseSensitive: boolean): string {
  let out = "";
  for (const ch of raw.normalize("NFC")) {
    if (/[A-Za-z]/.test(ch)) {
      out += caseSensitive ? ch : ch.toUpperCase();
    }
  }
  return out;
}

/** Ethiopic syllables as stream units (one Unicode code point per letter slot). */
function ethiopicLetters(raw: string): string {
  let out = "";
  for (const ch of raw.normalize("NFC")) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x1200 && code <= 0x137f) out += ch;
  }
  return out;
}

export const TEXT_PROFILES: Record<Exclude<TextProfileId, "auto">, TextProfile> = {
  "hebrew-consonants": {
    id: "hebrew-consonants",
    label: "Hebrew consonants",
    isRtl: true,
    normalizeRaw: hebrewConsonants,
    normalizeQuery: (term) => hebrewConsonants(term),
  },
  "latin-letters": {
    id: "latin-letters",
    label: "Latin letters (A–Z)",
    isRtl: false,
    normalizeRaw: (raw) => latinLetters(raw, false),
    normalizeQuery: (term, caseSensitive) => latinLetters(term, caseSensitive ?? false),
  },
  ethiopic: {
    id: "ethiopic",
    label: "Ethiopic syllables",
    isRtl: true,
    normalizeRaw: ethiopicLetters,
    normalizeQuery: (term) => ethiopicLetters(term),
  },
};

export function resolveProfile(
  profileId: TextProfileId,
  languageId?: string,
): TextProfile {
  if (profileId !== "auto") return TEXT_PROFILES[profileId];
  if (languageId === "heb" || languageId === "hbo") return TEXT_PROFILES["hebrew-consonants"];
  if (languageId === "amh" || languageId === "gez") return TEXT_PROFILES.ethiopic;
  return TEXT_PROFILES["latin-letters"];
}

export function profileForBibleId(bibleId: string, languageId?: string): TextProfile {
  if (bibleId === "wlc-hebrew") return TEXT_PROFILES["hebrew-consonants"];
  if (bibleId === "eotc-am-81") return TEXT_PROFILES.ethiopic;
  return resolveProfile("auto", languageId);
}
