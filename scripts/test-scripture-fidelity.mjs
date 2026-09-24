/** Offline geometry contract for the actual shared verse renderer. */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root=process.cwd(), scratch=mkdtempSync(join(root,'.fidelity-browser-'));
const output=process.env.RUNNER_TEMP||join(root,'fidelity-results');mkdirSync(output,{recursive:true});
let browser;let blocked=0;
try {
writeFileSync(join(scratch,'fixture.tsx'),`
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{createReaderVerseRenderer}from'@/lib/bible/readerVerseNode';
import{renderScriptureParagraphNodes}from'@/lib/bible/readerScriptureRender';
import '@/index.css';import '@/lib/bible/readerPrintTypography.css';
const text='The teacher spoke these words to everyone standing beside the narrow doorway. A listener asked another question, and the teacher answered with patience and care. '.repeat(3).trim();
const root=createRoot(document.getElementById('root'));
window.renderFidelity=({width,size,font,variant,columns=1})=>{
 const verse={number:12,text,annotationSourceText:text,sourceBlocks:[{start:0,paragraphStart:true,level:0}],parts:[{kind:'text',text,isJesus:variant!=='plain'}]};
 const renderVerse=createReaderVerseRenderer({bookAbbr:'Test',chapter:1,useBookSpread:false,studyLayout:'inline',redSegments:new Map([[12,[{text,isJesus:variant!=='plain'}]]]),redSegmentsByChapter:new Map(),
 ulFor:()=>undefined,hlsFor:()=>variant==='highlight'?[{start_offset:10,end_offset:text.length-10,color:'--hl-amber'}]:[],noteFor:()=>variant==='note'?{verse:12}:undefined,
 onVerseNumberClick:()=>{},navigate:()=>{},setNoteOpen:()=>{window.noteOpened=true}});
 const nodes=renderScriptureParagraphNodes([{bookAbbr:'Test',chapter:1,verses:[verse]}],()=>new Set([12]),()=>new Map(),renderVerse,()=>[]);
 flushSync(()=>root.render(<article data-reading-area className="reader-print-text" style={{fontFamily:font,fontSize:size+'px',width,margin:20,background:'#f5f0e5',color:'#28221e',padding:0}}>
 <div style={{columnCount:columns,columnGap:'1.5em',columnFill:'auto',height:columns===2?400:undefined}}>{nodes}</div></article>));
 return text;
};
`);
const built=await build({entryPoints:[join(scratch,'fixture.tsx')],bundle:true,write:false,external:['/images/*'],outdir:scratch,format:'iife',platform:'browser',jsx:'automatic',alias:{'@':join(root,'src')},define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{"VITE_SUPABASE_URL":"https://example.supabase.co","VITE_SUPABASE_PUBLISHABLE_KEY":"offline-placeholder"}'}});
const js=built.outputFiles.find(f=>f.path.endsWith('.js')).text;
const rawCss=built.outputFiles.find(f=>f.path.endsWith('.css')).text;
const css=(await postcss([tailwindcss(join(root,'tailwind.config.ts'))]).process(rawCss,{from:undefined})).css;
 browser=await(process.env.READER_BROWSER==='webkit'?webkit:chromium).launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{} )});
 const page=await browser.newPage({viewport:{width:1300,height:1800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>(blocked++,r.abort()));
 await page.setContent('<html><head><style>'+css+'</style></head><body><div id="root"></div></body></html>');await page.addScriptTag({content:js});await page.waitForFunction(()=>typeof window.renderFidelity==='function');
 const results=await page.evaluate(()=>{
  const results=[];
  function measure(){
   const article=document.querySelector('article');const boxes=[];let text='';
   for(const body of article.querySelectorAll('[data-verse-body]')){
    const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT),range=document.createRange();
    for(let n=walker.nextNode();n;n=walker.nextNode()){
     text+=n.textContent;
     for(let i=0;i<n.length;i++){range.setStart(n,i);range.setEnd(n,i+1);const r=range.getBoundingClientRect();boxes.push([r.x,r.y,r.width,r.height]);}
    }
   }
   return{text,boxes,height:article.getBoundingClientRect().height};
  }
  for(const font of ['Georgia,serif','Arial,sans-serif','system-ui,sans-serif'])for(const size of [14,16,18,22])for(const width of [212,240,300,360,420,520]){
   const expected=window.renderFidelity({font,size,width,variant:'plain'});const base=measure();
   for(const variant of ['red','highlight','note']){
    window.renderFidelity({font,size,width,variant});const actual=measure();
    const differences=actual.boxes.map((r,i)=>({char:actual.text[i],i,actual:r,base:base.boxes[i]})).filter(({actual:r,i})=>!base.boxes[i]||Math.abs(r[1]-base.boxes[i][1])>.2||Math.abs(r[3]-base.boxes[i][3])>.2);
    // Collapsed zero-width spaces can be reported on either line at a span boundary.
    // Keep every exact-text assertion and every visible glyph's geometry assertion.
    const lineChanges=differences.filter(d=>d.actual[2]>.01||d.base?.[2]>.01||/\S/u.test(d.char)).length;
    results.push({font,size,width,variant,textEqual:actual.text===expected,heightEqual:Math.abs(actual.height-base.height)<.2,lineChanges,differences});
   }
  }
  window.renderFidelity({font:'Georgia,serif',size:18,width:360,variant:'note'});
  document.querySelector('button[aria-label="Open note"]').click();
  return{results,noteOpened:window.noteOpened};
 });
 const failed=results.results.filter(r=>!r.textEqual||!r.heightEqual||r.lineChanges);
 await page.screenshot({path:join(output,'text-metrics-fixed.png')});
 writeFileSync(join(output,'scripture-fidelity-browser.json'),JSON.stringify({...results,failed,actualBibleProviderRequests:0,blockedExternalRequests:blocked,browser:process.env.READER_BROWSER||'chromium'},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[],JSON.stringify(failed.slice(0,6)));assert(results.noteOpened);
 console.log('PASS',results.results.length+' red/highlight/note comparisons: exact text, identical line baselines and heights; note action functional');
}finally{await browser?.close();rmSync(scratch,{recursive:true,force:true});}
