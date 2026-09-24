from pathlib import Path

def put(path, text):
    p=Path(path);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
def change(path, old, new, count=1):
    p=Path(path);s=p.read_text()
    if old not in s:raise RuntimeError('Repair anchor missing: '+path)
    p.write_text(s.replace(old,new,count))

put('src/lib/bible/annotationAnchor.ts', '''/** Account-scoped user-selected excerpts. Saved only after a successful mark write. */
export interface AnnotationAnchor { text:string; prefix:string; suffix:string; start:number; end:number }
const memory=new Map<string,AnnotationAnchor>();
const keyFor=(owner:string,id:string)=>`yb-annotation-v1:${encodeURIComponent(owner)}:${encodeURIComponent(id)}`;
export function createAnnotationAnchor(text:string,start:number,end:number):AnnotationAnchor|undefined{
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>text.length)return undefined;
  return{text:text.slice(start,end),prefix:text.slice(Math.max(0,start-24),start),suffix:text.slice(end,end+24),start,end};
}
export function saveAnnotationAnchor(owner:string,id:string,anchor:AnnotationAnchor):void{
  const key=keyFor(owner,id);memory.set(key,anchor);try{localStorage.setItem(key,JSON.stringify(anchor));}catch{/* Session copy survives blocked storage. */}
}
export function readAnnotationAnchor(owner:string,id:string):AnnotationAnchor|undefined{
  const key=keyFor(owner,id);
  try{const raw=localStorage.getItem(key);if(raw){const v=JSON.parse(raw);if(typeof v.text==='string'&&typeof v.prefix==='string'&&typeof v.suffix==='string'&&Number.isInteger(v.start)&&Number.isInteger(v.end)&&v.start>=0&&v.end>v.start&&v.text.length===v.end-v.start)return v;}}catch{/* Never trust corrupt anchors. */}
  return memory.get(key);
}
export function resolveAnnotationAnchor(current:string,anchor:AnnotationAnchor):number|undefined{
  if(!anchor.text)return undefined;const candidates:number[]=[];let at=current.indexOf(anchor.text);
  while(at>=0){candidates.push(at);at=current.indexOf(anchor.text,at+1);}
  const contextual=candidates.filter(i=>current.slice(Math.max(0,i-anchor.prefix.length),i)===anchor.prefix&&current.slice(i+anchor.text.length,i+anchor.text.length+anchor.suffix.length)===anchor.suffix);
  return candidates.length===1?candidates[0]:contextual.length===1?contextual[0]:undefined;
}
''')
put('src/lib/bible/annotationText.ts', '''import type { PassageVerse } from "./api";
import type { ReaderHighlight } from "./verseSelection";
import { createAnnotationAnchor, resolveAnnotationAnchor } from "./annotationAnchor";
import { versePlainText } from "./verseParts";
/** A release timestamp cannot identify which text an old browser tab selected. */
export function protectAnnotationRanges(verse:PassageVerse,marks:ReaderHighlight[]):{marks:ReaderHighlight[];needsReview:boolean}{
  if(!verse.sourceBlocks?.length)return{marks,needsReview:false};
  const current=versePlainText(verse),previous=verse.annotationSourceText;let needsReview=false;
  const safe=marks.flatMap(mark=>{
    const start=mark.start_offset??mark.start,end=mark.end_offset??mark.end;
    if(start==null&&end==null)return[mark];
    if(previous===current&&!mark.source_anchor)return[mark];
    const anchor=mark.source_anchor??(previous!=null&&start!=null&&end!=null?createAnnotationAnchor(previous,start,end):undefined);
    const target=anchor?resolveAnnotationAnchor(current,anchor):undefined;
    if(target!=null&&anchor)return[{...mark,start_offset:target,end_offset:target+anchor.text.length,start:target,end:target+anchor.text.length}];
    needsReview=true;return[];
  });return{marks:safe,needsReview};
}
''')
p=Path('src/lib/bible/verseSelection.ts');s=p.read_text().replace('import type { Highlight } from "@/hooks/useUserData";', 'import type { AnnotationAnchor } from "./annotationAnchor";')
a=s.index('/** Merge highlight rows');s=s[:a]+'''export type ReaderHighlight = { source_anchor?: AnnotationAnchor; color:string; kind?:string; id?:string; created_at?:string; start_offset?:number|null;end_offset?:number|null;start?:number;end?:number };
/** Disjoint intervals; last input row wins. Never concatenate a character twice. */
export function highlightIntervalsForVerse(textLength:number,marks:readonly ReaderHighlight[]):HighlightInterval[]{
  if(!Number.isFinite(textLength)||textLength<=0)return[];
  const ranges=marks.flatMap(m=>{if((m.kind??"highlight")!=="highlight")return[];const a=m.start_offset??m.start??0,b=m.end_offset??m.end??textLength;if(!Number.isFinite(a)||!Number.isFinite(b))return[];const start=Math.max(0,Math.min(textLength,Math.trunc(a))),end=Math.max(0,Math.min(textLength,Math.trunc(b)));return end>start?[{start,end,color:m.color}]:[];});
  const edges=[...new Set(ranges.flatMap(r=>[r.start,r.end]))].sort((a,b)=>a-b),result:HighlightInterval[]=[];
  for(let i=0;i<edges.length-1;i++){const start=edges[i],end=edges[i+1],winner=[...ranges].reverse().find(r=>r.start<=start&&r.end>=end);if(!winner)continue;const last=result.at(-1);if(last?.end===start&&last.color===winner.color)last.end=end;else result.push({start,end,color:winner.color});}return result;
}
export type TextPart={text:string;color?:string};
export function sliceTextByHighlights(text:string,intervals:HighlightInterval[]):TextPart[]{
  const resolved=highlightIntervalsForVerse(text.length,intervals),parts:TextPart[]=[];let pos=0;
  for(const iv of resolved){if(iv.start>pos)parts.push({text:text.slice(pos,iv.start)});parts.push({text:text.slice(iv.start,iv.end),color:iv.color});pos=iv.end;}
  if(pos<text.length)parts.push({text:text.slice(pos)});return parts.length?parts:[{text}];
}
''';p.write_text(s)
put('src/lib/bible/readerSourceParagraphs.ts','''import type { PassageVerse } from "./api";
import { readerVerseFragment, sliceReaderVerse } from "./readerVerseFragments";
import { versePlainText } from "./verseParts";
export interface SourceParagraph { verses:PassageVerse[];level:number;alignment:"start"|"center"|"end";isContinuation:boolean }
/** Clip source paragraph boundaries against original verse offsets on this page. */
export function sourceParagraphsForReader(verses:PassageVerse[]):SourceParagraph[]|null{
  if(!verses.every(v=>(readerVerseFragment(v)?.original??v).sourceBlocks?.length))return null;
  const groups:SourceParagraph[]=[];
  for(const verse of verses){const fragment=readerVerseFragment(verse),original=fragment?.original??verse,start=fragment?.start??0,end=fragment?.end??versePlainText(original).length,blocks=original.sourceBlocks!;
    for(let i=0;i<blocks.length;i++){const block=blocks[i],a=Math.max(start,block.start),b=Math.min(end,blocks[i+1]?.start??end);if(b<=a)continue;let group=groups.at(-1);const alignment=block.alignment??"start";
      if(!group||(block.paragraphStart&&a===block.start)||block.level!==group.level||alignment!==group.alignment){group={verses:[],level:block.level,alignment,isContinuation:a>block.start||!block.paragraphStart};groups.push(group);}group.verses.push(sliceReaderVerse(original,a,b));
    }
  }return groups;
}
''')
p=Path('src/lib/bible/readerScriptureRender.tsx');s='import { sourceParagraphsForReader } from "./readerSourceParagraphs";\n'+p.read_text();s=s.replace('return groups.flatMap((verseGroup) => {','return groups.flatMap<ReactNode>((verseGroup) => {')
needle='    const poetryBlocks = resolvePoetryBlocks?.(verseGroup.bookAbbr, verseGroup.chapter) ?? [];'
assert needle in s
s=s.replace(needle,needle+'''
    const sourceParagraphs = sourceParagraphsForReader(verseGroup.verses);
    if (sourceParagraphs) return sourceParagraphs.flatMap((group) => {
      const first = group.verses[0], start = readerVerseFragment(first)?.start ?? 0;
      const heading = start === 0 ? headingMap.get(first.number) : undefined;
      const key = `${verseGroup.bookAbbr}-${verseGroup.chapter}-${first.number}-${start}`;
      return [
        ...(heading ? [<ScriptureHeading key={`h-${key}`} className={holman ? holmanHeadingClassName(verseGroup.bookAbbr) : undefined}>{holman ? holmanHeadingText(heading) : heading}</ScriptureHeading>] : []),
        <ScriptureParagraph key={`p-${key}`} poetryLevel={group.level} alignment={group.alignment}
          className={first.number === 1 && start === 0 ? "scripture-paragraph-chapter-open" : undefined} isContinuation={group.isContinuation}>
          {group.verses.map((v,index) => renderVerse(v,{bookAbbr:verseGroup.bookAbbr,chapter:verseGroup.chapter,paragraphIsContinuation:group.isContinuation,startsPrintedParagraph:index===0}))}
        </ScriptureParagraph>,
      ];
    });''',1);p.write_text(s)
