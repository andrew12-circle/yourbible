/** Real browser coverage of the existing 2D map and optional spatial workspace.
 * Uses synthetic graph records only. No account credentials, uploads, or AI calls.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = process.cwd(), scratch = mkdtempSync(join(root, '.mind-space-test-'));
const output = process.env.RUNNER_TEMP || scratch; mkdirSync(output, { recursive: true });
writeFileSync(join(scratch, 'index.html'), '<html><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
writeFileSync(join(scratch, 'graph.ts'), `
const titles = ['Learning to trust','A quieter morning','A prayer for patience','Choosing gratitude','Walking in faith','Being present','A new beginning','Room to listen','Hope in uncertainty','The work of forgiveness','Rest for the soul','Living with intention','Grace for today','A faithful response','Courage to begin','Finding stillness'];
export const input = {
 entries: [...titles.map((title,i)=>({id:'entry-'+i,title,body:'A synthetic reflection for interface testing. These are example connections, not personal journal data.',summary:null,belief_id:'belief-'+(i%6),verse_ref:null})),
 {id:'isolated',title:'Isolated reflection',body:'A thought with no saved relationships.',summary:null,belief_id:null,verse_ref:null}],
 beliefs: ['Faith over fear','The practice of gratitude','Grace and forgiveness','Wisdom through listening','Hope that endures','Love in action'].map((statement,i)=>({id:'belief-'+i,statement,topic:'Reflection'})),
 artifacts: ['Sunday teaching','A book on prayer','Notes on the Psalms','The meaning of rest','Conversation on faith','A study in wisdom'].map((title,i)=>({id:'source-'+i,title,kind:'text'})),
 entities: ['Family','Community','Purpose','Prayer','Service'].map((title,i)=>({id:'entity-'+i,title,kind:'topic'})),
 journalLinks: [...Array.from({length:15},(_,i)=>({entry_id:'entry-0',target_kind:'entry',target_ref:{id:'entry-'+(i+1)}})),
 ...Array.from({length:6},(_,i)=>({entry_id:'entry-0',target_kind:'artifact',target_ref:{id:'source-'+i}}))],
 beliefLinks: [], tensions:[{a_id:'belief-0',b_id:'belief-3'}], beliefSources:[], claims:[],
 scriptures:['Proverbs 3:5','Psalm 23:1','1 John 4:7','Matthew 6:34','Romans 8:28','James 1:5'].map((ref,i)=>({belief_id:'belief-'+i,ref})),
 entityMentions:Array.from({length:5},(_,i)=>({entity_id:'entity-'+i,journal_entry_id:'entry-0',artifact_id:null,belief_id:null}))
};
export async function fetchUnifiedMindGraph(userId) { if(window.__failGraph) throw Error('Synthetic failure'); return {...input,entries:input.entries.map(e=>({...e,title:userId==='other'?'Other account thought':e.title}))}; }
`);
writeFileSync(join(scratch, 'fixture.tsx'), `
import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter,useLocation}from'react-router-dom';
import {AuthContext} from '@/contexts/AuthContext';import MindGraphView from '@/components/graph/MindGraphView';
import {useJournalVaultStore} from '@/stores/journalVaultStore';import {TooltipProvider} from '@/components/ui/tooltip';import '@/index.css';
function Test(){const[user,setUser]=useState('synthetic');window.__setUser=setUser;window.__vault=useJournalVaultStore;window.__path=useLocation().pathname;
return <AuthContext.Provider value={{user:user?{id:user}:null,loading:false} as never}><TooltipProvider><div style={{height:'100dvh',display:'flex',flexDirection:'column',padding:12}}><MindGraphView fill /></div></TooltipProvider></AuthContext.Provider>}
createRoot(document.getElementById('root')!).render(<MemoryRouter><Test/></MemoryRouter>);
`);
const server = await createServer({ configFile:false, root, plugins:[react()], optimizeDeps:{entries:[join(scratch,'index.html')]},
 resolve:{alias:[{find:'@/lib/graph/fetchUnifiedMindGraph',replacement:join(scratch,'graph.ts')},{find:'@',replacement:join(root,'src')}]}, server:{host:'127.0.0.1',port:0} });
let browser,page;
const reports=[];
try{
 await server.listen(); const origin='http://127.0.0.1:'+server.httpServer.address().port;
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
 page=await browser.newPage({viewport:{width:1440,height:950}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 await page.goto(origin+'/'+basename(scratch)+'/index.html');
 const enter=page.getByRole('button',{name:'Enter space',exact:true});await enter.waitFor();
 await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Enter space')?.disabled);
 await page.evaluate(()=>{window.__map=document.querySelector('canvas');});
 await enter.click();await page.getByRole('dialog',{name:'Mind space'}).waitFor();
 const canvas=page.locator('[data-mind-space-canvas]');await canvas.waitFor();await page.waitForTimeout(400);
 await page.screenshot({path:join(output,'mind-space-desktop.png')});
 assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Map','Opening should focus exit, not summon the phone keyboard');
 await page.getByRole('button',{name:'Pause motion',exact:true}).click();await page.waitForTimeout(100);
 const frozen=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(180);
 assert.equal(await canvas.evaluate(c=>c.toDataURL()),frozen,'Paused scene kept animating');
 await page.evaluate(()=>{window.__canvas=document.querySelector('[data-mind-space-canvas]');});
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.waitForTimeout(50);
 assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),frozen,'Zoom did not change perspective');
 await canvas.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Home');
 reports.push('Desktop perspective, keyboard controls, and motion pause');
 const search=page.getByRole('searchbox',{name:'Search mind space'});
 await search.fill('Isolated reflection');await page.locator('.space-results[aria-label="Search results"] .space-node-row').click();
 await page.waitForFunction(()=>document.querySelector('.mind-space-scene-heading h2')?.textContent==='Isolated reflection');
 assert(await page.locator('.mind-space-scene-heading').textContent().then(t=>t.includes('1 visible · 0 links')),'Invented a link to the isolated thought');
 assert(await page.evaluate(()=>window.__canvas===document.querySelector('[data-mind-space-canvas]')),'Search remounted canvas');
 await page.getByRole('button',{name:'Return to center',exact:true}).click();
 await page.getByRole('button',{name:'Trace connection',exact:true}).click();
 await search.fill('1 John');await page.locator('[aria-label="Search results"] .space-node-row').click();
 await page.locator('[aria-label="Connection trace"] ol').waitFor();
 assert(await page.locator('[aria-label="Connection trace"]').textContent().then(t=>t.includes('scripture')));
 await page.screenshot({path:join(output,'mind-space-trace.png')});
 await page.getByRole('button',{name:'Open passage',exact:true}).click();
 await page.waitForFunction(()=>window.__path==='/read/1Jn/4');
 assert(await page.evaluate(()=>window.__map===document.querySelector('canvas')),'Original map was replaced');
 await enter.click();await page.getByRole('dialog',{name:'Mind space'}).waitFor();
 for(const name of ['Journal','Beliefs','Scripture','Sources','People & topics'])await page.locator('.mind-space-filters').getByRole('button',{name,exact:true}).click();
 assert(await page.locator('.mind-space-empty').isVisible());
 await page.locator('.mind-space-empty').getByRole('button',{name:'Restore filters'}).click();
 await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
 assert(await enter.evaluate(el=>el===document.activeElement),'Focus did not return to entry button');
 reports.push('Full-map search, isolated nodes, tracing real edges, source navigation, type filters, original map retention');
 await page.setViewportSize({width:390,height:844});await enter.click();await canvas.waitFor();await page.waitForTimeout(150);
 assert.equal(await page.locator('.mind-space-panel').count(),0,'Phone should begin with an unobstructed scene');
 const controls=async()=>{
  for(const name of ['Zoom in','Zoom out','Return to center']){
   const box=await page.getByRole('button',{name,exact:true}).boundingBox();const viewport=page.viewportSize();
   assert(box&&box.width>=44&&box.height>=44&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height, name+': '+JSON.stringify(box));
  }
  assert(await page.locator('[data-mind-space]').evaluate(e=>e.scrollWidth<=innerWidth),'Workspace overflows horizontally');
 };
 await controls();await page.screenshot({path:join(output,'mind-space-mobile.png')});
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);await controls();
 await page.screenshot({path:join(output,'mind-space-landscape.png')});
 await search.fill('gratitude');assert(await page.locator('[aria-label="Search results"] .space-node-row').count()>0);
 await page.getByRole('complementary',{name:'Thought details and filters'}).getByRole('button',{name:'Hide details and filters',exact:true}).click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
 assert(await page.getByRole('button',{name:'Resume motion',exact:true}).isDisabled());
 const still=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(150);assert.equal(await canvas.evaluate(c=>c.toDataURL()),still);
 reports.push('Phone portrait/landscape controls, accessible search panel, reduced motion');
 await page.evaluate(()=>window.__vault.setState({locking:true}));await page.getByRole('dialog').waitFor({state:'hidden'});
 assert(await page.getByText('Unlock your journal to explore its connections.').isVisible());
 await page.evaluate(()=>{window.__vault.setState({locking:false});window.__setUser('other');});
 await enter.click();await page.getByRole('dialog').waitFor();assert(!await page.locator('[data-mind-space]').textContent().then(t=>t.includes('Learning to trust')));
 await page.evaluate(()=>window.__setUser(null));await page.getByRole('dialog').waitFor({state:'hidden'});
 reports.push('Account changes and vault locking remove prior graph content');
 assert.deepEqual(errors,[],'Browser errors: '+errors.join('\n'));
 writeFileSync(join(output,'mind-space-results.json'),JSON.stringify({passed:reports.length,reports},null,2));console.log(JSON.stringify({passed:reports.length,reports},null,2));
}catch(e){if(page)await page.screenshot({path:join(output,'mind-space-failure.png')}).catch(()=>{});throw e}
finally{await browser?.close();await server.close();rmSync(scratch,{recursive:true,force:true});}
