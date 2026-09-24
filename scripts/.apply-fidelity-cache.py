from pathlib import Path

def put(path,text):
    p=Path(path);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)

p=Path('src/lib/bible/passageCache.ts');s=p.read_text().replace('import { normalizePassage, type Passage }','import { normalizePassage, resolvePassageFromApi, type Passage }');s='import { versePlainText } from "./verseParts";\nimport { identifyReaderPassage } from "./readerPassageIdentity";\n'+s
a=s.index('export async function getCachedPassage')
s=s[:a]+'''function previousCacheKey(bibleId:string,book:string,chapter:number):string {
  return `${bibleId}|${book}|${chapter}|v11|reader-integrity-v1|${bibleDeliveryMode(bibleId)}`;
}
async function readRecord(db:IDBDatabase,key:string):Promise<CachedPassageRecord|undefined>{
  return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readonly"),request=tx.objectStore(STORE).get(key);request.onsuccess=()=>resolve(request.result as CachedPassageRecord|undefined);request.onerror=()=>reject(request.error);tx.onabort=()=>reject(tx.error??new Error("Cache read aborted"));});
}
async function writeRecord(db:IDBDatabase,row:CachedPassageRecord):Promise<void>{
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(row);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error("Cache write aborted"));});
}
function preserveAnnotationBaseline(passage:Passage,prior?:Passage):Passage{
  if(!prior)return passage;const previous=new Map(prior.verses.map(v=>[v.number,v]));
  return{...passage,verses:passage.verses.map(v=>{const old=previous.get(v.number);return old?{...v,annotationSourceText:old.annotationSourceText??versePlainText(old)}:v;})};
}
export async function getCachedPassage(bibleId:string,book:string,chapter:number):Promise<CachedPassageRecord|null>{
  try{
    const db=await openDb(),key=passageCacheKey(bibleId,book,chapter);let row=await readRecord(db,key);
    if(!row){
      const legacyKey=previousCacheKey(bibleId,book,chapter),legacy=await readRecord(db,legacyKey);
      if(!legacy||legacy.key!==legacyKey||!isPassageCacheFresh(legacy.cachedAt)||!legacy.passage.rawContent)return null;
      identifyReaderPassage(legacy.passage,bibleId,book,chapter);
      const reparsed=resolvePassageFromApi({reference:legacy.passage.reference,rawContent:legacy.passage.rawContent,textRevision:legacy.passage.textRevision});
      const passage=identifyReaderPassage(preserveAnnotationBaseline(reparsed,legacy.passage),bibleId,book,chapter);
      row={key,passage,cachedAt:legacy.cachedAt};await writeRecord(db,row);
    }
    if(row.key!==key||!isPassageCacheFresh(row.cachedAt))return null;
    const normalized=normalizePassage(row.passage),passage=identifyReaderPassage({...row.passage,...normalized},bibleId,book,chapter);
    return{...row,passage};
  }catch{return null;}
}
export async function setCachedPassage(bibleId:string,book:string,chapter:number,input:Passage):Promise<Passage>{
  let passage=input;
  try{
    const db=await openDb(),key=passageCacheKey(bibleId,book,chapter);
    const prior=await readRecord(db,key)??await readRecord(db,previousCacheKey(bibleId,book,chapter));
    if(prior){try{identifyReaderPassage(prior.passage,bibleId,book,chapter);passage=preserveAnnotationBaseline(input,prior.passage);}catch{/* Incorrect identity is not an annotation baseline. */}}
    await writeRecord(db,{key,passage,cachedAt:Date.now()});
  }catch{/* Storage failure cannot prevent displaying a validated passage. */}
  return passage;
}
''';p.write_text(s)
p=Path('src/lib/bible/fetchPassageWithCache.ts');s=p.read_text().replace('  await setCachedPassage(bibleId, book, chapter, verified);','  const stored = await setCachedPassage(bibleId, book, chapter, verified);').replace('  return verified;','  return stored ?? verified;');p.write_text(s)
put('src/lib/bible/sourcePlainAudit.ts',r'''import { parseSourceHtml, sourceClasses, sourceParagraphs, type SourceNode } from "./sourceHtml";
/** Independently visit all body paragraphs; never reuse the parser allowlist. */
export function sourceScriptureText(html:string):string{
  const root=parseSourceHtml(html),chunks:string[]=[];
  const ignored=new Set(["v","f","fe","x","xt","xo","fr","ft","fq","fqa","fk","sup","va","vp"]);
  const walk=(node:SourceNode)=>{if(node.kind==="text"){chunks.push(node.value);return;}if(["script","style","note","figure","template","iframe","object"].includes(node.tag))return;if([...sourceClasses(node)].some(c=>ignored.has(c)))return;if(node.tag==="br"){chunks.push(" ");return;}node.children.forEach(walk);};
  for(const block of sourceParagraphs(root)){if([...sourceClasses(block)].some(c=>/^(s\d*|ms\d*|d|qa|r|mr|sr|mt\d*|c|cp|cl|ca|b)$/.test(c)))continue;walk(block);chunks.push(" ");}
  return chunks.join("").replace(/\s+/g," ").trim();
}
export function sourceComparableText(text:string):string{return text.replace(/#\s*[—–−-]\s*#/g,"—").toLowerCase().replace(/\s+/g,"");}
''')
put('src/lib/bible/bibleParserAudit.ts','''import { parsePassageHtml } from "./parsePassageHtml";
import { sourceScriptureText, sourceComparableText } from "./sourcePlainAudit";
export function findDroppedVerselessText(html:string,parsedVerseText:string):string{
  const source=sourceScriptureText(html);return sourceComparableText(source)===sourceComparableText(parsedVerseText)?"":source;
}
export interface ChapterParseAudit {verseCount:number;parsedCharCount:number;orphanCharCount:number;orphanTextPreview:string;sourceMatches?:boolean}
export function auditChapterHtmlParse(html:string):ChapterParseAudit{
  const parsed=parsePassageHtml(html),text=parsed.verses.map(v=>v.text).join(" "),mismatch=findDroppedVerselessText(html,text);
  return{verseCount:parsed.verses.length,parsedCharCount:text.length,orphanCharCount:mismatch.length,orphanTextPreview:mismatch.slice(0,120),sourceMatches:mismatch.length===0};
}
export function chapterParseIsComplete(audit:ChapterParseAudit):boolean{return audit.sourceMatches!==false&&audit.orphanCharCount===0&&audit.verseCount>0;}
''')
put('src/lib/bible/sourceFidelity.test.tsx',r'''import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parsePassageHtml } from "./parsePassageHtml";
import { splitJesusSpeechForChapter } from "./redLetter";
import { versePlainText } from "./verseParts";
/** Independent browser DOM walk, not the production tokenizer. */
function originalSource(html:string){
  const doc=new DOMParser().parseFromString(html,"text/html"),result=new Map<number,{text:string;red:boolean[]}>();let verse:number|undefined;
  const ignore=new Set(["f","fe","x","xt","xo","fr","ft","fqa","fq","fk","sup","xop","xot","xnt"]);
  const add=(value:string,red:boolean)=>{if(!verse)return;const item=result.get(verse)??{text:"",red:[]};item.text+=value;item.red.push(...Array.from(value).map(()=>red));result.set(verse,item);};
  const walk=(node:Node,red=false)=>{if(node.nodeType===Node.TEXT_NODE){add(node.textContent??"",red);return;}if(!(node instanceof Element))return;if(["SCRIPT","STYLE","NOTE","FIGURE","TEMPLATE"].includes(node.tagName))return;if([...node.classList].some(c=>ignore.has(c)))return;if(node.classList.contains("v")){verse=Number(node.getAttribute("data-number")||node.textContent);return;}if(node.tagName==="BR"){add(" ",red);return;}for(const child of node.childNodes)walk(child,red||node.classList.contains("wj"));};
  for(const p of doc.querySelectorAll("p")){if([...p.classList].some(c=>/^(s\d*|ms\d*|d|qa|r|mr|sr|mt\d*|c|cp|cl|ca|b)$/.test(c)))continue;add(" ",false);walk(p);}return result;
}
const significant=(text:string)=>text.replace(/#\s*[—–−-]\s*#/g,"—").toLowerCase().replace(/\s+/gu,"");
const dir=join(process.cwd(),"src/lib/bible/fixtures/golden");
describe("original source text and speech, no provider requests",()=>{
  for(const file of readdirSync(dir).filter(n=>n.endsWith('.html')))it('preserves complete source and speech '+file,()=>{
    const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Provider blocked'));
    try{
      const html=readFileSync(join(dir,file),'utf8'),expected=originalSource(html),parsed=parsePassageHtml(html);
      expect(parsed.verses.map(v=>v.number)).toEqual([...expected.keys()]);
      const book=file.split('-')[1],chapter=Number(file.split('-')[2].split('.')[0]),red=splitJesusSpeechForChapter(book,chapter,parsed.verses);
      for(const v of parsed.verses){const source=expected.get(v.number)!;expect(significant(versePlainText(v)),file+':'+v.number).toBe(significant(source.text));expect(v.text).toBe(versePlainText(v));
        const sourceFlags=Array.from(source.text).map((ch,i)=>({ch,red:source.red[i]})).filter(({ch})=>/[\p{L}\p{N}]/u.test(ch)).map(s=>s.red);
        const actualFlags=red.get(v.number)!.flatMap(s=>Array.from(s.text).map(ch=>({ch,red:s.isJesus}))).filter(({ch})=>/[\p{L}\p{N}]/u.test(ch)).map(s=>s.red);
        expect(actualFlags,'publisher wj '+file+':'+v.number).toEqual(sourceFlags);
      }expect(network).not.toHaveBeenCalled();
    }finally{network.mockRestore();}
  });
});
''')
put('src/lib/bible/sourceStructure.test.tsx',r'''import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parsePassageHtml } from "./parsePassageHtml";
import { sourceParagraphsForReader } from "./readerSourceParagraphs";
import { createReaderVerseRenderer } from "./readerVerseNode";
import { renderScriptureParagraphNodes } from "./readerScriptureRender";
import { readerVerseFragment, sliceReaderVerse } from "./readerVerseFragments";
import { splitJesusSpeechForChapter } from "./redLetter";
import { findDroppedVerselessText } from "./bibleParserAudit";
import { versePlainText } from "./verseParts";
const html='<p class="qc"><span class="v">3</span><span class="wj">“First line.</span></p><p data-vid="MAT 5:3" class="q2"><span class="wj">Second line.</span></p><p class="p">The next day. <span class="v">4</span>Narration. <span class="wj">“Speech.”</span></p>';
describe('source blocks and original offsets',()=>{
 it('keeps poetry continuations and resets to prose inside a verse',()=>{const p=parsePassageHtml(html);expect(p.verses[0].text).toBe('“First line. Second line. The next day.');const groups=sourceParagraphsForReader(p.verses)!;expect(groups.map(p=>[p.level,p.alignment])).toEqual([[1,'center'],[2,'start'],[0,'start']]);expect(groups[2].verses.map(v=>v.number)).toEqual([3,4]);});
 it('preserves every character at every possible internal page cut',()=>{const verse=parsePassageHtml(html).verses[0],text=versePlainText(verse);for(let cut=1;cut<text.length;cut++){const pieces=[sliceReaderVerse(verse,0,cut),sliceReaderVerse(verse,cut,text.length)];const rebuilt=pieces.flatMap(v=>sourceParagraphsForReader([v])!.flatMap(p=>p.verses));expect(rebuilt.map(versePlainText).join('')).toBe(text);expect(rebuilt.every(v=>(readerVerseFragment(v)?.original??v)===verse)).toBe(true);}});
 it('renders internal source paragraphs without repeating the verse number',()=>{const p=parsePassageHtml(html),red=splitJesusSpeechForChapter('Mat',5,p.verses);const render=createReaderVerseRenderer({bibleId:'CSB',bookAbbr:'Mat',chapter:5,useBookSpread:true,studyLayout:'inline',redSegments:red,redSegmentsByChapter:new Map([['Mat|5',red]]),ulFor:()=>undefined,hlsFor:()=>[],noteFor:()=>undefined,onVerseNumberClick:()=>{},navigate:()=>{},setNoteOpen:()=>{}});const nodes=renderScriptureParagraphNodes([{bookAbbr:'Mat',chapter:5,verses:p.verses}],()=>new Set(p.paragraphStarts),()=>new Map(),render,()=>p.poetryBlocks);const root=document.createElement('div');root.innerHTML=renderToStaticMarkup(nodes);expect(root.querySelectorAll('button[aria-label="Verse 3"]')).toHaveLength(1);expect(root.querySelectorAll('p')).toHaveLength(3);expect(root.querySelector('p')?.style.textAlign).toBe('center');expect([...root.querySelectorAll('[data-verse-body="3"]')].map(n=>n.textContent).join('')).toBe(p.verses[0].text);});
 it('detects missing and inserted text independently',()=>{const text=parsePassageHtml(html).verses.map(v=>v.text).join(' ');expect(findDroppedVerselessText(html,text)).toBe('');expect(findDroppedVerselessText(html,'“First line. Narration. “Speech.”')).not.toBe('');expect(findDroppedVerselessText(html,text+' Nm 22–24')).not.toBe('');});
 it('preserves speech nested around verse markers and styles',()=>{const p=parsePassageHtml('<p><span class="wj"><span class="v">1</span>First <span class="nd">Lord</span>.<br/>Second. <span class="v">2</span>More.</span> Narrator.</p>');const red=splitJesusSpeechForChapter('Mat',1,p.verses);expect(red.get(2)?.filter(s=>s.isJesus).map(s=>s.text).join('')).toBe('More.');expect(red.get(2)?.filter(s=>!s.isJesus).map(s=>s.text).join('')).toBe(' Narrator.');expect(sourceParagraphsForReader(p.verses)).toHaveLength(2);});
 it('keeps unresolved references and scripts out of Scripture',()=>{const p=parsePassageHtml('<p><span class="v">1</span>Word<span class="f"><span class="ft"><span class="xt">unknown reference</span></span></span>. <script>bad text</script><style>bad text</style>End.</p>');expect(p.verses[0].text).toBe('Word. End.');expect(p.verses[0].footnotes?.some(n=>n.text.includes('unknown reference'))).toBe(true);});
 it('decodes only provider bridge syntax, preserving literal hashes and opening quote spaces',()=>{const p=parsePassageHtml('<p><span class="v">1</span>Question #1 #— #then “an answer.”</p>');expect(p.verses[0].text).toBe('Question #1 —then “an answer.”');});
});
''')
put('src/lib/bible/sourceCache.test.ts', '''import { IDBFactory } from 'fake-indexeddb';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const now=Date.now(),legacyKey='abc|Mat|5|v11|reader-integrity-v1|unsupported';
const rawContent='<p class="qc"><span class="v">3</span><span class="wj">First line.</span></p><p class="qc"><span class="wj">Second line.</span></p>';
async function seed(cachedAt=now,raw:string|undefined=rawContent,reference='Matthew 5'){
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('yb-passages',1);r.onupgradeneeded=()=>r.result.createObjectStore('passages',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 await new Promise<void>((resolve,reject)=>{const t=db.transaction('passages','readwrite');t.objectStore('passages').put({key:legacyKey,cachedAt,passage:{reference,rawContent:raw,verses:[{number:3,text:'First line.'}],paragraphStarts:[3],headings:[]}});t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});db.close();
}
beforeEach(()=>{vi.resetModules();vi.stubGlobal('indexedDB',new IDBFactory());vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Provider requests blocked'));});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('local source cache upgrade',()=>{
 it('reparses locally without resetting age or discarding the old annotation baseline',async()=>{await seed();const {getCachedPassage}=await import('./passageCache');const row=await getCachedPassage('abc','Mat',5);expect(row?.passage.verses[0].text).toBe('First line. Second line.');expect(row?.cachedAt).toBe(now);expect(row?.passage.verses[0].annotationSourceText).toBe('First line.');expect(row?.passage.rawContent).toBe(rawContent);expect(fetch).not.toHaveBeenCalled();expect((await getCachedPassage('abc','Mat',5))?.passage.verses[0].text).toBe(row?.passage.verses[0].text);});
 it('rejects another chapter identity',async()=>{await seed(now,rawContent,'John 5');const {getCachedPassage}=await import('./passageCache');expect(await getCachedPassage('abc','Mat',5)).toBeNull();});
 it('does not renew expired source through migration',async()=>{await seed(now-31*86400000);const {getCachedPassage}=await import('./passageCache');expect(await getCachedPassage('abc','Mat',5)).toBeNull();expect(fetch).not.toHaveBeenCalled();});
 it('does not pretend parsed-only records contain discarded text',async()=>{await seed(now,'');const {getCachedPassage}=await import('./passageCache');expect(await getCachedPassage('abc','Mat',5)).toBeNull();expect(fetch).not.toHaveBeenCalled();});
});
''')
put('src/lib/bible/annotationText.test.ts', '''import { describe,expect,it } from 'vitest';
import { protectAnnotationRanges } from './annotationText';
import { createAnnotationAnchor,readAnnotationAnchor,saveAnnotationAnchor,resolveAnnotationAnchor } from './annotationAnchor';
import { highlightIntervalsForVerse,sliceTextByHighlights } from './verseSelection';
const sourceBlocks=[{start:0,paragraphStart:true,level:0}];
describe('exact annotation ranges',()=>{
 it('resolves overlaps last-row-wins without duplicating text',()=>{const intervals=highlightIntervalsForVerse(10,[{start:0,end:7,color:'a'},{start:3,end:9,color:'b'},{start:4,end:6,color:'c'}]);expect(intervals).toEqual([{start:0,end:3,color:'a'},{start:3,end:4,color:'b'},{start:4,end:6,color:'c'},{start:6,end:9,color:'b'}]);expect(sliceTextByHighlights('0123456789',intervals).map(p=>p.text).join('')).toBe('0123456789');});
 it('clamps invalid ranges and independently normalizes slice input',()=>{expect(highlightIntervalsForVerse(4,[{start:-2,end:50,color:'a'},{start:NaN,end:3,color:'b'}])).toEqual([{start:0,end:4,color:'a'}]);expect(sliceTextByHighlights('0123456789',[{start:4,end:8,color:'b'},{start:0,end:6,color:'a'}]).map(p=>p.text).join('')).toBe('0123456789');});
 it('reanchors unique saved text without writing the original row',()=>{const mark={start_offset:6,end_offset:10,color:'a'};const r=protectAnnotationRanges({number:1,text:'First restored line. Last.',sourceBlocks,annotationSourceText:'First Last.'},[mark]);expect(r.needsReview).toBe(false);expect(r.marks[0].start_offset).toBe(21);expect(mark.start_offset).toBe(6);});
 it('holds unknown partial ranges even if an old tab gives them a new timestamp',()=>{expect(protectAnnotationRanges({number:1,text:'new words',sourceBlocks},[{start:0,end:3,color:'a',created_at:'2100-01-01T00:00:00Z'}])).toEqual({marks:[],needsReview:true});});
 it('preserves whole-verse and exactly anchored new highlights',()=>{const r=protectAnnotationRanges({number:1,text:'new words',sourceBlocks},[{color:'a'},{start:0,end:3,color:'b',source_anchor:createAnnotationAnchor('new words',0,3)}]);expect(r.needsReview).toBe(false);expect(r.marks).toHaveLength(2);expect(r.marks[1].start_offset).toBe(0);});
 it('separates device excerpts by account',()=>{const a=createAnnotationAnchor('old selected words',4,12)!;saveAnnotationAnchor('alice','range-1',a);expect(readAnnotationAnchor('alice','range-1')).toEqual(a);expect(readAnnotationAnchor('bob','range-1')).toBeUndefined();});
 it('does not guess between ambiguous occurrences',()=>{const a=createAnnotationAnchor('selected',0,8)!;expect(resolveAnnotationAnchor('selected selected',a)).toBeUndefined();expect(createAnnotationAnchor('words',-1,3)).toBeUndefined();});
});
''')
