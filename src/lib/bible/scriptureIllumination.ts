import { cn } from "@/lib/utils";
import {
  redLetterSegmentsForVerse,
  type Segment,
} from "@/lib/bible/redLetter";

export type IlluminationKind = "chapter" | "section";

export type IlluminationState = {
  chapterCapUsed: boolean;
  chapterCapEligible: boolean;
};

/** Split leading punctuation/whitespace from the first body letter for drop caps. */
export function splitIlluminationLetter(text: string): {
  prefix: string;
  letter: string;
  rest: string;
} {
  const m = /^([\s"'“‘(\[]*)(.)(.*)$/su.exec(text);
  if (!m?.[2]) return { prefix: "", letter: "", rest: text };
  return { prefix: m[1], letter: m[2], rest: m[3] };
}

export function illuminationBodyStart(text: string): number {
  const { prefix, letter } = splitIlluminationLetter(text);
  return prefix.length + letter.length;
}

export function nextParagraphIllumination(
  state: IlluminationState,
  isContinuation: boolean,
  hasHeading: boolean,
): { kind: IlluminationKind | undefined; state: IlluminationState } {
  if (isContinuation) return { kind: undefined, state };
  if (hasHeading) return { kind: "section", state };
  if (!state.chapterCapUsed && state.chapterCapEligible) {
    return {
      kind: "chapter",
      state: { ...state, chapterCapUsed: true },
    };
  }
  return { kind: undefined, state };
}

export function scriptureParagraphClassName(
  isContinuation: boolean,
  illumination?: IlluminationKind,
): string {
  return cn(
    "scripture-paragraph text-justify hyphens-auto",
    isContinuation && "scripture-paragraph-continue",
    illumination && "scripture-dropcap",
    illumination === "chapter" && "scripture-dropcap-chapter",
    illumination === "section" && "scripture-dropcap-section",
  );
}

export function scriptureParagraphClassNameMeasure(
  isContinuation: boolean,
  illumination?: IlluminationKind,
): string {
  return cn(
    "scripture-paragraph text-justify",
    isContinuation && "scripture-paragraph-continue",
    illumination && "scripture-dropcap",
    illumination === "chapter" && "scripture-dropcap-chapter",
    illumination === "section" && "scripture-dropcap-section",
  );
}

export function illuminatedCapClassName(kind: IlluminationKind): string {
  return cn(
    "scripture-illuminated-cap",
    kind === "chapter" && "scripture-illuminated-cap--chapter",
    kind === "section" && "scripture-illuminated-cap--section",
  );
}

export function buildVerseInnerHtml(
  verseNum: number,
  text: string,
  redSegments: Map<number, Segment[]>,
  illuminate: IlluminationKind | undefined,
  escapeHtml: (s: string) => string,
): string {
  const segs = redLetterSegmentsForVerse(redSegments, verseNum, text);
  if (!illuminate) {
    return segs
      .map((s) =>
        s.isJesus
          ? `<span class="red-letter">${escapeHtml(s.text)}</span>`
          : escapeHtml(s.text),
      )
      .join("");
  }

  const { prefix, letter, rest } = splitIlluminationLetter(text);
  if (!letter) {
    return segs
      .map((s) =>
        s.isJesus
          ? `<span class="red-letter">${escapeHtml(s.text)}</span>`
          : escapeHtml(s.text),
      )
      .join("");
  }

  const bodyStart = prefix.length + letter.length;
  const capClass = illuminatedCapClassName(illuminate);
  let acc = 0;
  const bodyParts: string[] = [];
  for (const s of segs) {
    const sStart = acc;
    const sEnd = acc + s.text.length;
    acc = sEnd;
    if (sEnd <= bodyStart) continue;
    const chunkStart = Math.max(0, bodyStart - sStart);
    const chunk = s.text.slice(chunkStart);
    if (!chunk) continue;
    bodyParts.push(
      s.isJesus
        ? `<span class="red-letter">${escapeHtml(chunk)}</span>`
        : escapeHtml(chunk),
    );
  }

  return `${escapeHtml(prefix)}<span class="${capClass}" aria-hidden="true">${escapeHtml(letter)}</span>${bodyParts.join("")}`;
}
