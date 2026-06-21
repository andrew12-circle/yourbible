import type { PassageFootnote, PassageVerse } from "@/lib/bible/api";
import { verseParts, type VersePart } from "@/lib/bible/verseParts";

export function crossRefLetterAt(index: number): string {
  if (index < 26) return String.fromCharCode(97 + index);
  return `${String.fromCharCode(97 + (index % 26))}${Math.floor(index / 26)}`;
}

/** Assign Holman letter markers (a, b, c…) to cross-refs missing a publisher xo letter. */
export function assignCrossRefLetters(parts: VersePart[]): VersePart[] {
  let index = 0;
  return parts.map((part) => {
    if (part.kind !== "crossref") return part;
    if (part.letter) return part;
    const letter = crossRefLetterAt(index);
    index += 1;
    return { ...part, letter };
  });
}

export function holmanPartsForVerse(v: PassageVerse): VersePart[] {
  return assignCrossRefLetters(verseParts(v));
}

export interface HolmanXrefEntry {
  verse: number;
  chapter: number;
  letter: string;
  label: string;
  book: string;
  targetChapter: number;
  targetVerse: number;
}

export function collectHolmanXrefsFromVerses(
  verses: PassageVerse[],
  chapter: number,
): HolmanXrefEntry[] {
  const entries: HolmanXrefEntry[] = [];
  for (const verse of verses) {
    for (const part of holmanPartsForVerse(verse)) {
      if (part.kind !== "crossref") continue;
      entries.push({
        verse: verse.number,
        chapter,
        letter: part.letter ?? "a",
        label: part.label,
        book: part.book,
        targetChapter: part.chapter,
        targetVerse: part.verse,
      });
    }
  }
  return entries;
}

export interface HolmanVerseRefGroup {
  chapter: number;
  verse: number;
  refs: { letter: string; label: string }[];
}

export function collectHolmanXrefsFromGroups(
  groups: { chapter: number; verses: PassageVerse[] }[],
): HolmanXrefEntry[] {
  return groups.flatMap((group) => collectHolmanXrefsFromVerses(group.verses, group.chapter));
}

export function groupHolmanXrefsByVerse(entries: HolmanXrefEntry[]): HolmanVerseRefGroup[] {
  if (entries.length === 0) return [];
  const byVerse = new Map<string, HolmanXrefEntry[]>();
  for (const entry of entries) {
    const key = `${entry.chapter}:${entry.verse}`;
    const list = byVerse.get(key) ?? [];
    list.push(entry);
    byVerse.set(key, list);
  }
  return [...byVerse.entries()]
    .sort(([a], [b]) => {
      const [ac, av] = a.split(":").map(Number);
      const [bc, bv] = b.split(":").map(Number);
      return ac !== bc ? ac - bc : av - bv;
    })
    .map(([, group]) => ({
      chapter: group[0]!.chapter,
      verse: group[0]!.verse,
      refs: group.map((entry) => ({ letter: entry.letter, label: entry.label })),
    }));
}

/** Holman connections block: `1:1 a Ps 37:37 b Job 1:8` grouped by verse. */
export function formatHolmanXrefBlockLines(entries: HolmanXrefEntry[]): string[] {
  return groupHolmanXrefsByVerse(entries).map((group) => {
    const refs = group.refs.map((ref) => `${ref.letter} ${ref.label}`).join(" ");
    return `${group.chapter}:${group.verse} ${refs}`;
  });
}

export function collectPageFootnotes(verses: PassageVerse[]): PassageFootnote[] {
  const seen = new Set<number>();
  const out: PassageFootnote[] = [];
  for (const verse of verses) {
    for (const part of holmanPartsForVerse(verse)) {
      if (part.kind !== "footnote") continue;
      if (seen.has(part.marker)) continue;
      seen.add(part.marker);
      out.push({ marker: part.marker, text: part.text });
    }
  }
  return out.sort((a, b) => a.marker - b.marker);
}

export function holmanHeadingText(text: string): string {
  return text.toUpperCase();
}

export function holmanHeadingClassName(bookAbbr: string): string {
  const isPsalm = bookAbbr.toUpperCase() === "PS" || bookAbbr.toUpperCase() === "PSA";
  return isPsalm ? "scripture-heading scripture-heading-holman scripture-heading-holman-psalm" : "scripture-heading scripture-heading-holman";
}

export function holmanPageFootnotesClassName(): string {
  return "scripture-page-footnotes";
}

export function holmanConnectionsClassName(): string {
  return "scripture-connections";
}

export function buildHolmanConnectionsMeasureHtml(
  groups: { chapter: number; verses: PassageVerse[] }[],
  escapeHtml: (s: string) => string,
  rightColumn = true,
): string {
  const grouped = groupHolmanXrefsByVerse(collectHolmanXrefsFromGroups(groups));
  if (grouped.length === 0) return "";
  const inner = grouped
    .map((group, groupIndex) => {
      const anchor = `<strong class="scripture-connections-anchor">${group.chapter}:${group.verse}</strong>`;
      const refs = group.refs
        .map(
          (ref) =>
            ` <span class="scripture-connections-ref"><span class="scripture-connections-letter">${escapeHtml(ref.letter)}</span> ${escapeHtml(ref.label)}</span>`,
        )
        .join("");
      return `${groupIndex > 0 ? " " : ""}<span class="scripture-connections-entry">${anchor}${refs}</span>`;
    })
    .join("");
  const gutter = rightColumn ? `<div class="scripture-connections-gutter" aria-hidden="true"></div>` : "";
  return `<div class="scripture-connections-row">${gutter}<p class="${holmanConnectionsClassName()}">${inner}</p></div>`;
}

/** @deprecated Use buildHolmanConnectionsMeasureHtml */
export function buildHolmanColumnXrefsMeasureHtml(
  verses: PassageVerse[],
  chapter: number,
  escapeHtml: (s: string) => string,
): string {
  return buildHolmanConnectionsMeasureHtml([{ chapter, verses }], escapeHtml, false);
}

export function buildHolmanHeadingMeasureHtml(
  heading: string,
  bookAbbr: string,
  escapeHtml: (s: string) => string,
): string {
  return `<p class="${holmanHeadingClassName(bookAbbr)}">${escapeHtml(holmanHeadingText(heading))}</p>`;
}
