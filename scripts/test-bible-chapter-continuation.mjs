import { renderedVerseFragments, verifyConsecutiveFragments, verifyFragmentWords } from "./reader-browser-text.mjs";
/** Real reader: visible page geometry and consecutive facing-page flow. No provider calls. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
execFileSync(process.execPath,['scripts/verify-bible-plate-bundle.mjs'],{stdio:'inherit'});
const testBook=process.env.READER_TEST_BOOK||'Act', testChapter=Number(process.env.READER_TEST_CHAPTER||6), endChapter=Number(process.env.READER_TEST_END_CHAPTER||9);
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
function syntheticPassage(book, chapter) {
  const data = JSON.parse(readFileSync(join(root, `public/bibles/csb/chapters/${book}/${chapter}.json`), 'utf8'));
  const study = new Map((data.layout.studyByVerse || []).map(v => [v.verseId, v]));
  return { reference: `${book} ${chapter}`, ...data.layout,
    verses: data.verses.map(v => ({number:v.verse, text:v.text, ...study.get(v.verseId)})) };
}
const inspectWords = () => renderedVerseFragments(page);
const lookupVerse = (book,ch,verse) => syntheticPassage(book,ch).verses.find(v=>v.number===verse);
const verifyWords = words => verifyFragmentWords(words,lookupVerse);
async function settled() {
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-bible-reader]');
    return root && root.getAttribute('aria-busy') === 'false' &&
      !root.querySelector('[aria-busy="true"]') &&
      root.querySelector('[data-reader-page-side] [data-verse-id], [data-reader-page-side] [data-reader-plate]');
  }, undefined, {timeout:30000});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}
async function inspect() {
  // This deliberately does not import the production fit helper: independent
  // line rectangles catch hidden words even when verse nodes still exist.
  return page.locator('[data-reader-page-side] article[data-reading-area]').evaluateAll(articles => {
    const issues = [], ids = [], pages = [];
    for (const article of articles) {
      const side = article.closest('[data-reader-page-side]').dataset.readerPageSide;
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
    {name:'acts-sans-single',font:'sans',columns:'single',study:'inline',scale:1,width:1491,height:936},
    {name:'acts-sans-double',font:'sans',columns:'double',study:'inline',scale:1,width:1491,height:936},
    {name:'acts-serif-single',font:'serif',columns:'single',study:'inline',scale:1,width:1491,height:936},
    {name:'acts-sans-large',font:'sans',columns:'double',study:'holman',scale:1.5,width:1260,height:800},
  ].filter(s => !process.env.READER_SCENARIO || s.name.includes(process.env.READER_SCENARIO));
  for (scenario of scenarios) {
    page = await browser.newPage({viewport:{width:scenario.width,height:scenario.height}});
    page.on('pageerror', e => browserErrors.push(e.message));
    await page.addInitScript(s => {
      localStorage.setItem('reader-test-font',s.font);
      localStorage.setItem('yb.reader.displayMode','pages');
      localStorage.setItem('yb.reader.columnLayout',s.columns);
      localStorage.setItem('yb.reader.studyLayout',s.study);
      localStorage.setItem('yb.fontScale',String(s.scale));
      localStorage.setItem('yb.fontScale.desktopBaselineV1','1');
    }, scenario);
    await page.route('**/*',async route => {
      const u=new URL(route.request().url());
      if(u.pathname.includes('/functions/v1/bible-passage')) {
        const book=u.searchParams.get('book'),chapter=Number(u.searchParams.get('chapter'));
        requests.push({scenario:scenario.name,book,chapter});
        return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(syntheticPassage(book,chapter))});
      }
      if(u.origin===origin) return route.continue();
      if(u.hostname==='example.supabase.co') return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'[]'});
      return route.abort();
    });
    await page.goto(origin+'/'+basename(scratch)+'/index.html'); await settled();
    const collected = [], visited = [];
    let reachedTarget = false;
    for (let step=0;step<50;step++) {
      const current = await inspect();
      const words = await inspectWords();
      steps.push({scenario:scenario.name,step,...current,position:await page.evaluate(()=>window.__readerPositionHistory.at(-1)),path:await page.evaluate(()=>window.__path)});
      assert.deepEqual(current.issues, [], scenario.name + ': ' + current.issues.slice(0,3).join('\n'));
      verifyWords(words);
      const faces = await page.locator('[data-reader-page-side] article').evaluateAll(nodes => nodes.map(node => ({
        ids:[...node.querySelectorAll('[data-verse-id]')].map(v=>v.dataset.verseId+'@'+(v.dataset.verseStart||'0')+'-'+(v.dataset.verseEnd||'')),
        plates:[...node.querySelectorAll('[data-reader-plate]')].map(v=>v.dataset.readerPlate),
      })));
      for(const face of faces) {
        if(!face.ids.some(id=>id.includes(':Act:7:1@'))) continue;
        // The screenshot-sized layouts have room for verse 2. At 150% text,
        // chapter 7 can legitimately start after 6:15 near the end of a page;
        // that is continuation, not a page containing only the short opener.
        assert(face.ids.length>1, 'Acts 7:1 isolated on an otherwise empty page');
        if(scenario.scale===1)
          assert(face.ids.some(id=>id.includes(':Act:7:2@')), 'Screenshot-sized page did not continue after Acts 7:1');
      }
      if(testBook==='Psa' && testChapter===6 && step===0 && scenario.columns==='double' && scenario.scale===1) {
        assert(current.ids.some(id=>id.includes(':Psa:8:')), 'Psalm 8 must continue after 7 on the initial spread without a page turn');
        const rightColumnText = await page.locator('[data-reader-page-side="right"] article').evaluate(article => {
          const box=article.getBoundingClientRect();
          const range=document.createRange();
          const walker=document.createTreeWalker(article,NodeFilter.SHOW_TEXT);
          let count=0;
          for(let n=walker.nextNode();n;n=walker.nextNode()) {
            if(!n.textContent.trim() || !n.parentElement.closest('[data-verse-body]'))continue;
            range.selectNodeContents(n);
            if([...range.getClientRects()].some(r=>r.left>box.left+box.width/2))count++;
          }
          return count;
        });
        assert(rightColumnText>0,'Right page second column must not be empty at the loaded-chapter boundary');
      }
      assert.equal(await page.locator('[data-reader-page-side] p[title*="API.Bible"]').count(),0,'Source attribution must not occupy the page header');
      if(testBook==='Mrk' && step===0) {
        assert(faces.some(face=>face.plates.length),'Opening artwork missing');
        assert(current.ids.some(id=>id.includes(':Mrk:3:2')),'Mark 3 text must fill the facing page, not show a fit notice');
        assert.equal(await page.locator('[data-reader-fit-notice], [data-bible-scroll]').count(),0);
      }
      if(step<3) await page.screenshot({path:join(output,`chapter-flow-${testBook}-${scenario.name}-${step}.png`)});
      const footprint=JSON.stringify(faces);
      visited.push(footprint);
      collected.push(...words);
      if(current.ids.some(id=>id.includes(':'+testBook+':'+endChapter+':'))) { reachedTarget=true; break; }
      await turn(1);
    }
    assert(reachedTarget,'Could not continue from Acts 6 into Acts 9');
    const actual=verifyConsecutiveFragments(collected,lookupVerse).map(id=>id.split(':').slice(1).join(':'));
    const first=actual[0].split(':'), last=actual.at(-1).split(':');
    const expected=[];
    for(let ch=Number(first[1]);ch<=Number(last[1]);ch++)
      for(const v of syntheticPassage(testBook,ch).verses)
        if((ch>Number(first[1])||v.number>=Number(first[2]))&&(ch<Number(last[1])||v.number<=Number(last[2]))) expected.push(`${testBook}:${ch}:${v.number}`);
    assert.deepEqual(actual,expected,'Chapter-window boundary repeated, skipped, or reordered verses');
    // Go back over an actual window boundary, not just within one chapter.
    for(let back=visited.length-2;back>=Math.max(0,visited.length-6);back--) {
      await turn(-1);
      const current=await inspect(); assert.deepEqual(current.issues,[]);
      verifyWords(await inspectWords());
      const footprint=await page.locator('[data-reader-page-side] article').evaluateAll(nodes => nodes.map(node => ({
        ids:[...node.querySelectorAll('[data-verse-id]')].map(v=>v.dataset.verseId+'@'+(v.dataset.verseStart||'0')+'-'+(v.dataset.verseEnd||'')),
        plates:[...node.querySelectorAll('[data-reader-plate]')].map(v=>v.dataset.readerPlate),
      })));
      assert.equal(JSON.stringify(footprint),visited[back],'Reverse navigation changed the preceding spread');
    }
    const cached=requests.length;
    await page.setViewportSize({width:scenario.width-53,height:scenario.height-37}); await settled();
    assert.deepEqual((await inspect()).issues,[],'Resize clipped Scripture');
    verifyWords(await inspectWords());
    assert.equal(requests.length,cached,'Resize fetched Scripture');
    record(testBook+' '+testChapter+'–'+endChapter+' '+scenario.name+': exact character continuity across columns, pages and windows; reverse turns and cached resize');
    await page.close();page=null;
  }
  assert.deepEqual(browserErrors,[]);
  writeFileSync(join(output,'chapter-flow-'+testBook+'-results.json'),JSON.stringify({passed:reports.length,reports,mockedScriptureRequests:requests.length,actualBibleProviderRequests:0,steps},null,2));
} catch(error) {
  if(page) {
    await page.screenshot({path:join(output,'chapter-flow-failure.png')}).catch(()=>{});
    const diagnostic=await inspect().catch(()=>({}));
    writeFileSync(join(output,'chapter-flow-failure.json'),JSON.stringify({scenario,diagnostic,steps,history:await page.evaluate(()=>window.__readerPositionHistory),browserErrors,requests,error:String(error)},null,2));
    console.error(JSON.stringify({scenario,diagnostic,browserErrors},null,2));
  }
  throw error;
} finally {await browser?.close();await server.close();rmSync(scratch,{recursive:true,force:true});}
