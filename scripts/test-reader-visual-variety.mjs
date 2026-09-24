/** Real ReaderPage: visual switching must not navigate or reallocate Scripture. */
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {basename,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react-swc';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root=process.cwd(),scratch=mkdtempSync(join(root,'.reader-variety-')),output=process.env.RUNNER_TEMP||scratch;
mkdirSync(output,{recursive:true});
writeFileSync(join(scratch,'index.html'),'<html><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
writeFileSync(join(scratch,'user-data.ts'),'const none=[];const noop=async()=>{};const data={highlights:none,notes:none,setMark:noop,setMarks:noop,setMarkRanges:noop,upsertNote:noop,deleteNote:noop};export function useChapterData(){return data}export function useBookmarks(){return {bookmarks:none,setBookmark:noop}}');
writeFileSync(join(scratch,'shell.ts'),'export function useAppShellMode(){return {showHubShell:false}}');
writeFileSync(join(scratch,'onboarding.ts'),'export function needsOnboarding(){return false}');
writeFileSync(join(scratch,'fixture.tsx'),`
import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter,Routes,Route,useNavigate,useLocation}from'react-router-dom';
import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{AuthContext}from'@/contexts/AuthContext';import{TooltipProvider}from'@/components/ui/tooltip';
import ReaderPage from '@/pages/reader/ReaderPage';import{API_BIBLE_CSB_ID}from'@/lib/bible/bibleEditions';import '@/index.css';
localStorage.setItem('yb.bibleId',API_BIBLE_CSB_ID);localStorage.setItem('yb.bibleAbbr','CSB');localStorage.setItem('yb.reader.displayMode','pages');
const auth={user:{id:'00000000-0000-4000-8000-000000000001'},profile:{font_choice:'serif',highlight_palette:'classic'},loading:false,updateProfile:async()=>({error:null})};
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
function Test(){window.__navigate=useNavigate();window.__path=useLocation().pathname;return <ReaderPage/>}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/read/Exo/2']}><QueryClientProvider client={client}><AuthContext.Provider value={auth as never}><TooltipProvider><Routes><Route path="/read/:book/:chapter" element={<Test/>}/></Routes></TooltipProvider></AuthContext.Provider></QueryClientProvider></MemoryRouter>);
`);
const server=await createServer({configFile:false,root,plugins:[react()],define:{'import.meta.env.PROD':'true','import.meta.env.VITE_GOOGLE_MAPS_API_KEY':'""'},optimizeDeps:{entries:[join(scratch,'index.html')]},resolve:{alias:[{find:'@/hooks/useUserData',replacement:join(scratch,'user-data.ts')},{find:'@/hooks/useAppShellMode',replacement:join(scratch,'shell.ts')},{find:'@/lib/auth/onboardingGate',replacement:join(scratch,'onboarding.ts')},{find:'@',replacement:join(root,'src')}]},server:{host:'127.0.0.1',port:0}});
let browser,page;const errors=[],externalImages=[],googleRequests=[],reports=[];
async function allocation(){return page.evaluate(()=>({path:window.__path,verses:[...document.querySelectorAll('[data-reader-page-side] [data-verse-id]')].map(n=>({id:n.dataset.verseId,text:n.textContent})),plates:[...document.querySelectorAll('[data-reader-page-side] [data-reader-plate]')].map(n=>n.dataset.readerPlate)}));}
async function openVisualPage(book,chapter){
 await page.evaluate(([b,c])=>window.__navigate('/read/'+b+'/'+c),[book,chapter]);
 await page.waitForFunction(path=>window.__path===path,'/read/'+book+'/'+chapter);
 for(let i=0;i<35;i++){
  await page.waitForFunction(()=>document.querySelector('[data-bible-reader]')?.getAttribute('aria-busy')==='false',undefined,{timeout:45000});
  await page.waitForTimeout(250);
  const openers=page.locator('[data-reader-page-side] [data-reader-plate] button[aria-label="Explore this passage"]');
  for(const button of await openers.all())if(await button.isVisible()){
   await button.click();await page.getByRole('region',{name:'Passage visual explorer'}).waitFor();return;
  }
  await page.getByRole('button',{name:'Next page',exact:true}).first().click();
 }
 throw new Error('No visual page reached by real Next controls: '+book+' '+chapter);
}
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname.includes('/functions/v1/bible-passage')){
   const book=url.searchParams.get('book'),chapter=Number(url.searchParams.get('chapter'));
   const verses=Array.from({length:80},(_,i)=>({number:i+1,text:'FIXTURE '+book+' '+chapter+' '+(i+1)+'. A synthetic sentence for testing page turns.'}));
   return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({reference:book+' '+chapter,verses,paragraphStarts:[1,10,20,30,40,50,60,70],headings:[],poetryBlocks:[]})});
  }
  if(url.origin===origin)return route.continue();
  if(request.resourceType()==='image')externalImages.push(url.href);
  if(/(^|\.)googleapis\.com$|(^|\.)gstatic\.com$|(^|\.)google\.com$/.test(url.hostname))googleRequests.push(url.href);
  if(url.hostname==='example.supabase.co')return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'[]'});
  return route.abort();
 });
 await page.goto(origin+'/'+basename(scratch)+'/index.html');await page.waitForFunction(()=>typeof window.__navigate==='function');
 for(const [book,chapter,ids] of [
  ['Exo',2,['met-437820']],['Luk',1,['met-459016']],['Mat',2,['met-436504','met-437789']],
  ['Gen',21,['met-435962']],['Exo',12,['map-exodus']],['Luk',2,['met-547804']],
  ['Exo',25,['map-tabernacle']],['Jhn',19,['met-459087','walters-w839-recto']],
  ['Luk',5,['kinneret-2021']],['Act',1,['acts-overview']],['Luk',24,['met-437871']],['Mat',26,['met-437986']],
 ]){
  await openVisualPage(book,chapter);const before=await allocation();
  const explorer=page.getByRole('region',{name:'Passage visual explorer'});
  for(const id of ids){
   await explorer.getByRole('combobox',{name:'Choose passage visual'}).selectOption(id);
   await explorer.locator('img').evaluate(img=>img.decode());
   assert((await explorer.locator('img').getAttribute('src')).startsWith('/'),'Not a first-party image');
   assert(await explorer.getByTestId('selected-visual-source').innerText(),'Missing selected attribution');
   assert.deepEqual(await allocation(),before,'Visual selection navigated or reallocated Scripture');
   await explorer.screenshot({path:join(output,'reader-variety-'+id+'.png')});
  }
  await explorer.getByRole('button',{name:'Close passage visuals'}).click();
  await explorer.waitFor({state:'detached'});
  assert.deepEqual(await allocation(),before,'Closing changed the Bible page');
  reports.push(book+' '+chapter+': actual reading page switches to '+ids.join(', '));console.log('PASS '+reports.at(-1));
 }
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:1000});
  await openVisualPage('Mat',21);const before=await allocation();const explorer=page.getByRole('region',{name:'Passage visual explorer'});
  const select=explorer.getByRole('combobox');
  await select.selectOption('map-jerusalem');await explorer.locator('img').evaluate(img=>img.decode());
  await select.press('ArrowRight');assert.deepEqual(await allocation(),before,'Arrow key leaked into Bible navigation');
  await select.selectOption('geography');await explorer.getByTestId('passage-geography').waitFor();
  assert(await explorer.getByText(/not a view of the first century/).isVisible());
  assert.equal(await explorer.getByRole('link',{name:/Open Google Earth/}).getAttribute('target'),'_blank');
  assert.deepEqual(await allocation(),before,'Geography moved Scripture');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
  await page.screenshot({path:join(output,width===390?'reader-variety-mobile.png':'reader-variety-geography.png')});
  await explorer.getByRole('button',{name:'Close passage visuals'}).click();
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Explore this passage');
  reports.push('Triumphal-entry chooser, map, geography and focus return at '+width+'px');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(externalImages,[]);assert.deepEqual(googleRequests,[]);
 writeFileSync(join(output,'reader-variety-results.json'),JSON.stringify({reports,externalImageRequests:0,googleRequestsBeforeOptIn:0,errors},null,2));
}catch(error){if(page)await page.screenshot({path:join(output,'reader-variety-failure.png')}).catch(()=>{});console.error(JSON.stringify({reports,errors,externalImages,googleRequests}));throw error}
finally{await browser?.close();await server.close();rmSync(scratch,{recursive:true,force:true})}