change('src/components/scripture/ScriptureComponents.tsx','  poetryLevel = 0,','  poetryLevel = 0,\n  alignment,')
change('src/components/scripture/ScriptureComponents.tsx','  poetryLevel?: number;','  poetryLevel?: number;\n  alignment?: "start" | "center" | "end";')
change('src/components/scripture/ScriptureComponents.tsx','style={{ orphans: 2, widows: 2 }}','style={{ orphans: 2, widows: 2, ...(alignment && alignment !== "start" ? { textAlign: alignment } : {}) }}')
p=Path('src/lib/bible/readerVerseNode.tsx');s='import { protectAnnotationRanges } from "./annotationText";\nimport type { ReaderHighlight } from "./verseSelection";\n'+p.read_text()
s=s.replace(') => { start?: number; end?: number; color: string }[];', ') => ReaderHighlight[];')
s=s.replace('''(useBookSpread
        ? redSegmentsByChapter.get(`${verseBook}|${verseChapter}`)
        : redSegments) ?? new Map<number, JesusSegment[]>()''','''redSegmentsByChapter.get(`${verseBook}|${verseChapter}`) ??
        (verseBook === bookAbbr && verseChapter === chapter ? redSegments : new Map<number, JesusSegment[]>())''')
s=s.replace('''    const hlMarks = hlsFor(v.number, verseBook, verseChapter);
    const intervals = highlightIntervalsForVerse(plain.length, hlMarks);''','''    const annotationRanges = protectAnnotationRanges(original, hlsFor(v.number, verseBook, verseChapter));
    const intervals = highlightIntervalsForVerse(plain.length, annotationRanges.marks);''')
