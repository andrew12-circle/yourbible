/** Real reader: visible page geometry and consecutive facing-page flow. No provider calls. */
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
const auth={user:{id:'00000000-0000-4000-8000-000000000001'},profile:{font_choice:'serif',highlight_palette:'classic'},loading:false,updateProfile:async()=>({error:null})};
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
function Test(){window.__navigate=useNavigate();window.__path=useLocation().pathname;return <ReaderPage/>}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[sessionStorage.getItem('reader-fixture-path')||'/read/Jhn/3']}><QueryClientProvider client={client}><AuthContext.Provider value={auth as never}><TooltipProvider><Routes><Route path="/read/:book/:chapter" element={<Test/>}/><Route path="*" element={<p>Unexpected route</p>}/></Routes></TooltipProvider></AuthContext.Provider></QueryClientProvider></MemoryRouter>);
`);
const server=await createServer({configFile:false,root,plugins:[react()],define:{'import.meta.env.PROD':'true'},optimizeDeps:{entries:[join(scratch,'index.html')]},resolve:{alias:[{find:'@/hooks/useReaderPosition',replacement:join(scratch,'position.ts')},{find:'@/hooks/useUserData',replacement:join(scratch,'user-data.ts')},{find:'@/hooks/useAppShellMode',replacement:join(scratch,'shell.ts')},{find:'@/lib/auth/onboardingGate',replacement:join(scratch,'onboarding.ts')},{find:'@',replacement:join(root,'src')}]},server:{host:'127.0.0.1',port:0}});

let browser, page;
let scenario;
const reports = [], requests = [], browserErrors = [];
let steps=[];
const record = (message) => { reports.push(message); console.log('PASS: ' + message); };
function syntheticPassage(book, chapter) {
  const verses = Array.from({length: scenario.oversized ? 1 : 42}, (_, i) => {
    const number = i + 1;
    const sentence = 'Synthetic reading text preserves every word while the facing pages fill in order. ';
    const text = `FIXTURE ${book} ${chapter} ${number}. ` + sentence.repeat(scenario.oversized ? 180 : 1 + number % 3);
    const footnotes = scenario.notes && number % 2 === 0 ? [{marker: number, text: 'Synthetic study note explaining this reading. '.repeat(1 + number % 3)}] : [];
    return {number, text, footnotes, parts: [{kind:'text', text}, ...footnotes.map(n => ({kind:'footnote', ...n}))]};
  });
  return {reference:`${book} ${chapter}`, verses, paragraphStarts:[1,4,8,12,16,20,24,28,32,36,40],
    headings:[{beforeVerse:1,text:'A synthetic chapter heading'},{beforeVerse:20,text:'The reading continues'}],
    poetryBlocks: scenario.poetry ? [{beforeVerse:4,level:1},{beforeVerse:8,level:2},{beforeVerse:12,level:1},{beforeVerse:16,level:0}] : []};
}
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
  browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
  const scenarios = [
    {name:'single-notes', columns:'single', notes:true, study:'inline', scale:1, width:1440, height:950},
    {name:'double-notes', columns:'double', notes:true, study:'holman', scale:1, width:1440, height:950},
    {name:'single-large', columns:'single', notes:false, study:'inline', scale:1.5, width:1260, height:800},
    {name:'double-poetry-large', columns:'double', notes:true, poetry:true, study:'holman', scale:1.5, width:1260, height:800},
    {name:'double-plain', columns:'double', notes:false, study:'inline', scale:1, width:1440, height:950},
    {name:'oversized-unit', columns:'double', notes:false, study:'inline', scale:1.5, width:1260, height:800, oversized:true},
  ];
  for (scenario of scenarios) {
    page = await browser.newPage({viewport:{width:scenario.width,height:scenario.height}});
    page.on('pageerror', e => browserErrors.push(e.message));
    await page.addInitScript(s => {
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
    if (scenario.oversized) {
      const notice = page.getByRole('button', {name:'Open full passage', exact:true}).first();
      await notice.waitFor({state:'visible',timeout:30000});
      assert.equal(await page.evaluate(() => localStorage.getItem('yb.reader.displayMode')), 'pages', 'Overflow silently changed reading mode');
      assert.equal(await page.locator('[data-bible-scroll], [data-reader-overflow]').count(), 0, 'Overflow silently enabled scrolling');
      const bookPages = await page.locator('[data-reader-page-side] article[data-reading-area]').evaluateAll(nodes => nodes.map(node => ({
        overflowY: getComputedStyle(node).overflowY,
        columns: node.querySelector('[class*="scripture-columns"]') ? getComputedStyle(node.querySelector('[class*="scripture-columns"]')).columnCount : null,
      })));
      for (const bookPage of bookPages) {
        assert(!/auto|scroll/.test(bookPage.overflowY), 'Oversized book page acquired an internal scrollbar');
        if (bookPage.columns) assert.equal(bookPage.columns, '2', 'Overflow collapsed the selected columns');
      }
      const savedFont = await page.evaluate(() => localStorage.getItem('yb.fontScale'));
      const cached = requests.length;
      await page.screenshot({path:join(output,'book-flow-oversized-notice.png')});
      await notice.click();
      await page.locator('[data-bible-scroll]').first().waitFor({state:'visible'});
      await settled();
      assert.equal(await page.evaluate(() => localStorage.getItem('yb.reader.displayMode')), 'scroll', 'Explicit full-passage action did not open continuous reading');
      assert.equal(await page.evaluate(() => localStorage.getItem('yb.fontScale')), savedFont, 'Full-passage recovery changed the font size');
      assert.equal(await page.locator('[data-reader-fit-notice]').count(), 0, 'Fit notice remained over continuous reading');
      const expected = syntheticPassage('Jhn',3).verses[0].text.trim();
      const actual = await page.locator('[data-bible-scroll] [data-verse-id]').first().textContent();
      assert(actual?.includes(expected), 'Full-passage recovery lost or changed words');
      assert.equal(requests.length, cached, 'Opening an already loaded full passage fetched Scripture');
      await page.screenshot({path:join(output,'book-flow-oversized-continuous.png')});
      record('oversized-unit: fixed book pages retain columns; explicit full-passage choice preserves every word and font size without a provider request');
      await page.close();page=null;
      continue;
    }
    const collected=[], geometries=[];steps=[];
    let reachedNext=false;
    for(let step=0;step<80;step++) {
      const current=await inspect(); geometries.push(current.pages);
      steps.push({step,...current,position:await page.evaluate(()=>window.__readerPositionHistory.at(-1))});
      assert.deepEqual(current.issues,[],scenario.name+': '+current.issues.slice(0,5).join('\n'));
      for(const p of current.pages) assert.equal(p.columns,scenario.columns==='double'?'2':'1','Selected columns changed');
      for(const id of current.ids) {const[,book,ch,v]=id.split(':');if(book==='Jhn'&&ch==='3')collected.push(Number(v));}
      if(current.ids.some(id=>id.includes(':Jhn:4:'))) {reachedNext=true;break;}
      await turn(1);
    }
    assert(reachedNext,'Could not advance into the next chapter');
    assert.deepEqual(collected,Array.from({length:42},(_,i)=>i+1),'Skipped, repeated, or reordered text between facing pages');
    await page.screenshot({path:join(output,`book-flow-${scenario.name}.png`)});
    writeFileSync(join(output,`book-flow-${scenario.name}.json`),JSON.stringify(geometries,null,2));
    const before=(await inspect()).ids;
    await turn(-1); assert.deepEqual((await inspect()).issues,[]);
    await turn(1); assert.deepEqual((await inspect()).ids,before,'Backward/forward changed the reading allocation');
    const cached=requests.length;
    await page.setViewportSize({width:scenario.width-53,height:scenario.height-37});await settled();
    assert.deepEqual((await inspect()).issues,[],'Resize introduced clipped/scrollable text');
    assert.equal(requests.length,cached,'Reflow fetched Scripture');
    record(scenario.name+': all 42 verses visibly fit in order; facing-page flow, reverse turn, resize and zero reflow provider calls');
    await page.close();page=null;
  }
  assert.deepEqual(browserErrors,[]);
  writeFileSync(join(output,'book-flow-results.json'),JSON.stringify({passed:reports.length,reports,mockedScriptureRequests:requests.length,actualBibleProviderRequests:0},null,2));
} catch(error) {
  if(page) {
    await page.screenshot({path:join(output,'book-flow-failure.png')}).catch(()=>{});
    const diagnostic=await inspect().catch(()=>({}));
    writeFileSync(join(output,'book-flow-failure.json'),JSON.stringify({scenario,diagnostic,steps,history:await page.evaluate(()=>window.__readerPositionHistory),browserErrors,requests,error:String(error)},null,2));
    console.error(JSON.stringify({scenario,diagnostic,browserErrors},null,2));
  }
  throw error;
} finally {await browser?.close();await server.close();rmSync(scratch,{recursive:true,force:true});}
