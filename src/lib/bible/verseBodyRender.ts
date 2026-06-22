import type { PassageVerse } from "@/lib/bible/api";
import type { Segment } from "@/lib/bible/redLetter";
import { redLetterSegmentsForVerse } from "@/lib/bible/redLetter";
import { holmanPartsForVerse } from "@/lib/bible/holmanStudyLayout";
import type { ResolvedStudyLayout } from "@/lib/bible/readerStudyLayout";
import {
  styledTextClass,
  verseParts,
  versePlainText,
  type VersePart,
} from "@/lib/bible/verseParts";

export function sliceSegmentsForRange(
  segments: Segment[],
  start: number,
  end: number,
  plain: string,
): Segment[] {
  const out: Segment[] = [];
  let pos = 0;
  for (const seg of segments) {
    const segStart = pos;
    const segEnd = pos + seg.text.length;
    pos = segEnd;
    const oStart = Math.max(start, segStart);
    const oEnd = Math.min(end, segEnd);
    if (oEnd > oStart) {
      out.push({ text: plain.slice(oStart, oEnd), isJesus: seg.isJesus });
    }
  }
  return out;
}

/** Build inner HTML for paginator measurement — must match live reader DOM. */
export function buildVersePartsInnerHtml(
  v: PassageVerse,
  redSegments: Map<number, Segment[]>,
  escapeHtml: (s: string) => string,
  studyLayout: ResolvedStudyLayout = "inline",
): string {
  const parts = studyLayout === "holman" ? holmanPartsForVerse(v) : verseParts(v);
  const plain = versePlainText(v);
  const segments = redLetterSegmentsForVerse(redSegments, v.number, plain);

  let offset = 0;
  let html = "";

  for (const part of parts) {
    if (part.kind === "footnote") {
      if (studyLayout === "holman") {
        html += `<sup class="scripture-holman-mark scripture-holman-mark--footnote" title="${escapeHtml(part.text)}">${part.marker}</sup>`;
      } else {
        html += `<span class="scripture-footnote" title="${escapeHtml(part.text)}">[${part.marker}]</span>`;
      }
      continue;
    }
    if (part.kind === "crossref") {
      if (studyLayout === "holman") {
        const letter = escapeHtml(part.letter ?? "a");
        html += `<sup class="scripture-holman-mark scripture-holman-mark--xref">${letter}</sup>`;
      }
      continue;
    }

    const partStart = offset;
    offset += part.text.length;
    const partSegments = sliceSegmentsForRange(segments, partStart, offset, plain);
    let partHtml = partSegments
      .map((s) =>
        s.isJesus
          ? `<span class="red-letter">${escapeHtml(s.text)}</span>`
          : escapeHtml(s.text),
      )
      .join("");
    if (!partHtml && part.text) {
      partHtml = escapeHtml(part.text);
    }
    const styleClass = styledTextClass(part.style);
    html += styleClass ? `<span class="${styleClass}">${partHtml}</span>` : partHtml;
  }

  return html;
}

export function iterateVerseParts(v: PassageVerse): VersePart[] {
  return verseParts(v);
}

/** Cross-refs rendered below verse text in inline study layout (paginator measurement). */
export function buildVerseXrefsInnerHtml(
  v: PassageVerse,
  escapeHtml: (s: string) => string,
  studyLayout: ResolvedStudyLayout = "inline",
): string {
  if (studyLayout === "holman") return "";
  return verseParts(v)
    .filter((p): p is Extract<VersePart, { kind: "crossref" }> => p.kind === "crossref")
    .map((p) => `<span class="scripture-xref">${escapeHtml(p.label)}</span>`)
    .join(" ");
}
