/**
 * Text revision pinning — cache keys and passage metadata include this token so
 * a CSB snapshot change at API.Bible forces a fresh fetch instead of stale cache.
 */
/** Bump when passage payload shape or parser behavior changes materially. */
export const PASSAGE_PARSER_REVISION = "v6";

export const CSB_TEXT_REVISION = "api-bible-csb-2024";

export function passageTextRevisionKey(bibleId: string, abbreviation?: string): string {
  const abbr = (abbreviation ?? "").toUpperCase();
  if (abbr === "CSB" || /christian\s+standard/i.test(abbreviation ?? "")) {
    return CSB_TEXT_REVISION;
  }
  return `api-bible-${bibleId.slice(0, 8)}`;
}
