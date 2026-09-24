from pathlib import Path
import runpy
ns = runpy.run_path('scripts/.apply-fidelity-repair.py')
put, change = ns['put'], ns['change']
change('src/lib/bible/sourceTextParts.ts', '!?“”’', '!?”’')
p = Path('src/lib/bible/api.ts'); s = p.read_text()
s = 'import { PASSAGE_PARSER_REVISION } from "./textRevision";\n' + s
s = s.replace('{ kind: "text"; text: string; style?: VersePartStyle }', '{ kind: "text"; text: string; style?: VersePartStyle; isJesus?: boolean }')
s = s.replace('export interface PassageVerse {', '''export interface VerseSourceBlock {
  /** UTF-16 offset in versePlainText, not a display-line index. */
  start: number; paragraphStart: boolean; level: number;
  alignment?: "start" | "center" | "end";
}
export interface PassageVerse {''')
s = s.replace('  parts?: VersePart[];', '  parts?: VersePart[];\n  sourceBlocks?: VerseSourceBlock[];\n  annotationSourceText?: string;', 1)
s = s.replace('  textRevision?: string;', '  textRevision?: string;\n  rawContent?: string;\n  parserRevision?: string;', 1)
s = s.replace('const text = sanitizePubVerseText(', 'const text = v.sourceBlocks?.length ? versePlainText(v) : sanitizePubVerseText(', 1)
s = s.replace('    return {\n      number: v.number,', '    return {\n      ...v,\n      number: v.number,', 1)
s = s.replace('  return {\n    reference: raw.reference,', '  return {\n    ...raw,\n    reference: raw.reference,', 1)
s = s.replace('normalizePassage({ ...parsed, textRevision })', 'normalizePassage({ ...parsed, textRevision, rawContent, parserRevision: PASSAGE_PARSER_REVISION })')
p.write_text(s)
p = Path('src/lib/bible/verseParts.ts');s = p.read_text();a=s.index('export type VersePartStyle');b=s.index('export function verseParts',a)
s=s[:a]+'export type { VersePartStyle, VersePart } from "./api";\nimport type { VersePart, VersePartStyle } from "./api";\n\n'+s[b:];p.write_text(s)
p=Path('src/lib/bible/parsePassageHtml.ts');s=p.read_text()
a=s.index('export interface PassageVerse');b=s.index('export interface PassageHeading',a)
s=s[:a]+'''import type { PassageVerse, VerseSourceBlock } from "./api";
export type { PassageVerse } from "./api";
import { parseSourceHtml, sourceClasses, sourceParagraphs, sourceText, type SourceNode } from "./sourceHtml";
import { normalizeSourceParts } from "./sourceTextParts";

'''+s[b:]
s=s.replace('export function parseVerseHtmlToParts(', 'function parseLegacyVerseHtmlToParts(',1)
s=s.replace(r'/^([A-Z0-9]+)\.(\d+)\.(\d+)/i', r'/^([A-Z0-9]+)\.(\d+)(?:\.(\d+))?/i')
s=s.replace('const verse = parseInt(m[3]!, 10);','const verse = m[3] ? parseInt(m[3], 10) : 1;')
s=s.replace('parsed = parseBibleReference(label) ?? parsed;', 'const ref = parseBibleReference(label);\n    if (ref?.verse) parsed = { bookAbbr: ref.bookAbbr, chapter: ref.chapter, verse: ref.verse };')
s=s.replace('if (fallback) pushText(fallback);', 'if (fallback) parts.push({ kind: "footnote", marker: 0, text: `Cross-reference: ${fallback}` });')
s=s.replace('      pushText(xtText);','      if (xtText) parts.push({ kind: "footnote", marker: 0, text: `Cross-reference: ${xtText}` });')
a=s.index('/** Parse API.Bible HTML chapter content');b=s.index('/** Plain-text fallback',a)
s=s[:a]+r'''type InlineEvent = { kind: "verse"; number: number } | { kind: "break" } | { kind: "part"; part: VersePart };

/** Traverse nested speech/style markup before dividing at verse markers. */
function inlineSourceEvents(nodes: SourceNode[], html: string, footnoteStart = 0): { events: InlineEvent[]; nextFootnoteMarker: number } {
  const events: InlineEvent[] = [];
  let marker = footnoteStart;
  let crossRefLetter: string | undefined;
  const pushPart = (part: VersePart, jesus: boolean) => {
    if (part.kind === "text") events.push({ kind: "part", part: { ...part, isJesus: jesus } });
    else if (part.kind === "footnote") events.push({ kind: "part", part: { ...part, marker: ++marker } });
    else events.push({ kind: "part", part });
  };
  const visit = (children: SourceNode[], jesus = false, style?: VersePartStyle) => {
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (node.kind === "text") { if (node.value) pushPart({ kind: "text", text: node.value, ...(style ? { style } : {}) }, jesus); continue; }
      const classes = sourceClasses(node);
      if (["script", "style", "iframe", "object", "template", "noscript"].includes(node.tag)) continue;
      if (classes.has("v") || node.tag === "verse") {
        const raw = node.attrs["data-number"] ?? node.attrs.number ?? sourceText(node).trim();
        const number = /^\d+$/.test(raw) ? Number(raw) : NaN;
        if (Number.isInteger(number) && number > 0) events.push({ kind: "verse", number });
        continue;
      }
      if (classes.has("xo")) { const label = sourceText(node).trim(); crossRefLetter = /^[a-z]$/i.test(label) ? label : undefined; continue; }
      if (classes.has("sup") || classes.has("fr") || classes.has("va") || classes.has("vp")) continue;
      if (node.tag === "br") { events.push({ kind: "break" }); continue; }
      if (classes.has("f") || classes.has("fe") || node.tag === "note" || classes.has("xt") || classes.has("x") || node.tag === "figure" || node.tag === "img") {
        const result = parseLegacyVerseHtmlToParts(html.slice(node.start, node.end), 0);
        for (const part of result.parts) {
          if (part.kind === "text") {
            if (classes.has("xt") && /^\s*[—–-]\s*$/.test(sourceText(node))) pushPart({ kind: "text", text: "—" }, jesus);
            else if (part.text.trim()) pushPart({ kind: "footnote", marker: 0, text: `Cross-reference: ${part.text.trim()}` }, false);
          } else if (part.kind === "crossref" && crossRefLetter) pushPart({ ...part, letter: crossRefLetter }, false);
          else pushPart(part, false);
        }
        crossRefLetter = undefined;
        continue;
      }
      if (["ft", "fqa", "fq", "fk", "xop", "xot", "xnt", "notelink", "footnote", "crossref"].some((cls) => classes.has(cls))) continue;
      const nextJesus = jesus || classes.has("wj");
      const nextStyle = classes.has("nd") ? "divine" : classes.has("qs") || classes.has("selah") ? "selah" : classes.has("sc") ? "inscription" : style;
      if (classes.has("sc")) {
        const body = sourceText(node), next = children[i + 1];
        if (/^[A-Z]$/.test(body) && next?.kind === "text") {
          const tail = /^[a-z]+/.exec(next.value)?.[0] ?? "";
          if (tail) {
            pushPart({ kind: "text", text: joinSmallCapSpan(body, tail), style: "inscription" }, nextJesus);
            if (next.value.length > tail.length) pushPart({ kind: "text", text: next.value.slice(tail.length), ...(style ? { style } : {}) }, jesus);
            i++; continue;
          }
        }
        const previous = events.at(-1);
        if (/^[a-z]/.test(body) && previous?.kind === "part" && previous.part.kind === "text" && /[A-Z]$/.test(previous.part.text)) {
          const capital = previous.part.text.slice(-1);
          previous.part = { ...previous.part, text: previous.part.text.slice(0, -1) };
          pushPart({ kind: "text", text: capital + body, style: "inscription" }, nextJesus); continue;
        }
      }
      visit(node.children, nextJesus, nextStyle);
    }
  };
  visit(nodes);
  return { events, nextFootnoteMarker: marker };
}

export function parseVerseHtmlToParts(html: string, footnoteStart = 0): { parts: VersePart[]; nextFootnoteMarker: number } {
  const { events, nextFootnoteMarker } = inlineSourceEvents(parseSourceHtml(html).children, html, footnoteStart);
  const parts = events.flatMap((event): VersePart[] => event.kind === "part" ? [event.part] : event.kind === "break" ? [{ kind: "text", text: " ", isJesus: false }] : []);
  return { parts: normalizeSourceParts(parts), nextFootnoteMarker };
}

/** Preserve all body blocks, including centered poetry and leading continuation. */
export function parsePassageHtml(content: string, reference = ""): ParsedPassage {
  const root = parseSourceHtml(content), verseMap = new Map<number, PassageVerse>();
  const paragraphStarts: number[] = [], poetryBlocks: PoetryBlock[] = [], headings: PassageHeading[] = [];
  let currentVerse: number | null = null, marker = 0, lastLevel = 0;
  let nextHeading: string | undefined;
  const blocks = sourceParagraphs(root);
  for (const node of blocks.length ? blocks : [root]) {
    const classes = sourceClasses(node);
    const hasMarker = (child: SourceNode): boolean => child.kind === "element" && (sourceClasses(child).has("v") || child.tag === "verse" || child.children.some(hasMarker));
    const containsVerse = node.children.some(hasMarker);
    if (!containsVerse && [...classes].some((cls) => /^(s\d*|ms\d*|d|qa)$/.test(cls))) { nextHeading = cleanHeadingText(content.slice(node.openEnd, node.closeStart)); continue; }
    if (!containsVerse && [...classes].some((cls) => /^(c|cp|cl|ca|r|mr|sr|mt\d*|h\d*|toc\d*|rem|b)$/.test(cls))) continue;
    const poetryClass = [...classes].find((cls) => /^(q\d*|qm\d*|qc|qr|qd)$/.test(cls));
    const level = poetryClass ? Number(/\d+/.exec(poetryClass)?.[0] ?? 1) : 0;
    const alignment = classes.has("qc") || classes.has("pc") ? "center" : classes.has("qr") || classes.has("pr") || classes.has("pmr") ? "end" : "start";
    const result = inlineSourceEvents(node.children, content, marker); marker = result.nextFootnoteMarker;
    let buffer: VersePart[] = [], paragraphStart = true;
    const flush = () => {
      if (currentVerse == null) { buffer = []; return; }
      const parts = normalizeSourceParts(buffer); buffer = [];
      const plain = parts.filter((p) => p.kind === "text").map((p) => p.text).join("");
      if (!parts.length) return;
      const existing = verseMap.get(currentVerse), separator = existing?.text && plain ? " " : "";
      const block: VerseSourceBlock = { start: (existing?.text.length ?? 0) + separator.length, paragraphStart, level, alignment };
      if (existing) {
        const combined = [...(existing.parts ?? []), ...(separator ? [{ kind: "text" as const, text: separator, isJesus: false }] : []), ...parts];
        verseMap.set(currentVerse, { ...existing, parts: combined, text: existing.text + separator + plain,
          sourceBlocks: [...(existing.sourceBlocks ?? []), ...(plain ? [block] : [])], crossRefs: collectCrossRefs(combined), footnotes: collectFootnotes(combined) });
      } else if (plain) {
        verseMap.set(currentVerse, { number: currentVerse, text: plain, parts, sourceBlocks: [block], crossRefs: collectCrossRefs(parts), footnotes: collectFootnotes(parts) });
        if (paragraphStart) paragraphStarts.push(currentVerse);
        if (level !== lastLevel || level > 0) { poetryBlocks.push({ beforeVerse: currentVerse, level }); lastLevel = level; }
      }
      if (plain) {
        if (nextHeading && !existing) { headings.push({ beforeVerse: currentVerse, text: nextHeading }); nextHeading = undefined; }
        paragraphStart = false;
      }
    };
    for (const event of result.events) {
      if (event.kind === "part") buffer.push(event.part);
      else if (event.kind === "break") { flush(); paragraphStart = true; }
      else { flush(); currentVerse = event.number; }
    }
    flush();
  }
  const verses = [...verseMap.values()].sort((a,b) => a.number-b.number);
  if (verses.length && !paragraphStarts.includes(verses[0].number)) paragraphStarts.unshift(verses[0].number);
  return { reference, verses, paragraphStarts: [...new Set(paragraphStarts)], headings, poetryBlocks };
}

'''+s[b:]
p.write_text(s)
change('src/lib/bible/redLetter.ts', '    const text = versePlainText(v);', '''    const text = versePlainText(v);
    const sourceParts = v.parts?.filter((part) => part.kind === "text");
    if (sourceParts?.length && sourceParts.every((part) => typeof part.isJesus === "boolean")) {
      const segments: Segment[] = [];
      for (const part of sourceParts) {
        const last = segments.at(-1);
        if (last && last.isJesus === part.isJesus) last.text += part.text;
        else segments.push({ text: part.text, isJesus: part.isJesus === true });
      }
      result.set(v.number, segments); quoteDepth = 0; continue;
    }''')
change('src/lib/bible/canonical/types.ts', '  parts?: import("@/lib/bible/api").VersePart[];', '  parts?: import("@/lib/bible/api").VersePart[];\n  sourceBlocks?: import("@/lib/bible/api").VerseSourceBlock[];')
change('src/lib/bible/canonical/types.ts', '  cachedAt: number;', '  rawContent?: string;\n  cachedAt: number;')
change('src/lib/bible/canonical/passageToCanonical.ts', '    cachedAt: Date.now(),', '    rawContent: passage.rawContent,\n    cachedAt: Date.now(),')
change('src/lib/bible/canonical/passageToCanonical.ts', '    parts: v.parts,', '    parts: v.parts,\n    sourceBlocks: v.sourceBlocks,')
change('src/lib/bible/canonical/passageToCanonical.ts', '    textRevision: record.textRevision,', '    rawContent: record.rawContent,\n    parserRevision: record.parserRevision,\n    textRevision: record.textRevision,')
change('src/lib/bible/canonical/passageToCanonical.ts', '        parts: study?.parts,', '        parts: study?.parts,\n        sourceBlocks: study?.sourceBlocks,')
