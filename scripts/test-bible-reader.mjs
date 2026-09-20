/** Real ReaderPage in Chromium, synthetic Scripture, all remote requests intercepted. */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = process.cwd(), scratch = mkdtempSync(join(root, '.reader-browser-'));
const output = process.env.RUNNER_TEMP || scratch;
mkdirSync(output, { recursive: true });
writeFileSync(join(scratch, 'index.html'), '<html><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
writeFileSync(join(scratch, 'user-data.ts'), `const none=[];const noop=async()=>{};const data={highlights:none,notes:none,setMark:noop,setMarks:noop,setMarkRanges:noop,upsertNote:noop,deleteNote:noop};export function useChapterData(){return data}export function useBookmarks(){return {bookmarks:none,setBookmark:noop}}`);
writeFileSync(join(scratch, 'shell.ts'), 'export function useAppShellMode(){return {showHubShell:false}}');
writeFileSync(join(scratch, 'onboarding.ts'), 'export function needsOnboarding(){return false}');
writeFileSync(join(scratch, 'fixture.tsx'), `
import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter,Routes,Route,useNavigate,useLocation}from'react-router-dom';
import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{AuthContext}from'@/contexts/AuthContext';import{TooltipProvider}from'@/components/ui/tooltip';
import ReaderPage from '@/pages/reader/ReaderPage';import{API_BIBLE_CSB_ID}from'@/lib/bible/bibleEditions';import '@/index.css';
localStorage.setItem('yb.bibleId',API_BIBLE_CSB_ID);localStorage.setItem('yb.bibleAbbr','CSB');
if(!localStorage.getItem('yb.reader.displayMode'))localStorage.setItem('yb.reader.displayMode','pages');
const auth={user:{id:'00000000-0000-4000-8000-000000000001'},profile:{font_choice:'serif',highlight_palette:'classic'},loading:false,updateProfile:async()=>({error:null})};
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
function Test(){window.__navigate=useNavigate();window.__path=useLocation().pathname;window.__readerClient=client;return <ReaderPage/>}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[sessionStorage.getItem('reader-fixture-path')||'/read/Jhn/3']}><QueryClientProvider client={client}><AuthContext.Provider value={auth as never}><TooltipProvider><Routes><Route path="/read/:book/:chapter" element={<Test/>}/><Route path="*" element={<p>Unexpected route</p>}/></Routes></TooltipProvider></AuthContext.Provider></QueryClientProvider></MemoryRouter>);
`);
const server = await createServer({ configFile:false, root, plugins:[react()], define:{'import.meta.env.PROD':'true'}, optimizeDeps:{entries:[join(scratch,'index.html')]}, resolve:{alias:[
 {find:'@/hooks/useUserData',replacement:join(scratch,'user-data.ts')},
 {find:'@/hooks/useAppShellMode',replacement:join(scratch,'shell.ts')},
 {find:'@/lib/auth/onboardingGate',replacement:join(scratch,'onboarding.ts')},
 {find:'@',replacement:join(root,'src')}
]}, server:{host:'127.0.0.1',port:0} });
let browser, page;
const reports=[], requests=[], browserErrors=[];
let delayChapter=0, failArtwork=false;
try {
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:950}});
 page.on('pageerror',e=>browserErrors.push(e.message));
 await page.route('**/*', async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.includes('/functions/v1/bible-passage')){
   const book=url.searchParams.get('book'), chapter=Number(url.searchParams.get('chapter'));
   requests.push({book,chapter});
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
 const url=origin+'/'+basename(scratch)+'/index.html';
 await page.goto(url);
 const bodyVerses=()=>page.locator('[data-reader-page-side] [data-verse-id]');
 await bodyVerses().first().waitFor({timeout:45000});
 await page.waitForFunction(()=>document.querySelector('[data-bible-reader]')?.getAttribute('aria-busy')==='false');
 const assertIdentity=async()=>{
  const mismatch=await bodyVerses().evaluateAll(nodes=>nodes.flatMap(node=>{
   const id=node.getAttribute('data-verse-id');const [,book,chapter,verse]=id.split(':');
   return node.textContent.includes('FIXTURE '+book+' '+chapter+' '+verse+'.')?[]:[{id,text:node.textContent.slice(0,130)}];
  }));
  assert.deepEqual(mismatch,[],'Scripture text was displayed under another verse identity');
 };
 await assertIdentity();assert(requests.length>0,'Production-delivery fixture was not exercised');
 await page.screenshot({path:join(output,'bible-reader-desktop.png')});
 const before=requests.length;
 await page.getByRole('button',{name:'Next page',exact:true}).first().click();await page.waitForTimeout(500);
 await assertIdentity();
 await page.getByRole('button',{name:'Previous page',exact:true}).first().click();await page.waitForTimeout(500);
 assert.equal(requests.length,before,'A page turn within loaded chapters fetched Scripture again');
 reports.push('Real desktop ReaderPage: correct verse identities and no new Scripture requests for cached page turns');
 const anchor=await page.locator('[data-reader-page-side] [data-reader-plate], [data-reader-page-side] [data-verse-id]').first().evaluate(el=>({attr:el.hasAttribute('data-reader-plate')?'data-reader-plate':'data-verse-id',value:el.getAttribute('data-reader-plate')||el.getAttribute('data-verse-id')}));
 await page.setViewportSize({width:1260,height:800});await page.waitForTimeout(650);
 assert(await page.locator('['+anchor.attr+'="'+anchor.value+'"]').count()>0,'Viewport reflow lost its reading anchor');
 await assertIdentity();reports.push('Viewport reflow preserves the displayed verse/artwork anchor');
 delayChapter=8;
 await page.evaluate(()=>window.__navigate('/read/Jhn/8'));
 await page.waitForTimeout(100);await assertIdentity();
 await page.evaluate(()=>window.__navigate('/read/Jhn/10'));
 await page.waitForFunction(()=>window.__path==='/read/Jhn/10');
 await page.waitForTimeout(1000);await bodyVerses().first().waitFor();await assertIdentity();
 reports.push('Rapid route changes with delayed chapter responses never relabel old Scripture');
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{localStorage.setItem('yb.reader.displayMode','scroll');sessionStorage.setItem('reader-fixture-path','/read/Gen/4')});
 await page.reload();await page.locator('[data-reader-plate="dore-005-gen-4"]').waitFor({timeout:30000});
 await assertIdentity();
 const order=await page.locator('[data-reader-page-side] [data-reader-plate], [data-reader-page-side] [data-verse-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-reader-plate')||n.getAttribute('data-verse-id').split(':').at(-1)));
 assert(order.indexOf('dore-005-gen-4')>order.indexOf('7')&&order.indexOf('dore-005-gen-4')<order.indexOf('8'),'Mid-chapter artwork is not between verses 7 and 8');
 await page.screenshot({path:join(output,'bible-reader-mobile.png')});
 reports.push('Real phone scroll reader includes mid-chapter artwork in the correct order');
 const savedRequests=requests.length;
 await page.reload();await page.locator('[data-reader-plate="dore-005-gen-4"]').waitFor();await assertIdentity();
 assert.equal(requests.length,savedRequests,'Reloading a valid persisted chapter contacted the provider');
 reports.push('Production-delivery chapter survives reload from IndexedDB without provider requests');
 failArtwork=true;await page.evaluate(()=>sessionStorage.setItem('reader-fixture-path','/read/Gen/2'));await page.reload();
 await page.getByRole('button',{name:'Retry illustration',exact:true}).first().waitFor({timeout:30000});
 await page.getByRole('button',{name:'Retry illustration',exact:true}).first().click();
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-reader-plate] img')).some(img=>img.currentSrc.includes('retry=')&&img.complete&&img.naturalWidth>0));
 reports.push('A failed local illustration recovers through its retry control');
 assert.deepEqual(browserErrors,[],'Browser runtime errors: '+browserErrors.join('\n'));
 const result={passed:reports.length,reports,mockedScriptureRequests:requests.length,actualBibleProviderRequests:0};
 writeFileSync(join(output,'bible-reader-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
} catch(error) {
 if(page){await page.screenshot({path:join(output,'bible-reader-failure.png')}).catch(()=>{});console.error(JSON.stringify({browserErrors,requests,body:await page.locator('body').innerText().catch(()=>''),buttons:await page.locator('button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')||n.textContent)).catch(()=>[])},null,2));}
 throw error;
} finally {await browser?.close();await server.close();rmSync(scratch,{recursive:true,force:true});}
