import type { PassageVerse } from "./api";
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
