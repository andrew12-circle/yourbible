// Diagnostic wrapper: preserve all assertions and real hook behavior; record stalled-window state.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
let source = readFileSync('scripts/test-bible-chapter-continuation.mjs', 'utf8');
const hook = `import {useReaderContinuation as original} from ${JSON.stringify(resolve('src/hooks/useReaderContinuation.ts'))};
export function useReaderContinuation(options) {
  const result=original(options);
  const value={scope:options.scope,after:options.after,through:options.through,closed:options.closed,baseReady:options.baseReady,enabled:options.enabled,refs:result.refs.map(r=>r.book.abbr+':'+r.chapter),chapters:result.chapters.map(r=>r.bookAbbr+':'+r.chapter),pending:result.pending,canExtend:result.canExtend,error:result.error?String(result.error):null};
  const history=window.__continuationHistory??=[];
  if(JSON.stringify(history.at(-1))!==JSON.stringify(value))history.push(value);
  if(history.length>100)history.shift();
  window.__continuationHistory=history;
  return result;
}`;
const demand = `export * from ${JSON.stringify(resolve('src/lib/bible/readerContinuation.ts'))};
import {readerNeedsContinuation as original} from ${JSON.stringify(resolve('src/lib/bible/readerContinuation.ts'))};
export function readerNeedsContinuation(splits,length,page,pagesPerTurn) {
  const result=original(splits,length,page,pagesPerTurn);
  window.__continuationDemand={splits,length,page,pagesPerTurn,result};
  return result;
}`;
const pagination = `export * from ${JSON.stringify(resolve('src/lib/bible/readerPageHistory.ts'))};
import {ReaderPageHistory} from ${JSON.stringify(resolve('src/lib/bible/readerPageHistory.ts'))};
import {readerStreamUnitId} from ${JSON.stringify(resolve('src/lib/bible/readerWindowFlow.ts'))};
const find=ReaderPageHistory.prototype.find, remember=ReaderPageHistory.prototype.remember;
const instances=new WeakMap();let nextId=0;
function report(instance, value) {
  if(!instances.has(instance))instances.set(instance,++nextId);
  const history=window.__pageCutHistory??=[];
  history.push({instance:instances.get(instance),path:window.__path,...value});
  if(history.length>250)history.shift();window.__pageCutHistory=history;
}
ReaderPageHistory.prototype.find=function(geometryKey,footer,chapters,stream,prefix) {
  const result=find.call(this,geometryKey,footer,chapters,stream,prefix);
  const first=stream[0]?readerStreamUnitId(stream[0]):'empty';
  const candidates=[...this.entries].map(([key,item])=>({key,footer:item.footerHeight,count:item.units.length,splits:item.splits,chapterRefs:item.chapters.map(text=>{const c=JSON.parse(text);return c.bookAbbr+':'+c.chapter}),chapterMismatch:chapters.findIndex((c,i)=>JSON.stringify(c)!==item.chapters[i])}));
  report(this,{kind:'find',geometryKey,footer,first,count:stream.length,chapterRefs:chapters.map(c=>c.bookAbbr+':'+c.chapter),prefix,result,candidates});
  return result;
};
ReaderPageHistory.prototype.remember=function(entry) {
  const result=remember.call(this,entry);
  report(this,{kind:'remember',geometryKey:entry.geometryKey,footer:entry.footerHeight,first:entry.stream[0]?readerStreamUnitId(entry.stream[0]):'empty',count:entry.stream.length,splits:entry.splits});
  return result;
};
`;
const marker='const server=await createServer';
if(!source.includes(marker)) throw new Error('Reader test setup changed');
source=source.replace(marker, `writeFileSync(join(scratch,'continuation-trace.ts'),${JSON.stringify(hook)});\nwriteFileSync(join(scratch,'demand-trace.ts'),${JSON.stringify(demand)});\nwriteFileSync(join(scratch,'pagination-trace.ts'),${JSON.stringify(pagination)});\n${marker}`);
source=source.replace('resolve:{alias:[', "resolve:{alias:[{find:'@/lib/bible/readerPageHistory',replacement:join(scratch,'pagination-trace.ts')},{find:'@/hooks/useReaderContinuation',replacement:join(scratch,'continuation-trace.ts')},{find:'@/lib/bible/readerContinuation',replacement:join(scratch,'demand-trace.ts')},");
const diagnostic='history:await page.evaluate(()=>window.__readerPositionHistory),';
if(!source.includes(diagnostic)) throw new Error('Reader failure diagnostic changed');
source=source.replace(diagnostic, `${diagnostic}pagination:await page.evaluate(()=>window.__pageCutHistory),continuation:await page.evaluate(()=>({history:window.__continuationHistory,demand:window.__continuationDemand,path:window.__path,rootBusy:document.querySelector('[data-bible-reader]')?.getAttribute('aria-busy'),busy:[...document.querySelectorAll('[aria-busy="true"]')].map(n=>({tag:n.tagName,classes:n.className,outer:n.outerHTML.slice(0,300)}))})),`);
const temporary=resolve('scripts/.short-chapter-trace-run.mjs');
writeFileSync(temporary,source);
try { await import(pathToFileURL(temporary).href); } finally { rmSync(temporary,{force:true}); }
