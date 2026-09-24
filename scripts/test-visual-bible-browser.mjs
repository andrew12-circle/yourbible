/** Actual back-matter route, chapter sheet and every bundled image; synthetic account only. */
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {basename,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react-swc';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const root=process.cwd(),scratch=mkdtempSync(join(root,'.visual-browser-')),output=process.env.RUNNER_TEMP||scratch;
writeFileSync(join(scratch,'index.html'),'<html><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
writeFileSync(join(scratch,'onboarding.ts'),'export function needsOnboarding(){return false}');
writeFileSync(join(scratch,'bibles.ts'),"const none=[];export function useBibles(){return {data:none}}export function pickDefaultBibleId(){return ''}export function readerBibleOptions(){return none}");
writeFileSync(join(scratch,'fixture.tsx'),`
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,Routes,Route,useNavigate}from'react-router-dom';
import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{AuthContext}from'@/contexts/AuthContext';import{TooltipProvider}from'@/components/ui/tooltip';
import StudyBackMatterPage from '@/pages/reader/StudyBackMatterPage';import{ChapterContextSheet}from'@/components/bible/ChapterContextSheet';import{chapterContext}from'@/lib/bible/chapterContext';import '@/index.css';
const auth={user:{id:'00000000-0000-4000-8000-000000000001'},profile:{font_choice:'serif',highlight_palette:'classic'},loading:false,updateProfile:async()=>({error:null})};
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
function Chapter(){const[open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Open Luke 2 visuals</button><ChapterContextSheet open={open} onOpenChange={setOpen} context={chapterContext('Luk',2)} bookName="Luke"/></>}
function App(){window.__visualNavigate=useNavigate();return <Routes><Route path="/read/study/:section" element={<StudyBackMatterPage/>}/><Route path="/fixture/chapter" element={<Chapter/>}/><Route path="*" element={<p>Reader navigation reached</p>}/></Routes>}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/read/study/artwork']}><QueryClientProvider client={client}><AuthContext.Provider value={auth as never}><TooltipProvider><App/></TooltipProvider></AuthContext.Provider></QueryClientProvider></MemoryRouter>);
`);
const server=await createServer({configFile:false,root,plugins:[react()],optimizeDeps:{entries:[join(scratch,'index.html')]},resolve:{alias:[{find:'@/lib/auth/onboardingGate',replacement:join(scratch,'onboarding.ts')},{find:'@/hooks/useBibles',replacement:join(scratch,'bibles.ts')},{find:'@',replacement:join(root,'src')}]},server:{host:'127.0.0.1',port:0}});
let browser,page;const errors=[],externalImages=[],detailRequests=[],reports=[];
const record=text=>{reports.push(text);console.log('PASS: '+text);};
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:950}});
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('-detail.webp'))detailRequests.push(r.url());});
 await page.route('**/*',async route=>{const r=route.request(),url=new URL(r.url());if(url.origin===origin)return route.continue();if(r.resourceType()==='image'||url.pathname.includes('/functions/v1/bible'))externalImages.push(url.href);if(url.hostname==='example.supabase.co')return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'[]'});return route.abort();});
 await page.goto(origin+'/'+basename(scratch)+'/index.html');await page.locator('[data-testid="visual-results"]').waitFor({timeout:45000});
 assert.equal(await page.locator('[data-visual-id]').count(),24);assert.equal(detailRequests.length,0);
 assert(await page.locator('[data-visual-id] img').evaluateAll(images=>images.every(image=>image.loading==='lazy')));
 await page.getByRole('searchbox').fill('Esther before Ahasuerus');
 const opener=page.getByRole('button',{name:'View Esther before Ahasuerus',exact:true});await opener.click();
 const dialog=page.getByRole('dialog');await dialog.locator('img').waitFor();await dialog.locator('img').evaluate(img=>img.decode());
 assert.equal(detailRequests.length,1);await page.screenshot({path:join(output,'visual-detail-desktop.png')});
 await dialog.getByRole('button',{name:'Zoom in',exact:true}).click();assert(await dialog.getByText('150%',{exact:true}).isVisible());
 await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'View Esther before Ahasuerus');
 record('Bounded lazy gallery, on-demand detail, zoom and Escape focus return');
 await page.getByRole('searchbox').fill('Durer');assert(await page.locator('[data-visual-id]').count()>0);
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();
 const artifacts=page.getByRole('group',{name:'Visual categories'}).getByRole('button',{name:/^Artifacts \(\d+\)$/});
 const total=Number((await artifacts.innerText()).match(/\((\d+)\)/)[1]);await artifacts.click();assert.equal(await page.locator('[data-visual-id]').count(),Math.min(24,total));
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();await page.locator('summary').filter({hasText:'More filters'}).click();
 await page.getByRole('combobox',{name:'Filter by artist or maker'}).selectOption('Rembrandt (Rembrandt van Rijn)');assert(await page.locator('[data-visual-id]').count()>0);
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();await page.locator('summary').filter({hasText:'More filters'}).click();
 await page.evaluate(()=>{document.querySelector('[data-bible-scroll]').scrollTop=0;});await page.screenshot({path:join(output,'visual-library-desktop.png')});
 record('Artist search, bounded artifact collection and expandable maker filters');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.evaluate(()=>{document.querySelector('[data-bible-scroll]').scrollTop=0;});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow on phone');
 assert(await page.locator('[data-visual-id] img').first().evaluate(image=>image.getBoundingClientRect().top<innerHeight*.75),'First image below fold');
 assert.equal(await page.locator('details').first().evaluate(d=>d.open),false);await page.screenshot({path:join(output,'visual-library-mobile.png')});
 record('Phone library keeps artwork above fold without horizontal overflow');
 await page.evaluate(()=>window.__visualNavigate('/fixture/chapter'));await page.getByRole('button',{name:'Open Luke 2 visuals',exact:true}).waitFor();assert.equal(await page.locator('[data-visual-id]').count(),0);
 await page.getByRole('button',{name:'Open Luke 2 visuals',exact:true}).click();await page.getByRole('searchbox').fill('Head of Augustus');
 await page.getByRole('button',{name:'View Head of Augustus',exact:true}).click();const detail=page.getByRole('dialog').last();await detail.getByText(/not evidence for a particular census/).waitFor();
 await detail.getByRole('link',{name:'Luke 2:1',exact:true}).click();await page.getByText('Reader navigation reached',{exact:true}).waitFor();record('Closed sheet is lazy; chapter search, caveat and Scripture navigation work');
 const manifest=JSON.parse(readFileSync(join(root,'public/visual-bible/v1/manifest.json'),'utf8'));
 for(const entry of manifest.entries)for(const file of entry.files){const response=await page.request.get(origin+file.path);assert.equal(response.status(),200,file.path);assert(response.headers()['content-type']?.startsWith('image/'),file.path);assert.equal((await response.body()).length,file.bytes,file.path);}
 record('Every acquired derivative is served as an image with its verified byte count');assert.deepEqual(externalImages,[]);assert.deepEqual(errors,[]);
 writeFileSync(join(output,'visual-browser-results.json'),JSON.stringify({reports,externalImageOrBibleRequests:externalImages.length,acquiredRecords:manifest.entries.length},null,2));
}catch(error){if(page)await page.screenshot({path:join(output,'visual-browser-failure.png')}).catch(()=>{});console.error(JSON.stringify({reports,errors}));throw error;}
finally{await browser?.close();await server.close();rmSync(scratch,{recursive:true,force:true});}
