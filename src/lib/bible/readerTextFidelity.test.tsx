import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PassageVerse } from "./api";
import { createReaderVerseRenderer } from "./readerVerseNode";
import { redLetterSegmentsForVerse, splitJesusSpeechForChapter } from "./redLetter";
import { buildVersePartsInnerHtml, sliceSegmentsForRange } from "./verseBodyRender";
import { versePlainText } from "./verseParts";
const verse: PassageVerse = { number: 6, text: 'They prayed and laid their hands on them.', parts: [
  {kind:"text", text:"They prayed "},
  {kind:"crossref", label:"Acts 13:3",book:"Act",chapter:13,verse:3},
  {kind:"text",text:" and laid their hands on "},
  {kind:"crossref",label:"Acts 9:17",book:"Act",chapter:9,verse:17},
  {kind:"text",text:" them."},
] };
const plain = versePlainText(verse);
describe("Scripture character preservation", () => {
  it("segments the same text parts used for rendering, including marker whitespace", () => {
    const segments=splitJesusSpeechForChapter("Act",6,[verse]);
    expect(segments.get(6)?.map(s=>s.text).join("")).toBe(plain);
    expect(buildVersePartsInnerHtml(verse,segments,s=>s)).toBe(plain);
  });
  it.each(["inline", "holman"] as const)("preserves the last word and punctuation with highlights in %s mode", studyLayout => {
    const map=splitJesusSpeechForChapter("Act",6,[verse]);
    const render=createReaderVerseRenderer({ bibleId:"fixture",bookAbbr:"Act",chapter:6,useBookSpread:true,studyLayout,
      redSegments:map,redSegmentsByChapter:new Map([["Act|6",map]]),ulFor:()=>undefined,
      hlsFor:()=>[{start_offset:plain.length-5,end_offset:plain.length,color:"--hl-amber"}],noteFor:()=>undefined,
      onVerseNumberClick:()=>{},navigate:()=>{},setNoteOpen:()=>{} });
    const root=document.createElement("div"); root.innerHTML=renderToStaticMarkup(render(verse));
    expect(root.querySelector("[data-verse-body]")?.textContent).toBe(plain);
    expect(root.querySelector(".marker-hl-text")?.textContent).toBe("them.");
  });
  it("never trusts cached color offsets from another text revision", () => {
    expect(redLetterSegmentsForVerse(new Map([[6,[{text:verse.text,isJesus:true}]]]),6,plain)).toEqual([{text:plain,isJesus:false}]);
  });
  it("preserves characters even when an optional segment map ends too early", () => {
    expect(sliceSegmentsForRange([{text:"Short",isJesus:false}],0,plain.length,plain).map(s=>s.text).join("")).toBe(plain);
    expect(sliceSegmentsForRange([],plain.length-5,plain.length,plain)).toEqual([{text:"them.",isJesus:false}]);
  });
});