s=s.replace('''        key={`${verseBook}-${verseChapter}-${v.number}-${startOffset}`}
        data-verse=''','''        key={`${verseBook}-${verseChapter}-${v.number}-${startOffset}`}
        data-annotation-review={annotationRanges.needsReview || undefined}
        title={annotationRanges.needsReview ? "Saved range highlights are preserved but need review against restored Scripture text." : undefined}
        data-verse=''')
s=s.replace('''            aria-label={`Verse ${v.number}`}
            style''','''            aria-label={`Verse ${v.number}`}
            aria-description={annotationRanges.needsReview ? "Saved highlights need review after text restoration; no saved marks were deleted." : undefined}
            style''')
s=s.replace('''        <span className="verse-body-wrap">
          {wrappedBody}
          {note''','''          {note''')
s=s.replace('''          {note && startOffset === 0 ? (
            <button''','''          {note && startOffset === 0 ? (
            <span className="reader-note-anchor"><button''')
s=s.replace('className="inline-flex items-center align-middle ml-1 w-4 h-4 rounded-full bg-gold/20 text-gold-deep hover:bg-gold/40 transition-colors"','className="reader-note-trigger"')
s=s.replace('''              <NotebookPen className="w-2.5 h-2.5 m-auto" />
            </button>
          ) : null}
        </span>''','''              <NotebookPen className="w-2.5 h-2.5" aria-hidden="true" />
            </button></span>
          ) : null}
        <span className="verse-body-wrap">
          {wrappedBody}
        </span>''');p.write_text(s)
