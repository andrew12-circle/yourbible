import { describe,expect,it } from 'vitest';
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
