/** Actual ReaderPage and actual Next page controls; synthetic text, no production account. */
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
const server=await createServer({configFile:false,root,plugins:[react()],define:{'import.meta.env.PROD':'true'},optimizeDeps:{entries:[join(scratch,'index.html')]},resolve:{alias:[{find:'@/hooks/useUserData',replacement:join(scratch,'user-data.ts')},{find:'@/hooks/useAppShellMode',replacement:join(scratch,'shell.ts')},{find:'@/lib/auth/onboardingGate',replacement:join(scratch,'onboarding.ts')},{find:'@',replacement:join(root,'src')}]},server:{host:'127.0.0.1',port:0}});
let browser,page;const errors=[],externalImages=[],reports=[];
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
  if(url.hostname==='example.supabase.co')return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'[]'});
  return route.abort();
 });
 await page.goto(origin+'/'+basename(scratch)+'/index.html');
 await page.waitForFunction(()=>typeof window.__navigate==='function');
 for(const [book,chapter,ids] of [
  ['Exo',2,['met-437820']],['Luk',1,['met-459016']],['Mat',2,['met-436504','met-437789']],
  ['Gen',21,['met-435962']],['Exo',12,['map-exodus']],['Luk',2,['met-547804']],
  ['Exo',25,['map-tabernacle']],['Jhn',19,['met-459087','walters-w839-recto']],
  ['Luk',5,['kinneret-2021']],['Act',1,['acts-overview']],['Luk',24,['met-437871']],['Mat',26,['met-437986']],
 ]){
  await page.evaluate(([b,c])=>window.__navigate('/read/'+b+'/'+c),[book,chapter]);
  await page.waitForFunction(path=>window.__path===path,'/read/'+book+'/'+chapter);
  await page.waitForFunction(()=>document.querySelector('[data-bible-reader]')?.getAttribute('aria-busy')==='false',{},{timeout:45000});
  const seen=new Set();
  for(let turn=0;turn<30&&seen.size<ids.length;turn++){
   await page.waitForTimeout(250);
   const plates=page.locator('[data-reader-page-side] [data-reader-visual-id]');
   for(const plate of await plates.all()){
    const id=await plate.getAttribute('data-reader-visual-id');
    if(!ids.includes(id)||!await plate.isVisible())continue;
    const visible=await plate.evaluate(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0});
    if(!visible)continue;
    const image=plate.locator('img');
    await image.waitFor({timeout:10000});
    await image.evaluate(img=>img.decode());
    assert((await image.getAttribute('src')).startsWith('/'),'Not a first-party image');
    seen.add(id);
    await plate.screenshot({path:join(output,'reader-variety-'+id+'.png')});
   }
   if(seen.size<ids.length)await page.getByRole('button',{name:'Next page',exact:true}).first().click();
  }
  assert.deepEqual([...seen].sort(),[...ids].sort(),book+' '+chapter+' did not display its new visuals through page turning');
  reports.push(book+' '+chapter+': '+[...seen].join(', '));console.log('PASS '+reports.at(-1));
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>window.__navigate('/read/Luk/2'));
 const mobile=page.locator('[data-reader-page-side] [data-reader-visual-id="met-547804"]').first();
 await mobile.waitFor({timeout:15000});await mobile.locator('img').evaluate(img=>img.decode());
 await page.screenshot({path:join(output,'reader-variety-mobile.png')});
 assert.deepEqual(errors,[]);assert.deepEqual(externalImages,[]);
 writeFileSync(join(output,'reader-variety-results.json'),JSON.stringify({reports,externalImageRequests:0,errors},null,2));
}catch(error){if(page)await page.screenshot({path:join(output,'reader-variety-failure.png')}).catch(()=>{});console.error(JSON.stringify({reports,errors,externalImages}));throw error}
finally{await browser?.close();await server.close();rmSync(scratch,{recursive:true,force:true})}
