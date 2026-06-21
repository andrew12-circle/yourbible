/** Pinned CSB text revision token — bump when API.Bible CSB snapshot changes. */
export const CSB_TEXT_REVISION = "api-bible-csb-2024";

export function passageTextRevisionForBible(bibleId: string, abbreviation?: string): string {
  const abbr = (abbreviation ?? "").toUpperCase();
  if (abbr === "CSB" || /christian\s+standard/i.test(abbreviation ?? "")) {
    return CSB_TEXT_REVISION;
  }
  return `api-bible-${bibleId.slice(0, 8)}`;
}
