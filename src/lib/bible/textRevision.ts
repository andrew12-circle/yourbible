/**
 * Text revision pinning — cache keys and passage metadata include edition tokens so
 * API.Bible snapshot changes force a fresh fetch instead of stale cache.
 */

/** Bump when passage payload shape or parser behavior changes materially. */
export const PASSAGE_PARSER_REVISION = "v6";

export const CSB_TEXT_REVISION = "api-bible-csb-2024";
export const NKJV_TEXT_REVISION = "api-bible-nkjv-2024";

export function isCsbEdition(abbreviation?: string, name?: string): boolean {
  const abbr = (abbreviation ?? "").toUpperCase();
  const label = name ?? abbreviation ?? "";
  return abbr === "CSB" || /christian\s+standard\s+bible/i.test(label) || /\bcsb\b/i.test(label);
}

export function isNkjvEdition(abbreviation?: string, name?: string): boolean {
  const abbr = (abbreviation ?? "").toUpperCase();
  const label = name ?? abbreviation ?? "";
  return abbr === "NKJV" || /new\s+king\s+james/i.test(label) || /\bnkjv\b/i.test(label);
}

export function passageTextRevisionForBible(
  bibleId: string,
  abbreviation?: string,
  name?: string,
): string {
  if (isCsbEdition(abbreviation, name)) return CSB_TEXT_REVISION;
  if (isNkjvEdition(abbreviation, name)) return NKJV_TEXT_REVISION;
  return `api-bible-${bibleId.slice(0, 8)}`;
}

/** @deprecated Use passageTextRevisionForBible */
export function passageTextRevisionKey(bibleId: string, abbreviation?: string): string {
  return passageTextRevisionForBible(bibleId, abbreviation);
}
