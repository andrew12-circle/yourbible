import { verifyBookPrintGeometry } from "./reader-book-print-geometry.mjs";
import { verifyReaderChromeGeometry } from "./reader-chrome-geometry.mjs";
import { verifyReaderPrintGeometry } from "./reader-print-geometry.mjs";
import { waitForReaderLayout } from "./reader-browser-settled.mjs";
import { renderedVerseFragments, verifyConsecutiveFragments, verifyFragmentWords } from "./reader-browser-text.mjs";
/** Real reader: visible page geometry and consecutive facing-page flow. No provider calls. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
// Images are local placeholders in this book-transition test, never downloads.
const testBook=process.env.READER_TEST_BOOK||'Mat', testChapter=Number(process.env.READER_TEST_CHAPTER||28);
const nextBook=process.env.READER_TEST_NEXT_BOOK||'Mrk';
const bookName=nextBook==='Jhn'?'John':'Mark';
const previousSlug=testBook==='Luk'?'luke':'matthew', nextSlug=nextBook==='Jhn'?'john':'mark';
const root=process.cwd(), scratch=mkdtempSync(join(root,'.reader-browser-')), output=process.env.RUNNER_TEMP||scratch;
mkdirSync(output,{recursive:true});
writeFileSync(join(scratch,'index.html'),'<html><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
writeFileSync(join(scratch,'user-data.ts'),`const none=[];const noop=async()=>{};const data={highlights:none,notes:none,setMark:noop,setMarks:noop,setMarkRanges:noop,upsertNote:noop,deleteNote:noop};export function useChapterData(){return data}export function useBookmarks(){return {bookmarks:none,setBookmark:noop}}`);
writeFileSync(join(scratch,'shell.ts'),'export function useAppShellMode(){return {showHubShell:false}}');
writeFileSync(join(scratch,'onboarding.ts'),'export function needsOnboarding(){return false}');
writeFileSync(join(scratch,'position.ts'), `
import {useReaderPosition as original} from ${JSON.stringify(join(root,'src/hooks/useReaderPosition.ts'))};
export function useReaderPosition(options) {
  const result=original(options);
  const key=options.layoutKey;
  let hash=0;for(let i=0;i<key.length;i++)hash=(hash*31+key.charCodeAt(i))|0;
  const item={page:result.page,anchor:result.anchor?.id,ready:options.ready,layout:hash,splits:options.splits};
  const history=window.__readerPositionHistory??=[];
  if(JSON.stringify(history.at(-1))!==JSON.stringify(item))history.push(item);
  if(history.length>100)history.shift();
  window.__readerPositionHistory=history;
  return result;
}
`);
writeFileSync(join(scratch,'fixture.tsx'),`
import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter,Routes,Route,useNavigate,useLocation}from'react-router-dom';
import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{AuthContext}from'@/contexts/AuthContext';import{TooltipProvider}from'@/components/ui/tooltip';
import ReaderPage from '@/pages/reader/ReaderPage';import{API_BIBLE_CSB_ID}from'@/lib/bible/bibleEditions';import{inlinePlatesForChapter}from'@/lib/bible/chapterContext';import '@/index.css';
localStorage.setItem('yb.bibleId',API_BIBLE_CSB_ID);localStorage.setItem('yb.bibleAbbr','CSB');
if(!localStorage.getItem('yb.reader.displayMode'))localStorage.setItem('yb.reader.displayMode','pages');
window.__midPlate=inlinePlatesForChapter('Gen',4).find(p=>p.beforeVerse===8)?.id;
const auth={user:{id:'00000000-0000-4000-8000-000000000001'},profile:{font_choice:localStorage.getItem('reader-test-font')||'sans',highlight_palette:'classic'},loading:false,updateProfile:async()=>({error:null})};
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
function Test(){window.__navigate=useNavigate();window.__path=useLocation().pathname;return <ReaderPage/>}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[sessionStorage.getItem('reader-fixture-path')||${JSON.stringify('/read/'+testBook+'/'+testChapter)}]}><QueryClientProvider client={client}><AuthContext.Provider value={auth as never}><TooltipProvider><Routes><Route path="/read/:book/:chapter" element={<Test/>}/><Route path="*" element={<p>Unexpected route</p>}/></Routes></TooltipProvider></AuthContext.Provider></QueryClientProvider></MemoryRouter>);
`);
const server=await createServer({configFile:false,root,plugins:[react()],define:{'import.meta.env.PROD':'true'},optimizeDeps:{entries:[join(scratch,'index.html')]},resolve:{alias:[{find:'@/hooks/useReaderPosition',replacement:join(scratch,'position.ts')},{find:'@/hooks/useUserData',replacement:join(scratch,'user-data.ts')},{find:'@/hooks/useAppShellMode',replacement:join(scratch,'shell.ts')},{find:'@/lib/auth/onboardingGate',replacement:join(scratch,'onboarding.ts')},{find:'@',replacement:join(root,'src')}]},server:{host:'127.0.0.1',port:0}});

let browser, page;
let scenario;
const reports = [], requests = [], browserErrors = [];
let steps=[];
const record = (message) => { reports.push(message); console.log('PASS: ' + message); };
const sourceParser = process.env.READER_SOURCE_FIXTURES === '1'
  ? (await server.ssrLoadModule('/src/lib/bible/parsePassageHtml.ts')).parsePassageHtml : null;
const sourceFixtureCache = new Map();
function syntheticPassage(book, chapter) {
  if (sourceParser) {
    const key=book+':'+chapter, path=join(root,'src/lib/bible/fixtures/golden/csb-'+book.toLowerCase()+'-'+chapter+'.html');
    if(sourceFixtureCache.has(key))return sourceFixtureCache.get(key);
    if(existsSync(path)){
      const rawContent=readFileSync(path,'utf8');
      const result={...sourceParser(rawContent,book+' '+chapter),rawContent};
      sourceFixtureCache.set(key,result);return result;
    }
  }
  const data = JSON.parse(readFileSync(join(root, `public/bibles/csb/chapters/${book}/${chapter}.json`), 'utf8'));
  const study = new Map((data.layout.studyByVerse || []).map(v => [v.verseId, v]));
  return { reference: `${book} ${chapter}`, ...data.layout,
    verses: data.verses.map(v => ({number:v.verse, text:v.text, ...study.get(v.verseId)})) };
}
// Only the visible physical page counts on a phone; the clipped decorative
// facing surface is not a second page read by the user.
const inspectWords = () => page.evaluate(() => {
  const single = document.querySelector('[data-bible-reader]')?.hasAttribute('data-cropped-spread');
  const selector = single ? '[data-reader-page-side="left"] [data-verse-id]' : '[data-reader-page-side] [data-verse-id]';
  return [...document.querySelectorAll(selector)].map(node => {
    const body = node.querySelector('[data-verse-body]').cloneNode(true);
    body.querySelectorAll('sup,figure').forEach(mark => mark.remove());
    const start = Number(node.dataset.verseStart || 0);
    return { id: node.dataset.verseId, start, end: Number(node.dataset.verseEnd ?? start + body.textContent.length), text: body.textContent };
  });
});
const lookupVerse = (book,ch,verse) => syntheticPassage(book,ch).verses.find(v=>v.number===verse);
const verifyWords = words => verifyFragmentWords(words,lookupVerse);
async function verifyPublishedSpeech(words) {
  const rows=await page.evaluate(()=>[...document.querySelectorAll('[data-reader-page-side] [data-verse-id]')].map(node=>{
    const body=node.querySelector('[data-verse-body]');const flags=[];
    if(!body)return{flags};
    const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);
    for(let n=walker.nextNode();n;n=walker.nextNode()){
      if(n.parentElement.closest('sup,figure'))continue;
      for(const ch of n.textContent)if(/[\p{L}\p{N}]/u.test(ch))flags.push(!!n.parentElement.closest('.red-letter'));
    }
    return{flags};
  }));
  for(let i=0;i<words.length;i++){
    const row=words[i],[,b,c,v]=row.id.split(':');const source=lookupVerse(b,Number(c),Number(v));
    if(!source.sourceBlocks)continue;
    const expected=[];let offset=0;
    for(const part of source.parts||[])if(part.kind==='text'){
      for(const ch of part.text){if(offset>=row.start&&offset<row.end&&/[\p{L}\p{N}]/u.test(ch))expected.push(part.isJesus===true);offset+=ch.length;}
    }
    assert.deepEqual(rows[i].flags,expected,'Publisher speech coloring changed on '+row.id+'@'+row.start);
  }
}
async function settled() {
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-bible-reader]');
    return root && root.getAttribute('aria-busy') === 'false' &&
      !root.querySelector('[aria-busy="true"]') &&
      root.querySelector('[data-reader-page-side] [data-verse-id], [data-reader-page-side] [data-reader-plate]');
  }, undefined, {timeout:30000});
  await page.evaluate(() => document.fonts.ready);
  await waitForReaderLayout(page);
}
async function inspect() {
  await verifyReaderChromeGeometry(page);
  // This deliberately does not import the production fit helper: independent
  // line rectangles catch hidden words even when verse nodes still exist.
  return page.evaluate(() => {
    // Query and measure atomically: a reflow must not detach locator handles
    // between their selection and the independent visible-fit assertions.
    const articles = document.querySelectorAll('[data-reader-page-side] article[data-reading-area]');
    const issues = [], ids = [], pages = [];
    for (const article of articles) {
      const side = article.closest('[data-reader-page-side]').dataset.readerPageSide;
      if (side === 'right' && document.querySelector('[data-bible-reader]')?.hasAttribute('data-cropped-spread')) continue;
      const verseNodes = [...article.querySelectorAll('[data-verse-id]')];
      ids.push(...verseNodes.map(n => n.dataset.verseId));
      if (!verseNodes.length) continue;
      if (article.closest('[data-bible-scroll]')) continue;
      const style = getComputedStyle(article), a = article.getBoundingClientRect();
      if (/auto|scroll/.test(style.overflowY)) issues.push(`${side}: scrollable book page`);
      if (article.hasAttribute('data-reader-overflow')) issues.push(`${side}: legacy overflow flag`);
      if (article.parentElement.querySelector('[data-reader-fit-notice]')) issues.push(`${side}: unexpected fit notice`);
      const columns = article.querySelector('[class*="scripture-columns"]');
      pages.push({side, count:verseNodes.length, width:a.width, height:a.height, columns:columns ? getComputedStyle(columns).columnCount : '1'});
      const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT), range = document.createRange();
      for (let node=walker.nextNode(); node; node=walker.nextNode()) {
        if(!node.textContent.trim() || node.parentElement.closest('[hidden],.sr-only')) continue;
        range.selectNodeContents(node);
        for(const r of range.getClientRects()) {
          if(!r.width || !r.height) continue;
          let top=a.top,bottom=a.bottom,left=a.left,right=a.right;
          for(let e=node.parentElement;e && e!==article;e=e.parentElement) {
            const css=getComputedStyle(e),b=e.getBoundingClientRect();
            if(/^(hidden|clip|auto|scroll)$/.test(css.overflowY)){top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom)}
            if(/^(hidden|clip|auto|scroll)$/.test(css.overflowX)){left=Math.max(left,b.left);right=Math.min(right,b.right)}
          }
          if(r.top<top-2 || r.bottom>bottom+2 || r.left<left-2 || r.right>right+2)
            issues.push(`${side}: clipped "${node.textContent.slice(0,35)}" ${JSON.stringify({top:r.top,bottom:r.bottom,left:r.left,right:r.right,bounds:{top,bottom,left,right}})}`);
        }
      }
    }
    return {issues,ids,pages};
  });
}
async function turn(direction) {
  await page.getByRole('button', {name: direction > 0 ? 'Next page' : 'Previous page', exact:true}).first().click();
  await settled();
}
try {
  await server.listen();
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  browser = await (process.env.READER_BROWSER==='webkit'?webkit:chromium).launch({headless:true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
  const scenarios = [
    {name:'desktop-double',font:'serif',columns:'double',study:'inline',scale:1,width:1462,height:955},
    {name:'desktop-single',font:'sans',columns:'single',study:'inline',scale:1,width:1462,height:955},
    {name:'desktop-large',font:'serif',columns:'double',study:'inline',scale:1.5,width:1260,height:850},
    {name:'phone-pages',font:'serif',columns:'single',study:'inline',scale:1,width:390,height:844},
  ].filter(s=>!process.env.READER_SCENARIO||s.name===process.env.READER_SCENARIO);
  for (scenario of scenarios) {
    page=await browser.newPage({viewport:{width:scenario.width,height:scenario.height}});
    page.on('pageerror',e=>browserErrors.push(e.message));
    await page.addInitScript(s=>{
      localStorage.setItem('reader-test-font',s.font);
      localStorage.setItem('yb.reader.displayMode','pages');
      localStorage.setItem('yb.reader.columnLayout',s.columns);
      localStorage.setItem('yb.reader.studyLayout',s.study);
      localStorage.setItem('yb.fontScale',String(s.scale));
      localStorage.setItem('yb.fontScale.desktopBaselineV1','1');
    },scenario);
    await page.route('**/*',async route=>{
      const u=new URL(route.request().url());
      if(u.pathname.includes('/functions/v1/bible-passage')) {
        const book=u.searchParams.get('book'),chapter=Number(u.searchParams.get('chapter'));
        requests.push({scenario:scenario.name,book,chapter});
        return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(syntheticPassage(book,chapter))});
      }
      if(u.origin===origin)return route.continue();
      if(u.hostname==='example.supabase.co')return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'[]'});
      return route.abort();
    });
    await page.goto(origin+'/'+basename(scratch)+'/index.html');await settled();
    const collected=[];let finalMatthew;let reachedMark=false;
    for(let step=0;step<45;step++) {
      const geometry=await inspect();const words=await inspectWords();
      const printGeometry=await verifyBookPrintGeometry(page);
      steps.push({scenario:scenario.name,step,printGeometry});
      assert.deepEqual(geometry.issues,[],scenario.name+': '+geometry.issues.join('\n'));
      verifyWords(words);
      const books=[...new Set(words.map(w=>w.id.split(':').slice(-3)[0]))];
      if(books.includes(nextBook)) {
        assert(!books.includes(testBook),'A spread must not mix Matthew and Mark');
        assert(collected.length,'Mark opened before Matthew finished');
        const actual=verifyConsecutiveFragments(collected,lookupVerse,{complete:true});
        const expected=syntheticPassage(testBook,testChapter).verses.map(v=>`${testBook}:${testChapter}:${v.number}`);
        assert.deepEqual(actual.map(id=>id.split(':').slice(-3).join(':')),expected,'All Matthew 28 must precede Mark');
        const visiblePrefix = scenario.name === 'phone-pages' ? '[data-reader-page-side="left"] ' : '';
        assert.equal(await page.locator(visiblePrefix+'[data-reader-book-opening="'+nextBook+'"]').count(),1,'First Mark text page needs its book title');
        assert.equal(await page.locator(visiblePrefix+'[data-reader-book-opening="'+nextBook+'"] h2').textContent(),bookName);
        await page.screenshot({path:join(output,nextSlug+'-opening-'+scenario.name+'.png')});
        record(scenario.name+': Matthew ends; a page turn opens Mark with a local introduction; prior text preserved');
        reachedMark=true;
        let back;
        for(let i=0;i<4;i++){await turn(-1);back=await inspectWords();if(back.some(w=>w.id.includes(':'+testBook+':')))break;}
        assert.deepEqual(back,finalMatthew,'Backward turn must restore the final Matthew page/spread');
        let forward;
        for(let i=0;i<4;i++){await turn(1);forward=await inspectWords();if(forward.some(w=>w.id.includes(':'+nextBook+':')))break;}
        assert(forward.length && forward.every(w=>w.id.split(':').slice(-3)[0]===nextBook));
        record(scenario.name+': reverse/forward book turns preserve their positions');
        break;
      }
      if(words.length) {
        assert.deepEqual(books,[testBook]);
        assert(!requests.some(r=>r.scenario===scenario.name&&r.book===nextBook),'Read-ahead loaded Mark before a book turn');
        collected.push(...words);finalMatthew=words;
        await page.screenshot({path:join(output,previousSlug+'-ending-'+scenario.name+'.png')});
      }
      await turn(1);
    }
    assert(reachedMark,'Could not reach next book by turning pages');
    if(scenario.columns==='double') assert(steps.some(s=>s.scenario===scenario.name && s.printGeometry.some(r=>r.terminal)), 'Ending-page balancing was not exercised');
    await page.evaluate(b=>window.__navigate('/read/'+b+'/1'),nextBook);await settled();
    assert(!(await inspectWords()).some(w=>w.id.includes(':'+testBook+':')),'Direct entry pulled in cached Matthew');
    await page.evaluate(b=>window.__navigate('/read/'+b+'/2'),nextBook);await settled();
    assert.equal(await page.locator('[data-reader-book-opening]').count(),0,'Book introduction repeated at chapter 2');
    record(scenario.name+': direct entry stays inside the book; ordinary chapters do not repeat the title');
    await page.close();
  }
  assert.deepEqual(browserErrors,[]);
  writeFileSync(join(output,'book-opening-results.json'),JSON.stringify({reports,requests,steps,actualBibleProviderRequests:0,browserErrors,browser:process.env.READER_BROWSER||'chromium'},null,2));
} catch(error) {
  if(page&&!page.isClosed()) {
    await page.screenshot({path:join(output,'book-opening-failure.png')}).catch(()=>{});
    writeFileSync(join(output,'book-opening-failure.json'),JSON.stringify({message:String(error),scenario,requests,browserErrors,position:await page.evaluate(()=>window.__readerPositionHistory).catch(()=>[])},null,2));
  }
  throw error;
} finally {await browser?.close();await server.close();rmSync(scratch,{recursive:true,force:true});}
