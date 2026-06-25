import type { PassageFootnote, PassageVerse } from "@/lib/bible/api";
import {
  verseGroupsFromStreamRange,
  type ReaderStreamUnit,
} from "@/lib/bible/readerStream";
import { verseParts, type VersePart } from "@/lib/bible/verseParts";

export type HolmanVerseGroup = { chapter: number; verses: PassageVerse[] };

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
  refs: {
    letter: string;
    label: string;
    book: string;
    targetChapter: number;
    targetVerse: number;
  }[];
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
      refs: group.map((entry) => ({
        letter: entry.letter,
        label: entry.label,
        book: entry.book,
        targetChapter: entry.targetChapter,
        targetVerse: entry.targetVerse,
      })),
    }));
}

/** Holman connections block: `1:1 a Ps 37:37 b Job 1:8` grouped by verse. */
export function formatHolmanXrefBlockLines(entries: HolmanXrefEntry[]): string[] {
  return groupHolmanXrefsByVerse(entries).map((group) => {
    const refs = group.refs.map((ref) => `${ref.letter} ${ref.label}`).join(" ");
    return `${group.chapter}:${group.verse} ${refs}`;
  });
}

export function versesHavePageFootnotes(verses: PassageVerse[]): boolean {
  return collectPageFootnotes(verses).length > 0;
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

/** Stable key so connections re-render when the visible page slice changes. */
export function holmanConnectionsKey(groups: HolmanVerseGroup[]): string {
  return groups
    .map((g) => `${g.chapter}:${g.verses.map((v) => v.number).join(",")}`)
    .join("|");
}

/** Page-scoped Holman verse groups — never the full chapter when paginated. */
export function holmanVerseGroupsForRenderedPage(opts: {
  scrollMode: boolean;
  useStreamReader: boolean;
  streamChapters: { chapter: number; verses: PassageVerse[] }[];
  chapter: number;
  verses: PassageVerse[];
  readerStream: ReaderStreamUnit[];
  navStreamSplits: number[];
  pageIdx: number;
  streamSlice: { verseGroups: { chapter: number; verses: PassageVerse[] }[] } | null;
  slice: PassageVerse[] | null;
}): HolmanVerseGroup[] {
  if (opts.scrollMode && opts.useStreamReader && opts.streamChapters.length > 0) {
    return opts.streamChapters.map((ch) => ({ chapter: ch.chapter, verses: ch.verses }));
  }
  if (opts.scrollMode && opts.verses.length > 0) {
    return [{ chapter: opts.chapter, verses: opts.verses }];
  }
  if (!opts.scrollMode && opts.streamSlice?.verseGroups.length) {
    return opts.streamSlice.verseGroups.map((g) => ({ chapter: g.chapter, verses: g.verses }));
  }
  if (!opts.scrollMode && opts.slice?.length) {
    return [{ chapter: opts.chapter, verses: opts.slice }];
  }
  if (opts.useStreamReader && opts.readerStream.length > 0 && opts.navStreamSplits.length >= 2) {
    const start = opts.navStreamSplits[opts.pageIdx];
    const end = opts.navStreamSplits[opts.pageIdx + 1];
    if (start != null && end != null && end > start) {
      return verseGroupsFromStreamRange(opts.readerStream, start, end).map((g) => ({
        chapter: g.chapter,
        verses: g.verses,
      }));
    }
  }
  return [];
}

/** Approximate CSS column break — first column verses, then second column. */
export function splitHolmanVerseGroupsByColumn(
  groups: HolmanVerseGroup[],
  columnCount: number,
): HolmanVerseGroup[][] {
  if (columnCount <= 1) return [groups];

  const columns: HolmanVerseGroup[][] = Array.from({ length: columnCount }, () => []);
  for (const group of groups) {
    const n = group.verses.length;
    if (n === 0) continue;
    const perCol = Math.max(1, Math.ceil(n / columnCount));
    let offset = 0;
    for (let col = 0; col < columnCount && offset < n; col += 1) {
      const chunk = group.verses.slice(offset, offset + perCol);
      offset += chunk.length;
      if (chunk.length === 0) continue;
      const existing = columns[col]!.find((entry) => entry.chapter === group.chapter);
      if (existing) existing.verses.push(...chunk);
      else columns[col]!.push({ chapter: group.chapter, verses: chunk });
    }
  }
  return columns;
}

function holmanConnectionsInnerHtml(
  groups: HolmanVerseGroup[],
  escapeHtml: (s: string) => string,
): string {
  const grouped = groupHolmanXrefsByVerse(collectHolmanXrefsFromGroups(groups));
  if (grouped.length === 0) return "";
  return grouped
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
}

export function buildHolmanPageFootnotesMeasureHtml(
  groups: { chapter: number; verses: PassageVerse[] }[],
  escapeHtml: (s: string) => string,
): string {
  const verses = groups.flatMap((group) => group.verses);
  const notes = collectPageFootnotes(verses);
  if (notes.length === 0) return "";
  const inner = notes
    .map(
      (note) =>
        `<span class="scripture-page-footnotes-line"><sup class="scripture-page-footnotes-marker">${note.marker}</sup><span>${escapeHtml(note.text)}</span></span>`,
    )
    .join("");
  return `<div class="${holmanPageFootnotesClassName()}">${inner}</div>`;
}

export function buildHolmanConnectionsMeasureHtml(
  groups: { chapter: number; verses: PassageVerse[] }[],
  escapeHtml: (s: string) => string,
  dualColumn = false,
): string {
  if (dualColumn) {
    const [leftGroups, rightGroups] = splitHolmanVerseGroupsByColumn(groups, 2);
    const leftInner = holmanConnectionsInnerHtml(leftGroups, escapeHtml);
    const rightInner = holmanConnectionsInnerHtml(rightGroups, escapeHtml);
    if (!leftInner && !rightInner) return "";
    const leftCell = leftInner
      ? `<div class="scripture-connections-col"><p class="${holmanConnectionsClassName()}">${leftInner}</p></div>`
      : `<div class="scripture-connections-col" aria-hidden="true"></div>`;
    const rightCell = rightInner
      ? `<div class="scripture-connections-col"><p class="${holmanConnectionsClassName()}">${rightInner}</p></div>`
      : `<div class="scripture-connections-col" aria-hidden="true"></div>`;
    return `<div class="scripture-connections-row scripture-connections-row--dual">${leftCell}${rightCell}</div>`;
  }

  const inner = holmanConnectionsInnerHtml(groups, escapeHtml);
  if (!inner) return "";
  return `<div class="scripture-connections-row scripture-connections-row-full"><p class="${holmanConnectionsClassName()}">${inner}</p></div>`;
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
