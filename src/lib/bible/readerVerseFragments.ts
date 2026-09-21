import type { PassageVerse } from "./api";
import type { ReaderStreamUnit } from "./readerStream";
import { collectCrossRefs, collectFootnotes, verseParts, versePlainText, type VersePart } from "./verseParts";

/** Page boundaries are UTF-16 offsets in the ORIGINAL verse, like saved highlights. */
export interface ReaderTextRange { start: number; end: number }
export interface ReaderVerseFragment extends ReaderTextRange { original: PassageVerse }
type FragmentVerse = PassageVerse & { readerFragment?: ReaderVerseFragment };
export function readerVerseFragment(verse: PassageVerse | undefined): ReaderVerseFragment | undefined {
  return (verse as FragmentVerse | undefined)?.readerFragment;
}

/** Never normalize, trim, or insert characters while dividing Scripture into pages. */
export function sliceReaderVerse(original: PassageVerse, start: number, end: number): PassageVerse {
  const plain = versePlainText(original);
  if (start === 0 && end === plain.length) return original;
  const parts: VersePart[] = [];
  let offset = 0;
  for (const part of verseParts(original)) {
    if (part.kind !== "text") {
      // A marker at a cut belongs to the preceding text, not both pages.
      if ((offset > start && offset <= end) || (start === 0 && offset === 0)) parts.push(part);
      continue;
    }
    const next = offset + part.text.length;
    const a = Math.max(start, offset), b = Math.min(end, next);
    if (b > a) parts.push({ ...part, text: part.text.slice(a - offset, b - offset) });
    offset = next;
  }
  const fragment: FragmentVerse = {
    ...original, text: plain.slice(start, end), parts,
    footnotes: collectFootnotes(parts), crossRefs: collectCrossRefs(parts),
    readerFragment: { original, start, end },
  };
  return fragment;
}

/** Coalesce neighboring word units into one semantic verse fragment per page. */
export function appendReaderStreamVerse(verses: PassageVerse[], unit: Extract<ReaderStreamUnit, { kind: "verse" }>) {
  if (!unit.verseRange) { verses.push(unit.verse); return; }
  const last = verses.at(-1);
  const previous = last && readerVerseFragment(last);
  if (previous?.original === unit.verse && previous.end === unit.verseRange.start) {
    verses[verses.length - 1] = sliceReaderVerse(unit.verse, previous.start, unit.verseRange.end);
  } else {
    verses.push(sliceReaderVerse(unit.verse, unit.verseRange.start, unit.verseRange.end));
  }
}

/** Stable word cuts. Very long unbroken words also get grapheme-safe escape cuts. */
export function readerWordRanges(text: string): ReaderTextRange[] {
  const ranges: ReaderTextRange[] = [];
  for (const match of text.matchAll(/\S+\s*|\s+/gu)) {
    const start = match.index!;
    if (match[0].length <= 32) { ranges.push({ start, end: start + match[0].length }); continue; }
    // Intl.Segmenter keeps accents, surrogate pairs and joined characters intact.
    type Segments = Iterable<{ index: number }>;
    type SegmenterCtor = new (locale: undefined, options: { granularity: "grapheme" }) => { segment: (text: string) => Segments };
    const Segmenter = (Intl as typeof Intl & { Segmenter?: SegmenterCtor }).Segmenter;
    let fallbackIndex = 0;
    const segments: Segments = Segmenter ? new Segmenter(undefined, { granularity: "grapheme" }).segment(match[0])
      : Array.from(match[0], (character) => { const index = fallbackIndex; fallbackIndex += character.length; return { index }; });
    let cut = start, count = 0;
    for (const item of segments) {
      if (count === 16) { ranges.push({ start: cut, end: start + item.index }); cut = start + item.index; count = 0; }
      count += 1;
    }
    ranges.push({ start: cut, end: start + match[0].length });
  }
  return ranges;
}

/** Text remains a continuous stream; an illustration still owns one physical page. */
export function fragmentReaderStream(stream: ReaderStreamUnit[]): ReaderStreamUnit[] {
  return stream.flatMap((unit): ReaderStreamUnit[] => {
    if (unit.kind !== "verse") return [unit];
    const ranges = readerWordRanges(versePlainText(unit.verse));
    return ranges.length ? ranges.map((verseRange) => ({ ...unit, verseRange })) : [unit];
  });
}
