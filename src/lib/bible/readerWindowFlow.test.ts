import { describe, expect, it } from "vitest";
import { buildReaderStream, type ReaderChapterPassage } from "./readerStream";
import { readerWindowStream, readerWindowTurn, readerStreamUnitId, readReaderWindowFlow } from "./readerWindowFlow";
const chapters: ReaderChapterPassage[]= [5,6,7,8].map(chapter=>({bookAbbr:"Act",bookName:"Acts",chapter,
  verses:Array.from({length:8},(_,i)=>({number:i+1,text:`Fixture ${chapter}:${i+1}`})),paragraphStarts:[1],headings:[],poetryBlocks:[]}));
const stream=buildReaderStream(chapters.slice(0,3),{plateFocus:{bookAbbr:"none",chapter:0}});
describe("continuous reading-window handoff",()=>{
  const options={bibleId:"fixture",bookAbbr:"Act",chapter:6,stream,splits:[0,5,10,15,20,25,27],page:2,pagesPerTurn:2,delta:1,firstPageNumber:100};
  it("extends before an underfilled final spread and starts with the exact unread unit",()=>{
    const turn=readerWindowTurn(options)!;
    expect(turn.chapter).toBe(7);
    expect(turn.flow.startId).toBe(readerStreamUnitId(stream[20]));
    expect(turn.flow.firstPageNumber).toBe(104);
    const extended=buildReaderStream(chapters.slice(1),{plateFocus:{bookAbbr:"none",chapter:0}});
    const next=readerWindowStream(extended,turn.flow);
    expect(readerStreamUnitId(next[0])).toBe(turn.flow.startId);
    expect(next.some(unit=>unit.chapter===8)).toBe(true);
  });
  it("restores the preceding window rather than pairing previously read verses again",()=>{
    const first=readerWindowTurn(options)!;
    const backward=readerWindowTurn({...options,chapter:7,page:0,delta:-1,flow:first.flow})!;
    expect(backward.chapter).toBe(6);
    expect(backward.flow.restoreId).toBe(readerStreamUnitId(stream[10]));
  });
  it("does not navigate away from a complete interior spread",()=>{
    expect(readerWindowTurn({...options,page:0})).toBeNull();
  });
  it("waits for a requested anchor instead of showing the wrong window",()=>{
    expect(readerWindowStream(stream,{...options,startId:"Act|8|v3",firstPageNumber:100})).toEqual([]);
  });
  it("ignores cuts from another edition or direct chapter selection",()=>{
    const flow={...options,startId:"Act|7|v3",firstPageNumber:100};
    expect(readReaderWindowFlow({readerWindowFlow:flow},"other","Act",6)).toBeUndefined();
    expect(readReaderWindowFlow({readerWindowFlow:flow},"fixture","Act",8)).toBeUndefined();
  });
});