p=Path('src/lib/bible/readerPrintTypography.css');p.write_text(p.read_text()+'''
/* Decorations must not alter the character stream's line metrics. */
[data-reading-area].reader-print-text .red-letter { font-size:inherit;line-height:inherit;font-weight:inherit;letter-spacing:inherit;word-spacing:inherit;vertical-align:baseline; }
[data-reading-area].reader-print-text .marker-hl { padding:0;margin:0; }
[data-reading-area].reader-print-text .reader-note-anchor { display:inline-block;position:relative;width:0;height:0;margin:0;padding:0;vertical-align:baseline; }
[data-reading-area].reader-print-text .reader-note-trigger { position:absolute;inset-inline-start:-0.8em;bottom:0.2em;display:flex;align-items:center;justify-content:center;width:0.8em;height:0.9em;padding:0;border:0;color:hsl(var(--gold-deep));background:transparent; }
[data-reading-area].reader-print-text .reader-note-trigger:focus-visible { outline:2px solid currentColor;outline-offset:2px; }
''')
p=Path('src/hooks/useUserData.ts');s='import { createAnnotationAnchor, readAnnotationAnchor, saveAnnotationAnchor, type AnnotationAnchor } from "@/lib/bible/annotationAnchor";\n'+p.read_text();s=s.replace('export interface Highlight {\n  id: string;','export interface Highlight {\n  id: string;\n  created_at?: string;\n  source_anchor?: AnnotationAnchor;')
s=s.replace('        ...x,\n        kind:', '        ...x,\n        source_anchor: readAnnotationAnchor(user.id,x.id),\n        kind:')
s=s.replace('    verseLengths?: Map<number, number>,','    verseLengths?: Map<number, number>,\n    verseTexts?: Map<number, string>,')
s=s.replace('''      return {
        user_id: user.id,
        book,
        chapter,
        verse: r.verse,''','''      return {
        id: crypto.randomUUID(),
        user_id: user.id,
        book,
        chapter,
        verse: r.verse,''')
s=s.replace('''    if (insErr) throw insErr;
    await reload();''','''    if (insErr) throw insErr;
    for (let i=0;i<rows.length;i++) {
      const text=verseTexts?.get(rows[i].verse),range=ranges[i];
      const anchor=text==null?undefined:createAnnotationAnchor(text,range.start,range.end);
      if(anchor)saveAnnotationAnchor(user.id,rows[i].id,anchor);
    }
    await reload();''',1);p.write_text(s)
p=Path('src/hooks/useReaderSelectionMarks.ts');s=p.read_text().replace('    verseLengths: Map<number, number>,','    verseLengths: Map<number, number>,\n    verseTexts?: Map<number, string>,').replace('  verseLengths: Map<number, number>;','  verseLengths: Map<number, number>;\n  verseTexts?: Map<number, string>;');s=s.replace('  verseLengths,\n','  verseLengths,\n  verseTexts,\n');s=s.replace('setMarkRanges(sel.ranges, cssVar, "highlight", verseLengths)','setMarkRanges(sel.ranges, cssVar, "highlight", verseLengths, verseTexts)');p.write_text(s)
p=Path('src/pages/reader/ReaderPage.tsx');s=p.read_text().replace('  const verseLengths = useMemo(() => {','  const verseTexts = useMemo(() => new Map(verses.map(v => [v.number,versePlainText(v)])),[verses]);\n  const verseLengths = useMemo(() => {');s=s.replace('    setMarkRanges,\n    setMarks,\n    verseLengths,','    setMarkRanges,\n    setMarks,\n    verseLengths,\n    verseTexts,');p.write_text(s)
