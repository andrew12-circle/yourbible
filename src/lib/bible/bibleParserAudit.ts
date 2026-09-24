import { parsePassageHtml } from "./parsePassageHtml";
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
