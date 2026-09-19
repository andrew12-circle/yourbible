/** Opt-in remote acceptance test. Requires an explicitly designated disposable test account
 * and a long, playable, spoken-video fixture. Never run with a personal journal account.
 * Credentials remain in memory and are not written to reports or committed files.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';

assert.equal(process.env.JOURNAL_VIDEO_ACCEPTANCE_CONFIRM, 'disposable-test-account',
  'Set JOURNAL_VIDEO_ACCEPTANCE_CONFIRM=disposable-test-account before any remote write.');
const credentials = { email: process.env.JOURNAL_VIDEO_TEST_EMAIL, password: process.env.JOURNAL_VIDEO_TEST_PASSWORD };
assert(credentials.email && credentials.password, 'A dedicated test account is required.');
assert(process.env.VITE_SUPABASE_URL && (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY), 'Configure the test project.');
const fixture = resolve(process.env.JOURNAL_VIDEO_TEST_FILE || '');
assert(process.env.JOURNAL_VIDEO_TEST_FILE && existsSync(fixture), 'Provide a long spoken-video file.');
const minimumSeconds = Number(process.env.JOURNAL_VIDEO_MIN_SECONDS || 1200);
assert(Number.isFinite(minimumSeconds) && minimumSeconds > 0);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = process.cwd(), scratch = mkdtempSync(join(root, '.journal-video-live-'));
writeFileSync(join(scratch,'index.html'), '<html><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
writeFileSync(join(scratch,'fixture.tsx'), `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {supabase} from '@/integrations/supabase/client';
import {insertJournalEntry} from '@/lib/journal/journalEntryDb';
import {openJournalDocument,patchJournalDocument,flushJournalDocument} from '@/lib/journal/journalDocuments';
import {saveJournalVideoCaptureWithQueue,processJournalVideoUploadQueue} from '@/lib/journal/journalVideoUploadProcessor';
import {fetchEntryVideos} from '@/lib/journal/videos';
import {listQueuedJournalVideoUploads} from '@/lib/journal/journalVideoUploadQueue';
import {retryJournalVideoUpload} from '@/lib/journal/retryJournalVideoUpload';
import JournalEntryVideoPlayer from '@/components/journal/JournalEntryVideoPlayer';
let userId = '', receipt;
window.live = {
  signIn: async credentials => {const {data,error}=await supabase.auth.signInWithPassword(credentials);if(error)throw error;userId=data.user.id;},
  create: async minimumSeconds => {
    const video=document.querySelector('input').files[0];
    if(!video || video.size<=6*1024*1024)throw new Error('Fixture must exceed the resumable upload threshold.');
    const probe=document.createElement('video'), url=URL.createObjectURL(video);probe.src=url;
    await new Promise((resolve,reject)=>{probe.onloadedmetadata=resolve;probe.onerror=reject;});
    const durationMs=Math.round(probe.duration*1000);URL.revokeObjectURL(url);
    if(!Number.isFinite(durationMs)||durationMs<minimumSeconds*1000)throw new Error('Fixture is too short or has no valid duration.');
    const id=crypto.randomUUID(), marker='video-acceptance-'+id, now=new Date().toISOString();
    const {data,error}=await insertJournalEntry(userId,{id,title:marker,body:'Before processing.',entry_at_ts:now,entry_at:now.slice(0,10),analyze_for_mirror:false});
    if(error||!data)throw new Error('Could not create the dedicated acceptance entry.');
    receipt={id,userId,marker,recordingId:crypto.randomUUID(),durationMs,size:video.size};
    localStorage.setItem('journal-video-acceptance-receipt',JSON.stringify(receipt));
    await openJournalDocument(userId,id);
    await saveJournalVideoCaptureWithQueue({userId,entryId:id,anchorOffset:18,durationMs,deferUpload:true,
      result:{video,audio:null,liveTranscript:'',peakLiveTranscript:'',chapters:[],durationMs,recoveryDraftId:receipt.recordingId}});
    return receipt;
  },
  run: async () => {receipt=JSON.parse(localStorage.getItem('journal-video-acceptance-receipt'));return processJournalVideoUploadQueue(userId);},
  edit: async text => {receipt=JSON.parse(localStorage.getItem('journal-video-acceptance-receipt'));await openJournalDocument(userId,receipt.id);patchJournalDocument(userId,receipt.id,{body:text});const result=await flushJournalDocument(userId,receipt.id);if(!result.ok)throw result.error;},
  inspect: async id => {const {data,error}=await supabase.from('journal_entries').select('id,body,title').eq('id',id).eq('user_id',userId).single();if(error)throw error;
    return {entry:data,videos:await fetchEntryVideos(id),pending:listQueuedJournalVideoUploads(userId).filter(row=>row.entryId===id)};},
  retry: async () => {receipt=JSON.parse(localStorage.getItem('journal-video-acceptance-receipt'));await retryJournalVideoUpload(userId,receipt.id,receipt.recordingId);},
  shortLink: async path => {const {data,error}=await supabase.storage.from('journal-videos').createSignedUrl(path,1);if(error)throw error;return data.signedUrl;},
  cleanup: async target => {const {data,error}=await supabase.from('journal_entries').select('title').eq('id',target.id).eq('user_id',userId).single();
    if(error||data.title!==target.marker||!target.marker.startsWith('video-acceptance-'))throw new Error('Cleanup ownership check failed.');
    const videos=await fetchEntryVideos(target.id);const paths=videos.map(row=>row.storage_path);
    if(paths.some(path=>!path.startsWith(userId+'/'+target.id+'/')))throw new Error('Cleanup storage scope mismatch.');
    if(paths.length){const removed=await supabase.storage.from('journal-videos').remove(paths);if(removed.error)throw removed.error;}
    const removed=await supabase.from('journal_entries').delete().eq('id',target.id).eq('user_id',userId);if(removed.error)throw removed.error;
  }
};
function App(){const [row,setRow]=useState(null);window.live.showVideo=setRow;return <><input type="file" accept="video/*" />{row?<JournalEntryVideoPlayer url={row.url} storagePath={row.storage_path} durationMs={row.duration_ms} mimeType={row.mime_type}/>:null}</>;}
createRoot(document.getElementById('root')).render(<App/>);
`);
const server = await createServer({configFile:false,root,plugins:[react()],optimizeDeps:{entries:[join(scratch,'index.html')]},
  resolve:{alias:{'@':join(root,'src')}},server:{host:'127.0.0.1',port:0}});
let browser, receipt, passed=false;
try {
  await server.listen();
  const origin='http://127.0.0.1:'+server.httpServer.address().port, href=origin+'/'+basename(scratch)+'/index.html';
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
  const context=await browser.newContext(), page=await context.newPage();
  let cut=false, interrupt=true, resumedOffset=0;
  await context.route('**/storage/v1/upload/resumable/**', async route=>{
    const request=route.request(), offset=Number(request.headers()['upload-offset']||0);
    if(request.method()==='PATCH'&&offset>0){
      if(interrupt){cut=true;await route.abort('internetdisconnected');return;}
      resumedOffset=Math.max(resumedOffset,offset);
    }
    await route.continue();
  });
  await page.goto(href);await page.waitForFunction(()=>window.live);
  await page.evaluate(credentials=>window.live.signIn(credentials),credentials);
  await page.locator('input').setInputFiles(fixture);
  receipt=await page.evaluate(seconds=>window.live.create(seconds),minimumSeconds);
  await page.evaluate(()=>{window.liveJob=window.live.run().catch(()=>null);});
  const deadline=Date.now()+180000;
  while(!cut&&Date.now()<deadline)await page.waitForTimeout(250);
  assert(cut,'Did not reach an interrupted resumable transfer; test is not complete.');
  const written='Before processing. Concurrent writing '+receipt.marker;
  await page.evaluate(text=>window.live.edit(text),written);
  // Reload discards the old JS attempt, preserving IndexedDB and its resume receipt.
  interrupt=false;await page.reload();await page.waitForFunction(()=>window.live);
  await page.evaluate(credentials=>window.live.signIn(credentials),credentials);
  await page.waitForTimeout(61000); // let the interrupted attempt lease expire naturally
  await page.evaluate(()=>window.live.run());
  let result=await page.evaluate(id=>window.live.inspect(id),receipt.id);
  for(let n=0;result.pending.length&&n<3;n++){
    await page.waitForTimeout(30000);await page.evaluate(async()=>{await window.live.retry();await window.live.run();});
    result=await page.evaluate(id=>window.live.inspect(id),receipt.id);
  }
  assert(resumedOffset>0,'The resumed transfer restarted at zero.');
  assert.equal(result.pending.length,0,'Upload or transcription is still pending.');
  assert.equal(result.videos.length,1,'Expected exactly one attachment.');
  const transcript=result.videos[0].transcript?.trim();
  assert(transcript,'Provide an intelligible spoken fixture; real server transcription must succeed.');
  assert(result.entry.body.includes(written),'Concurrent writing was overwritten.');
  assert.equal(result.entry.body.split(transcript).length-1,1,'Transcript was missing or duplicated.');
  await page.evaluate(()=>window.live.run());
  // Independent browser context: no originating IndexedDB/cache or signed-in state.
  const second=await browser.newContext(), other=await second.newPage();
  await other.goto(href);await other.waitForFunction(()=>window.live);
  await other.evaluate(credentials=>window.live.signIn(credentials),credentials);
  const remote=await other.evaluate(id=>window.live.inspect(id),receipt.id);
  assert.equal(remote.videos.length,1);
  const expired=await other.evaluate(path=>window.live.shortLink(path),remote.videos[0].storage_path);
  await other.waitForTimeout(2100);
  await other.evaluate(row=>window.live.showVideo(row),{...remote.videos[0],url:expired});
  const player=other.locator('video');await player.waitFor();
  await player.evaluate(async element=>{element.muted=true;try{await element.play();}catch{/* automatic signed-link renewal retries */}});
  await other.waitForFunction(()=>document.querySelector('video')?.currentTime>0.2,{},{timeout:60000});
  const duration=await player.evaluate(element=>element.duration);
  assert(Math.abs(duration*1000-receipt.durationMs)<3000,'Uploaded playback duration differs from complete input.');
  await page.evaluate(receipt=>window.live.cleanup(receipt),receipt);
  passed=true;
  console.log(JSON.stringify({passed,entryId:receipt.id,bytes:receipt.size,durationMs:receipt.durationMs,resumedOffset,
    checks:['remote-resume-after-reload','concurrent-writing-preserved','one-video-one-transcript','second-context-expired-link-playback']},null,2));
} finally {
  if(!passed&&receipt)console.error('Acceptance failed. Synthetic test entry retained for inspection:',receipt.id);
  await browser?.close();await server.close();rmSync(scratch,{recursive:true,force:true});
}
