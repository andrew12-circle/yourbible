import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium, webkit } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out = resolve(process.env.RUNNER_TEMP || '/tmp', 'visual-workspace-browser');
await mkdir(out, { recursive: true });
const html = 'visual-workspace-harness.html', entry = 'visual-workspace-harness.tsx';
await writeFile(html, '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/visual-workspace-harness.tsx"></script></body></html>');
await writeFile(entry, `import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {TopBar} from './src/components/bible/TopBar';
import {ChapterContextSheet} from './src/components/bible/ChapterContextSheet';
import {BookmarkDialog} from './src/components/bible/BookmarkDialog';
import {BibleSearchDialog} from './src/components/bible/BibleSearchDialog';
import {BOOKS} from './src/data/books';
import './src/index.css';
const editions = [{id:'test-csb',abbreviation:'CSB',name:'Christian Standard Bible'},{id:'test-esv',abbreviation:'ESV',name:'English Standard Version'}];
function App(){
 const [open,setOpen]=useState(false),[bm,setBm]=useState(false),[search,setSearch]=useState(false);
 const [fontScale,setFontScale]=useState(1),[fontChoice,setFontChoice]=useState('serif'),[mode,setMode]=useState('pages'),[cols,setCols]=useState('single'),[ink,setInk]=useState(false),[dark,setDark]=useState(false),[audio,setAudio]=useState(false),[rate,setRate]=useState(1),[focus,setFocus]=useState(false),[full,setFull]=useState(true),[bible,setBible]=useState('test-csb'),[book,setBook]=useState(BOOKS.find(b=>b.abbr==='Mat')!),[chapter,setChapter]=useState(16),[ribbon,setRibbon]=useState('');
 const location=useLocation();
 (window as any).__audit={fontScale,fontChoice,mode,cols,ink,dark,audio,rate,focus,full,bible,book:book.abbr,chapter,ribbon,pathname:location.pathname};
 const context={bookAbbr:book.abbr,chapter,plates:[],mapIds:[],timeline:[],relatedPassages:[]};
 return <div style={{position:'fixed',inset:0,zIndex:100,background:'#f7f4ef',overflow:'hidden'}}><TopBar reference={book.name+' '+chapter} collapsed={false} focusMode={focus} onToggleFocus={()=>setFocus(!focus)} bibleId={bible} bibles={editions} onChangeBible={setBible} onBookmark={()=>setBm(true)} currentBook={book} currentChapter={chapter} currentVerseCount={28} onJumpTo={(b,c)=>{setBook(b);setChapter(c)}} fontScale={fontScale} onFontScaleChange={setFontScale} fontChoice={fontChoice} onFontChoiceChange={setFontChoice} singlePage={innerWidth<900} inkMode={ink} onToggleInkMode={()=>setInk(!ink)} onSearch={()=>setSearch(true)} onToggleAudio={()=>setAudio(!audio)} audioPlaying={audio} audioPlaybackRate={rate} onCycleAudioSpeed={()=>setRate(rate===1?1.25:1)} displayMode={mode} onToggleDisplayMode={()=>setMode(mode==='pages'?'scroll':'pages')} readerDark={dark} onToggleReaderDark={()=>setDark(!dark)} columnLayout={cols} onToggleColumnLayout={()=>setCols(cols==='single'?'double':'single')} hubFullscreen={full} onToggleHubFullscreen={()=>setFull(!full)} onChapterContext={()=>setOpen(true)} showChapterContext={false} online />
 <div style={{padding:150,textAlign:'center'}} data-testid="unchanged-reading"><h1>Matthew 16</h1><p>Reader position preserved while the visual library is open.</p></div>
 <ChapterContextSheet open={open} onOpenChange={setOpen} context={context} bookName={book.name} translation={editions.find(b=>b.id===bible)?.abbreviation} ownerId="browser-audit" />
 <BookmarkDialog open={bm} position={1} defaultRef={{book:book.abbr,bookName:book.name,chapter}} onClose={()=>setBm(false)} onSave={(label)=>{setRibbon(label);setBm(false)}} />
 <BibleSearchDialog open={search} onClose={()=>setSearch(false)} bibleId={bible}/>
 </div>;
}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/read/Mat/16']}><QueryClientProvider client={new QueryClient()}><App/></QueryClientProvider></MemoryRouter>);
`);
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4182','--strictPort'], {stdio:'pipe'});
let log=''; server.stdout.on('data', d=>{log+=d}); server.stderr.on('data',d=>{log+=d});
const report=[];
try {
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4182/'+html)).ok)break}catch{} await new Promise(r=>setTimeout(r,300))}
 for(const [engine, launcher, viewport] of [['chromium',chromium,{width:1440,height:1000}],['webkit',webkit,{width:390,height:844}]]){
  const browser=await launcher.launch(); const ctx=await browser.newContext({viewport,acceptDownloads:true});const page=await ctx.newPage();page.setDefaultTimeout(20000);
  const errors=[], external=[];let atlasRequests=0;
  page.on('pageerror',e=>errors.push(e.message));
  await ctx.route('**/*', route=>{const url=new URL(route.request().url());if(url.hostname==='127.0.0.1'){if(url.pathname.endsWith('atlas-v1.json'))atlasRequests++;return route.continue()}external.push(url.href);return route.abort()});
  async function state(key,value){await page.waitForFunction(([k,v])=>window.__audit[k]===v,[key,value])}
  async function goSection(label,value){if(viewport.width<768)await page.getByLabel('Browse visual library').selectOption(value);else await page.getByRole('navigation',{name:'Visual library sections'}).getByRole('button',{name:label,exact:true}).click()}
  async function fits(){return page.evaluate(()=>[document.documentElement,...document.querySelectorAll('[data-testid="visual-library-workspace"], [data-testid="visual-workspace-scroll"]')].every(e=>e.scrollWidth<=e.clientWidth+2))}
  try{
   await page.goto('http://127.0.0.1:4182/'+html);assert.equal(atlasRequests,0);
   assert.equal(await page.getByRole('button',{name:'Explore artwork, maps and places'}).count(),0,'hidden toolbar is not keyboard-visible');
   await page.getByRole('button',{name:'Show header'}).click();
   await page.getByRole('button',{name:'Larger text',exact:true}).click();await state('fontScale',1.1);
   await page.getByRole('button',{name:'Smaller text',exact:true}).click();await state('fontScale',1);
   await page.getByRole('button',{name:'Scripture font',exact:true}).click();await page.getByRole('radio',{name:'Sans',exact:true}).click();await state('fontChoice','sans');
   await page.getByRole('button',{name:'Switch to scroll mode',exact:true}).click();await state('mode','scroll');
   await page.getByRole('button',{name:'Switch to page mode',exact:true}).click();await state('mode','pages');
   await page.getByRole('button',{name:'Two columns per page (like a printed Bible)',exact:true}).click();await state('cols','double');
   await page.getByRole('button',{name:'Write on page (ink mode)',exact:true}).click();await state('ink',true);
   await page.getByRole('button',{name:/Listen to chapter/}).click();await state('audio',true);
   await page.getByRole('button',{name:/Audio speed 1 times/}).click();await state('rate',1.25);
   await page.getByRole('button',{name:/Pause chapter audio/}).click();await state('audio',false);
   await page.getByRole('button',{name:'Dark page',exact:true}).click();await state('dark',true);
   await page.getByRole('button',{name:'Light page',exact:true}).click();await state('dark',false);
   await page.getByRole('button',{name:'Bookmark this page',exact:true}).click();
   const bookmark=page.getByRole('dialog'); await bookmark.getByLabel('Name',{exact:true}).fill('Audit ribbon');await bookmark.getByRole('button',{name:'Save ribbon'}).click();await state('ribbon','Audit ribbon');
   await page.getByRole('button',{name:'Search Scripture',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
   await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('menuitem',{name:'CSB',exact:true}).hover();await page.getByRole('menuitem',{name:/English Standard Version/}).click();await state('bible','test-esv');
   await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('menuitem',{name:'ESV',exact:true}).hover();await page.getByRole('menuitem',{name:/Christian Standard Bible/}).click();await state('bible','test-csb');
   await page.getByRole('button',{name:'Exit full screen',exact:true}).click();await state('full',false);await page.getByRole('button',{name:'Full screen',exact:true}).click();await state('full',true);
   await page.screenshot({path:resolve(out,engine+'-toolbar.png')});
   const explore=page.getByRole('button',{name:'Explore artwork, maps and places',exact:true});await explore.click();
   await page.getByTestId('visual-library-workspace').waitFor();
   await page.getByRole('button',{name:/Featured visual:/}).waitFor();assert(await fits(),'workspace must fit container');
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-testid="visual-library-workspace"] img')).some(img=>img.complete&&img.naturalWidth>0));
   await page.screenshot({path:resolve(out,engine+'-discover.png')});
   await page.getByRole('button',{name:/Featured visual:/}).click();await page.getByRole('region',{name:'Artwork viewer'}).waitFor();
   await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByText('150%',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Fit image',exact:true}).click();
   await page.getByRole('button',{name:'Save to my collection',exact:true}).click();await page.getByRole('button',{name:'Saved on this device',exact:true}).waitFor();
   const firstTitle=await page.getByRole('region',{name:'Artwork viewer'}).locator('h2').innerText();
   const next=page.getByRole('button',{name:'Next artwork',exact:true});if(await next.isEnabled()){await next.click();await page.waitForFunction(title=>document.querySelector('[aria-label="Artwork viewer"] h2')?.textContent!==title,firstTitle);await page.getByRole('button',{name:'Previous artwork'}).click()}
   await page.screenshot({path:resolve(out,engine+'-artwork.png')});
   await page.getByRole('button',{name:'Back to gallery',exact:true}).click();await page.getByRole('region',{name:'Artwork viewer'}).waitFor({state:'hidden'});
   await goSection('Places on Earth','places');const place=page.getByTestId('explorer-place-card').filter({has:page.getByRole('heading',{name:'Caesarea Philippi',exact:true})});await place.waitFor();
   assert.equal(await place.getByRole('link',{name:'Google Earth',exact:true}).getAttribute('href'),'https://earth.google.com/web/search/33.246111%2C35.693333');
   const maps=await place.getByRole('link',{name:'Google Maps',exact:true}).getAttribute('href');assert.equal(new URL(maps).searchParams.get('query'),'33.246111,35.693333');
   await place.getByRole('button',{name:'Save Caesarea Philippi',exact:true}).click();
   const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export places to Earth'}).click()]);
   const kml=await readFile(await download.path(),'utf8');assert.match(kml,/Caesarea Philippi/);assert(await page.evaluate(xml=>!new DOMParser().parseFromString(xml,'application/xml').querySelector('parsererror'),kml));
   assert(await fits());await page.screenshot({path:resolve(out,engine+'-places.png')});
   await goSection('Saved','saved');await page.getByRole('button',{name:'View '+firstTitle,exact:true}).waitFor();assert(await page.getByRole('heading',{name:'Caesarea Philippi',exact:true}).count());
   await page.getByRole('button',{name:'Return to Bible',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await state('pathname','/read/Mat/16');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Explore artwork, maps and places');
   await explore.click();await page.getByTestId('visual-library-workspace').waitFor();await goSection('Saved','saved');await page.getByRole('button',{name:'View '+firstTitle,exact:true}).waitFor();assert.equal(atlasRequests,1);
   await page.getByLabel('Library scope',{exact:true}).selectOption('all');await goSection('Art gallery','art');
   await page.getByRole('searchbox').fill('nonesuch-foobar-unique');await page.getByText('No artwork matches this view',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Clear filters',exact:true}).click();assert(await fits());
   await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await state('ink',true);
   assert.deepEqual(errors,[]);assert.equal(external.filter(url=>/supabase|api\.bible|openai|generativelanguage/.test(url)).length,0);
   report.push({engine,viewport,passed:true,atlasRequests,toolbarControls:16,checks:['curated artwork','inline detail navigation','zoom','device favorites','current-passage geography','Earth/Maps URLs','KML download','scope/search','no overflow','focus restoration','no provider calls']});
  }catch(error){await page.screenshot({path:resolve(out,engine+'-failure.png')});await writeFile(resolve(out,engine+'-dom.txt'),await page.locator('body').innerText());throw error}finally{await browser.close()}
 }
 console.log(JSON.stringify(report,null,2));
}finally{server.kill('SIGTERM');await Promise.all([rm(html,{force:true}),rm(entry,{force:true})]);await writeFile(resolve(out,'results.json'),JSON.stringify(report,null,2));await writeFile(resolve(out,'vite.log'),log)}
