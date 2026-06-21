import type { PassageCrossRef, PassageFootnote, PassageVerse } from "@/lib/bible/api";

export type VersePartStyle = "divine" | "inscription";

export type VersePart =
  | { kind: "text"; text: string; style?: VersePartStyle }
  | { kind: "footnote"; marker: number; text: string }
  | {
      kind: "crossref";
      label: string;
      book: string;
      chapter: number;
      verse: number;
      letter?: string;
    };

export function verseParts(v: PassageVerse): VersePart[] {
  if (v.parts && v.parts.length > 0) return v.parts;
  if (v.text) return [{ kind: "text", text: v.text }];
  return [];
}

/** Plain scripture text only — excludes inline note/xref markers (for red letter & highlights). */
export function versePlainText(v: PassageVerse): string {
  return verseParts(v)
    .filter((p): p is Extract<VersePart, { kind: "text" }> => p.kind === "text")
    .map((p) => p.text)
    .join("");
}

export function collectCrossRefs(parts: VersePart[]): PassageCrossRef[] {
  return parts
    .filter((p): p is Extract<VersePart, { kind: "crossref" }> => p.kind === "crossref")
    .map(({ label, book, chapter, verse }) => ({ label, book, chapter, verse }));
}

export function collectFootnotes(parts: VersePart[]): PassageFootnote[] {
  return parts
    .filter((p): p is Extract<VersePart, { kind: "footnote" }> => p.kind === "footnote")
    .map(({ marker, text }) => ({ marker, text }));
}

export function mergeVerseEntries(existing: PassageVerse, incoming: PassageVerse): PassageVerse {
  const parts = [...verseParts(existing), ...verseParts(incoming)];
  const text = versePlainText({ number: existing.number, text: "", parts });
  return {
    number: existing.number,
    text,
    parts,
    crossRefs: collectCrossRefs(parts),
    footnotes: collectFootnotes(parts),
  };
}

export function poetryLevelFromClass(cls: string): number {
  if (/\bq3\b/.test(cls)) return 3;
  if (/\bq2\b/.test(cls)) return 2;
  if (/\bq1\b/.test(cls) || /\bq\b/.test(cls)) return 1;
  return 0;
}

export function poetryParagraphClassName(level: number, isContinuation: boolean): string {
  if (level <= 0) return "";
  const base = `scripture-poetry scripture-poetry-q${Math.min(level, 3)}`;
  return isContinuation ? `${base} scripture-poetry-continue` : base;
}

export function styledTextClass(style?: VersePartStyle): string {
  if (style === "divine") return "scripture-divine-name";
  if (style === "inscription") return "scripture-inscription-sc";
  return "";
}
