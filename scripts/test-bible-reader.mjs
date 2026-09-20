/** Real ReaderPage in Chromium. Synthetic Scripture; no live Bible/API/account data. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
execFileSync(process.execPath,['scripts/verify-bible-plate-bundle.mjs'],{stdio:'inherit'});
const root=process.cwd(), scratch=mkdtempSync(join(root,'.reader-browser-')), output=process.env.RUNNER_TEMP||scratch;
mkdirSync(output,{recursive:true});
writeFileSync(join(scratch,'index.html'),'<html><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
writeFileSync(join(scratch,'user-data.ts'),`const none=[];const noop=async()=>{};const data={highlights:none,notes:none,setMark:noop,setMarks:noop,setMarkRanges:noop,upsertNote:noop,deleteNote:noop};export function useChapterData(){return data}export function useBookmarks(){return {bookmarks:none,setBookmark:noop}}`);
writeFileSync(join(scratch,'shell.ts'),'export function useAppShellMode(){return {showHubShell:false}}');
writeFileSync(join(scratch,'onboarding.ts'),'export function needsOnboarding(){return false}');
writeFileSync(join(scratch,'fixture.tsx'),`
import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter,Routes,Route,useNavigate,useLocation}from'react-router-dom';
import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{AuthContext}from'@/contexts/AuthContext';import{TooltipProvider}from'@/components/ui/tooltip';
import ReaderPage from '@/pages/reader/ReaderPage';import{API_BIBLE_CSB_ID}from'@/lib/bible/bibleEditions';import{inlinePlatesForChapter}from'@/lib/bible/chapterContext';import '@/index.css';
localStorage.setItem('yb.bibleId',API_BIBLE_CSB_ID);localStorage.setItem('yb.bibleAbbr','CSB');
if(!localStorage.getItem('yb.reader.displayMode'))localStorage.setItem('yb.reader.displayMode','pages');
window.__midPlate=inlinePlatesForChapter('Gen',4).find(p=>p.beforeVerse===8)?.id;
const auth={user:{id:'00000000-0000-4000-8000-000000000001'},profile:{font_choice:'serif',highlight_palette:'classic'},loading:false,updateProfile:async()=>({error:null})};
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
function Test(){window.__navigate=useNavigate();window.__path=useLocation().pathname;return <ReaderPage/>}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[sessionStorage.getItem('reader-fixture-path')||'/read/Jhn/3']}><QueryClientProvider client={client}><AuthContext.Provider value={auth as never}><TooltipProvider><Routes><Route path="/read/:book/:chapter" element={<Test/>}/><Route path="*" element={<p>Unexpected route</p>}/></Routes></TooltipProvider></AuthContext.Provider></QueryClientProvider></MemoryRouter>);
`);
const server=await createServer({configFile:false,root,plugins:[react()],define:{'import.meta.env.PROD':'true'},optimizeDeps:{entries:[join(scratch,'index.html')]},resolve:{alias:[{find:'@/hooks/useUserData',replacement:join(scratch,'user-data.ts')},{find:'@/hooks/useAppShellMode',replacement:join(scratch,'shell.ts')},{find:'@/lib/auth/onboardingGate',replacement:join(scratch,'onboarding.ts')},{find:'@',replacement:join(root,'src')}]},server:{host:'127.0.0.1',port:0}});
let browser,page,delayChapter=0,failArtwork=false;
const reports=[],requests=[],browserErrors=[];
const record=(message)=>{reports.push(message);console.log('PASS: '+message)};
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:950}});
 page.on('pageerror',e=>browserErrors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.includes('/functions/v1/bible-passage')){
   const book=url.searchParams.get('book'),chapter=Number(url.searchParams.get('chapter'));requests.push({book,chapter});
   if(chapter===delayChapter)await new Promise(resolve=>setTimeout(resolve,700));
   const verses=Array.from({length:42},(_,i)=>({number:i+1,text:'FIXTURE '+book+' '+chapter+' '+(i+1)+'. '+('Synthetic reading text with several words for reliable page measurement. ').repeat(3)}));
   return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({reference:book+' '+chapter,verses,paragraphStarts:[1,6,12,18,24,30,36],headings:[],poetryBlocks:[]})});
  }
  if(url.origin===origin){
   if(failArtwork&&url.pathname.startsWith('/bible-plates/')&&!url.searchParams.has('retry'))return route.fulfill({status:503,body:'Synthetic image failure'});
   return route.continue();
  }
  if(url.hostname==='example.supabase.co')return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'[]'});
  return route.abort();
 });
 await page.goto(origin+'/'+basename(scratch)+'/index.html');
 const verses=()=>page.locator('[data-reader-page-side] [data-verse-id]');
 await verses().first().waitFor({timeout:45000});await page.waitForFunction(()=>document.querySelector('[data-bible-reader]')?.getAttribute('aria-busy')==='false');
 const identity=async()=>{
  const wrong=await verses().evaluateAll(nodes=>nodes.flatMap(node=>{const id=node.getAttribute('data-verse-id');const[,book,chapter,verse]=id.split(':');return node.textContent.includes('FIXTURE '+book+' '+chapter+' '+verse+'.')?[]:[{id,text:node.textContent.slice(0,130)}]}));
  assert.deepEqual(wrong,[],'Text belongs to a different verse identity');
 };
 await identity();assert(requests.length>0,'Production-delivery fixture was not exercised');
 await page.screenshot({path:join(output,'bible-reader-desktop.png')});
 const before=requests.length;
 await page.getByRole('button',{name:'Next page',exact:true}).first().click();await page.waitForTimeout(500);await identity();
 await page.getByRole('button',{name:'Previous page',exact:true}).first().click();await page.waitForTimeout(500);
 assert.equal(requests.length,before,'A page turn fetched Scripture again');record('Desktop: correct identities, cached page turns make no provider request');
 const artwork=page.locator('[data-reader-page-side] [data-reader-plate]').first();
 const artworkId=await artwork.getAttribute('data-reader-plate');
 await page.setViewportSize({width:1260,height:800});await page.waitForTimeout(650);
 assert(await page.locator('[data-reader-plate="'+artworkId+'"]').count()>0,'Reflow lost the chapter opening illustration');await identity();record('Viewport reflow retains the chapter-opening artwork');
 const collected=[];
 for(let turn=0;turn<35;turn++){
  await identity();
  const ids=await verses().evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-verse-id')));
  for(const id of ids){const[,book,ch,v]=id.split(':');if(book==='Jhn'&&ch==='3')collected.push(Number(v))}
  if(ids.some(id=>id.includes(':Jhn:4:')))break;
  await page.getByRole('button',{name:'Next page',exact:true}).first().click();await page.waitForTimeout(450);
 }
 assert.deepEqual(collected,Array.from({length:42},(_,i)=>i+1),'A full chapter was duplicated, omitted, or out of order across page turns');record('Every synthetic verse occurs exactly once in order across paged Scripture and artwork');
 delayChapter=8;await page.evaluate(()=>window.__navigate('/read/Jhn/8'));await page.waitForTimeout(100);await identity();
 await page.evaluate(()=>window.__navigate('/read/Jhn/10'));await page.waitForFunction(()=>window.__path==='/read/Jhn/10');await page.waitForTimeout(1000);await verses().first().waitFor();await identity();record('Delayed chapter responses never relabel earlier Scripture');
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{localStorage.setItem('yb.reader.displayMode','scroll');sessionStorage.setItem('reader-fixture-path','/read/Gen/4')});await page.reload();
 await page.waitForFunction(()=>window.__midPlate);const mid=await page.evaluate(()=>window.__midPlate);
 await page.locator('[data-reader-plate="'+mid+'"]').waitFor({state:'attached',timeout:30000});await identity();
 const ordered=await page.locator('[data-reader-page-side] [data-reader-plate], [data-reader-page-side] [data-verse-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-reader-plate')||n.getAttribute('data-verse-id').split(':').at(-1)));
 assert(ordered.indexOf(mid)>ordered.indexOf('7')&&ordered.indexOf(mid)<ordered.indexOf('8'),'Mid-chapter image was not placed at verse 8');
 const gap=await page.evaluate(()=>{const fig=document.querySelector('[data-reader-page-side] [data-reader-plate]');const verse=document.querySelector('[data-reader-page-side] [data-verse-id]');return verse.getBoundingClientRect().top-fig.getBoundingClientRect().bottom});
 assert(gap>=-5&&gap<100,'Compact artwork reserved an empty full page: '+gap);
 await page.screenshot({path:join(output,'bible-reader-mobile.png')});record('Phone scrolling places artwork between its verses without a full-page blank gap');
 const saved=requests.length;await page.reload();await page.locator('[data-reader-plate="'+mid+'"]').waitFor({state:'attached'});await identity();assert.equal(requests.length,saved,'Persisted chapter reload contacted the provider');record('IndexedDB chapter reload makes no provider request');
 failArtwork=true;await page.evaluate(()=>sessionStorage.setItem('reader-fixture-path','/read/Gen/2'));await page.reload();
 await page.getByRole('button',{name:'Retry illustration',exact:true}).first().waitFor({timeout:30000});await page.getByRole('button',{name:'Retry illustration',exact:true}).first().click();
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-reader-plate] img')).some(img=>img.currentSrc.includes('retry=')&&img.complete&&img.naturalWidth>0));record('Failed local artwork recovers through Retry illustration');
 assert.deepEqual(browserErrors,[],'Runtime errors: '+browserErrors.join('\n'));
 const result={passed:reports.length,reports,mockedScriptureRequests:requests.length,actualBibleProviderRequests:0};writeFileSync(join(output,'bible-reader-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){
 if(page){await page.screenshot({path:join(output,'bible-reader-failure.png')}).catch(()=>{});console.error(JSON.stringify({reports,browserErrors,requests,body:await page.locator('body').innerText().catch(()=>''),buttons:await page.locator('button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')||n.textContent)).catch(()=>[])},null,2))}
 throw error;
}finally{await browser?.close();await server.close();rmSync(scratch,{recursive:true,force:true})}
