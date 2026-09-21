import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { appendReaderStreamVerse, fragmentReaderStream, readerVerseFragment, readerWordRanges, sliceReaderVerse } from "./readerVerseFragments";
import { versePlainText } from "./verseParts";
import { buildReaderStream, sliceReaderPage, type ReaderStreamUnit } from "./readerStream";
import { paginateReaderStream } from "./paginateReaderStream";
import { readerStreamUnitId, readerWindowStream } from "./readerWindowFlow";
import { createReaderVerseRenderer } from "./readerVerseNode";
import { selectionToVerseRanges } from "./verseSelection";
import type { PassageVerse } from "./api";

const verse: PassageVerse = { number: 1, text: "Do not normalize this field", parts: [
  {kind:"text",text:"Jesus  "}, {kind:"footnote",marker:1,text:"A note"},
  {kind:"text",text:"said, “The "}, {kind:"text",text:"LORD",style:"divine"},
  {kind:"text",text:" is good.”  "},
] };
const unit = (v=verse): ReaderStreamUnit => ({kind:"verse",bookAbbr:"Mrk",bookName:"Mark",chapter:3,verse:v});
const renderer = (text: string) => createReaderVerseRenderer({
  bibleId:"test",bookAbbr:"Mrk",chapter:3,useBookSpread:false,studyLayout:"inline",
  redSegments:new Map([[1,[{text,isJesus:true}]]]),redSegmentsByChapter:new Map(),
  ulFor:()=>undefined,hlsFor:()=>[],noteFor:()=>undefined,onVerseNumberClick:()=>{},navigate:()=>{},setNoteOpen:()=>{},
});

describe("printed Bible word-boundary pages",()=>{
  it("preserves every character, style and note exactly once across word cuts",()=>{
    const text=versePlainText(verse), ranges=readerWordRanges(text);
    const fragments=ranges.map(range=>sliceReaderVerse(verse,range.start,range.end));
    expect(fragments.map(versePlainText).join("")).toBe(text);
    expect(fragments.flatMap(v=>v.parts??[]).filter(p=>p.kind==="footnote")).toHaveLength(1);
    expect(fragments.flatMap(v=>v.parts??[]).find(p=>p.kind==="text"&&p.style==="divine")).toMatchObject({text:"LORD"});
  });
  it("keeps emoji, accents and joined Unicode intact in long words",()=>{
    const text=("e\u0301👨‍👩‍👧‍👦").repeat(45);
    const pieces=readerWordRanges(text).map(range=>text.slice(range.start,range.end));
    expect(pieces.join("")).toBe(text);
    expect(pieces.every(piece=>!piece.startsWith("\u0301")&&!piece.startsWith("\u200d")&&!piece.endsWith("\u200d"))).toBe(true);
  });
  it("coalesces words into a semantic verse again before rendering",()=>{
    const out:PassageVerse[]=[];
    fragmentReaderStream([unit()]).forEach(u=>{if(u.kind==="verse")appendReaderStreamVerse(out,u)});
    expect(out).toHaveLength(1);expect(out[0]).toBe(verse);
  });
  it("splits even one extremely long verse into readable pages without losing its suffix",()=>{
    const long:PassageVerse={number:1,text:("Every word remains in Scripture. ").repeat(160)};
    const stream=fragmentReaderStream(buildReaderStream([{bookAbbr:"Mrk",bookName:"Mark",chapter:3,verses:[long],paragraphStarts:[1],headings:[],poetryBlocks:[]}],{plateFocus:{bookAbbr:"NONE",chapter:1}}));
    const splits=paginateReaderStream(stream,(start,end)=>stream.slice(start,end).reduce((n,u)=>n+(u.kind==="verse"?(u.verseRange!.end-u.verseRange!.start):0),0)<=240);
    const pages=splits.slice(0,-1).map((_,i)=>sliceReaderPage(stream,splits,i)!.verseGroups.flatMap(g=>g.verses));
    expect(pages.length).toBeGreaterThan(10);
    expect(pages.flat().map(versePlainText).join("")).toBe(long.text);
    expect(pages.every(vs=>vs.map(versePlainText).join("").length<=240)).toBe(true);
  });
  it("carries the exact first unread word into the next chapter window",()=>{
    const stream=fragmentReaderStream([unit()]);
    const unread=stream[3], id=readerStreamUnitId(unread);
    expect(id).toContain("@" );
    const next=readerWindowStream(fragmentReaderStream([unit()]),{bibleId:"test",bookAbbr:"Mrk",chapter:3,firstPageNumber:1,startId:id});
    expect(readerStreamUnitId(next[0])).toBe(id);
    expect(next.length).toBe(stream.length-3);
  });
  it("uses original red-letter offsets on a continuation and does not repeat its chapter number",()=>{
    const full=versePlainText(verse), start=full.indexOf("said");
    const fragment=sliceReaderVerse(verse,start,full.length);
    const root=document.createElement("div");root.innerHTML=renderToStaticMarkup(renderer(full)(fragment));
    const body=root.querySelector("[data-verse-body]")!;
    expect(body.textContent).toBe(full.slice(start));
    expect(body.querySelector(".red-letter")).not.toBeNull();
    expect(root.querySelector(".chapter-drop-cap,.verse-num")).toBeNull();
    expect(readerVerseFragment(fragment)?.original).toBe(verse);
  });
  it("maps a selection on the continued page to original verse offsets, excluding note markers",()=>{
    document.body.innerHTML='<article data-reading-area><span data-verse="1"><span data-verse-body="1" data-verse-start="20" data-verse-end="31">hello<sup>9</sup> world</span></span></article>';
    const body=document.querySelector("[data-verse-body]")!;
    const range=document.createRange();range.setStart(body.firstChild!,1);range.setEnd(body.lastChild!,4);
    expect(selectionToVerseRanges(range,new Map([[1,80]]))).toEqual([{verse:1,start:21,end:29}]);
    document.body.innerHTML="";
  });
});
