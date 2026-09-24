import type { PassageVerse } from "./api";
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
