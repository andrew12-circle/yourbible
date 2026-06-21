/** Pinned edition revision tokens — bump when API.Bible snapshots change. */
export const CSB_TEXT_REVISION = "api-bible-csb-2024";
export const NKJV_TEXT_REVISION = "api-bible-nkjv-2024";

function isCsbEdition(abbreviation?: string, name?: string): boolean {
  const abbr = (abbreviation ?? "").toUpperCase();
  const label = name ?? abbreviation ?? "";
  return abbr === "CSB" || /christian\s+standard\s+bible/i.test(label) || /\bcsb\b/i.test(label);
}

function isNkjvEdition(abbreviation?: string, name?: string): boolean {
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
