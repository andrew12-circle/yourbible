/** Real Chromium MediaRecorder/IndexedDB tests with synthetic camera + mic; no account or network upload. */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = process.cwd();
const scratch = mkdtempSync(join(root, '.journal-video-browser-'));
const output = process.env.RUNNER_TEMP || scratch;
mkdirSync(output, { recursive: true });
writeFileSync(join(scratch, 'index.html'), '<html><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
writeFileSync(join(scratch, 'fixture.tsx'), `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import JournalVideoCaptureDialog from '@/components/journal/JournalVideoCaptureDialog';
import { JournalAiPrivacy } from '@/components/journal/JournalAiPrivacy';
import { enqueueJournalVideoUpload, readQueuedJournalVideoUpload } from '@/lib/journal/journalVideoUploadQueue';
import { clearInProgressJournalVideoRecording, listInProgressJournalVideoRecordings } from '@/lib/journal/journalVideoRecordingRecovery';
import { withJournalVideoUploadItemLock } from '@/lib/journal/journalVideoLocks';
import '@/index.css';
localStorage.setItem('yb_journal_video_capture_settings_v1', JSON.stringify({countdown:0,floatingRecorder:false,silenceAutoPause:false}));
window.__saved = null; window.__review = null; window.__failSave = false; window.__saveCount = 0;
window.__readQueued = readQueuedJournalVideoUpload;
window.__enqueue = enqueueJournalVideoUpload;
window.__recoveries = listInProgressJournalVideoRecordings;
window.__holdUpload = () => {
  window.__uploadHeld = false;
  void withJournalVideoUploadItemLock('synthetic-video-user', 'stalled-upload', async () => {
    window.__uploadHeld = true;
    await new Promise(resolve => { window.__releaseUpload = resolve; });
  });
};
const NativeRecorder = window.MediaRecorder;
window.__finishDelay = 0;
window.__fullVideoBytes = 0;
window.MediaRecorder = class extends NativeRecorder {
  finishDelay = 0;
  produced = 0;
  dataHandler = null;
  stopHandler = null;
  set ondataavailable(handler) {
    this.dataHandler = handler;
    super.ondataavailable = event => {
      this.produced += event.data.size;
      if (this.mimeType.startsWith('video')) window.__fullVideoBytes = this.produced;
      if (this.finishDelay < 0) return;
      if (this.finishDelay > 0) setTimeout(() => this.dataHandler?.call(this, event), this.finishDelay);
      else this.dataHandler?.call(this, event);
    };
  }
  get ondataavailable() { return this.dataHandler; }
  set onstop(handler) {
    this.stopHandler = handler;
    super.onstop = event => {
      if (this.finishDelay < 0) return;
      if (this.finishDelay > 0) setTimeout(() => this.stopHandler?.call(this, event), this.finishDelay);
      else this.stopHandler?.call(this, event);
    };
  }
  get onstop() { return this.stopHandler; }
  stop() { this.finishDelay = window.__finishDelay; super.stop(); }
};
window.__failCheckpoint = false;
const originalPut = IDBObjectStore.prototype.put;
IDBObjectStore.prototype.put = function(...args) {
  if (window.__failCheckpoint && this.name === 'chunks') throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
  return originalPut.apply(this, args);
};
const camera = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
window.__denyCamera = false;
navigator.mediaDevices.getUserMedia = async constraints => {
  if(window.__denyCamera) throw new DOMException('Synthetic permission denial','NotAllowedError');
  return camera(constraints);
};
navigator.mediaDevices.getDisplayMedia = async () => {
  const stream = await camera({video:true,audio:true});
  window.__screenStream = stream;
  return stream;
};
function Fixture() {
  const [open,setOpen] = useState(false), [mode,setMode] = useState('camera');
  return <JournalAiPrivacy.Provider value={false}>
    <button onClick={() => {setMode('camera');setOpen(true);}}>Open camera</button>
    <button onClick={() => {setMode('screen');setOpen(true);}}>Open screen</button>
    {open ? <JournalVideoCaptureDialog open onOpenChange={setOpen} defaultMode={mode as 'camera'|'screen'} forceInline
      recovery={{userId:'synthetic-video-user',entryId:'synthetic-entry',anchorOffset:0}}
      onReviewReady={(result) => {window.__review=result;}}
      onComplete={async result => {
        window.__saveCount++;
        if(window.__failSave) throw new Error('Synthetic storage failure.');
        await enqueueJournalVideoUpload({id:result.recoveryDraftId,userId:'synthetic-video-user',entryId:'synthetic-entry',
          durationMs:result.durationMs,anchorOffset:0,liveTranscript:'',createdAt:new Date().toISOString()}, result.video,result.audio,result.chapters);
        const durable = await readQueuedJournalVideoUpload(result.recoveryDraftId);
        if(!durable?.video.size) throw new Error('Queue did not persist video');
        await clearInProgressJournalVideoRecording(result.recoveryDraftId);
        window.__saved={size:durable.video.size,durationMs:result.durationMs,id:result.recoveryDraftId};
      }} /> : null}
  </JournalAiPrivacy.Provider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
`);
const server = await createServer({ configFile:false, root, plugins:[react()],
  optimizeDeps:{entries:[join(scratch,'index.html')]}, resolve:{alias:{'@':join(root,'src')}},
  server:{host:'127.0.0.1',port:0} });
let browser, page;
const reports=[];
try {
  await server.listen();
  const origin='http://127.0.0.1:'+server.httpServer.address().port;
  browser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'],
    ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
  const context=await browser.newContext({viewport:{width:1280,height:900},permissions:['camera','microphone'],acceptDownloads:true});
  page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await page.goto(origin+'/'+basename(scratch)+'/index.html');
  const start=async name=>{
    await page.getByRole('button',{name,exact:true}).click();
    await page.getByRole('button',{name:'Looks good — continue',exact:true}).click();
    await page.getByRole('button',{name:'Start recording',exact:true}).click();
    await page.getByRole('button',{name:'Pause recording',exact:true}).waitFor();
  };
  const visibleTransport=async()=>{
    const dimensions=await page.getByRole('button',{name:'Stop recording',exact:true}).evaluate(el=>{
      const rect=el.getBoundingClientRect();
      return {height:rect.height,width:rect.width,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight};
    });
    assert(dimensions.height>=44&&dimensions.width>=44,JSON.stringify(dimensions));
    assert(dimensions.left>=0&&dimensions.right<=dimensions.viewportWidth&&dimensions.top>=0&&dimensions.bottom<=dimensions.viewportHeight,JSON.stringify(dimensions));
  };
  await page.evaluate(()=>{window.__denyCamera=true;});
  await page.getByRole('button',{name:'Open camera',exact:true}).click();
  await page.getByRole('button',{name:/Retry camera|Try again|Retry camera or screen/}).waitFor();
  await page.evaluate(()=>{window.__denyCamera=false;});
  await page.getByRole('button',{name:/Retry camera|Try again|Retry camera or screen/}).click();
  // Retrying permission opens a ready preview directly; it must not reopen or discard a take.
  await page.getByRole('button',{name:'Start recording',exact:true}).click();
  await page.waitForTimeout(Math.max(2200, Number(process.env.JOURNAL_VIDEO_SOAK_MS) || 0));
  await visibleTransport();
  await page.getByRole('button',{name:'Recording settings',exact:true}).click();
  assert(await page.getByLabel('Camera',{exact:true}).isDisabled());
  assert(await page.getByLabel('Microphone',{exact:true}).isDisabled());
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Pause recording',exact:true}).click();
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button',{name:'Stop recording',exact:true}).click();
  await page.getByRole('button',{name:'Save video',exact:true}).waitFor();
  await page.locator('[data-testid="video-review-frame"] video').evaluate(async video=>{video.muted=true;await video.play();});
  await page.waitForFunction(()=>document.querySelector('[data-testid="video-review-frame"] video')?.currentTime>0.1);
  await page.locator('[data-testid="video-review-frame"] video').evaluate(video=>video.pause());
  await page.getByRole('button',{name:'Retake',exact:true}).click();
  await page.getByRole('button',{name:'Keep recording',exact:true}).click();
  await page.evaluate(()=>{window.__failSave=true;});
  await page.getByRole('button',{name:'Save video',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Synthetic storage failure'}).waitFor();
  assert(await page.evaluate(()=>window.__review.video.size>0));
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download backup',exact:true}).click();
  const download=await downloadPromise;
  assert(download.suggestedFilename().endsWith('.webm'));
  await page.screenshot({path:join(output,'journal-video-save-recovery.png'),fullPage:true});
  await page.evaluate(()=>{window.__failSave=false;window.__saveCount=0;});
  await page.getByRole('button',{name:'Save video',exact:true}).evaluate(button=>{button.click();button.click();});
  await page.waitForFunction(()=>window.__saved?.size>0);
  assert.equal(await page.evaluate(()=>window.__saveCount),1,'Repeated Save started another handoff');
  reports.push({case:'camera-denial-retry-pause-resume-safe-review-backup-queue',saved:await page.evaluate(()=>window.__saved)});

  await page.setViewportSize({width:390,height:844});
  await start('Open camera');
  await page.waitForTimeout(1500);
  await visibleTransport();
  await page.evaluate(()=>{window.__previewStream=document.querySelector('video').srcObject;});
  await page.setViewportSize({width:844,height:390});
  await page.waitForTimeout(400);
  assert(await page.evaluate(()=>document.querySelector('video').srcObject===window.__previewStream),'Rotation replaced the camera stream');
  await visibleTransport();
  await page.getByRole('button',{name:'Stop recording',exact:true}).click();
  await page.getByRole('button',{name:'Save video',exact:true}).waitFor();
  const saveBox=await page.getByRole('button',{name:'Save video',exact:true}).boundingBox();
  assert(saveBox&&saveBox.y>=0&&saveBox.y+saveBox.height<=390,'Landscape review action clipped');
  await page.screenshot({path:join(output,'journal-video-mobile-landscape.png'),fullPage:true});
  const keptId=await page.evaluate(()=>window.__review.recoveryDraftId);
  await page.getByRole('button',{name:'Save and return',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  assert(await page.evaluate(async id=>(await window.__readQueued(id))?.video.size>0,keptId),'Save and return closed without durable media');
  reports.push({case:'mobile-rotation-preserves-stream-review-and-keep-for-later'});

  await page.setViewportSize({width:1280,height:900});
  await start('Open screen');
  await page.waitForTimeout(2500);
  await page.evaluate(()=>window.__screenStream.getVideoTracks()[0].dispatchEvent(new Event('ended')));
  await page.getByRole('button',{name:'Save video',exact:true}).waitFor();
  assert(await page.evaluate(()=>window.__review.video.size>0),'Stop sharing did not preserve its recording');
  await page.getByRole('button',{name:'Save video',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  reports.push({case:'browser-stop-sharing-opens-review-and-persists-one-clip'});
  // The real recorder becomes inactive before final data events reach the hook.
  await page.evaluate(() => { window.__finishDelay = 5500; window.__review = null; });
  await start('Open camera');
  await page.waitForTimeout(1800);
  await page.getByRole('button',{name:'Stop recording',exact:true}).click();
  await page.getByText('The browser is still releasing the final video data.',{exact:false}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Save video',exact:true}).count(),0,'Partial chunks opened completed review');
  await page.getByRole('button',{name:'Save video',exact:true}).waitFor();
  assert(await page.evaluate(() => window.__review.video.size === window.__fullVideoBytes),'Late final bytes were omitted from review');
  await page.getByRole('button',{name:'Save video',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  reports.push({case:'delayed-final-data-does-not-open-partial-review'});

  await page.evaluate(() => { window.__finishDelay = -1; window.__review = null; });
  await start('Open camera');
  await page.waitForTimeout(1800);
  await page.getByRole('button',{name:'Stop recording',exact:true}).click();
  await page.getByRole('button',{name:'Keep recovery and close',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Save video',exact:true}).count(),0);
  await page.getByRole('button',{name:'Keep recovery and close',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  assert(await page.evaluate(() => window.__recoveries().some(row => row.finalizationIncomplete && row.videoChunkCount > 0)), 'Missing final event lost its recovery source');
  reports.push({case:'missing-final-event-retains-explicitly-incomplete-recovery'});

  await page.evaluate(() => { window.__finishDelay = 0; window.__failCheckpoint = true; });
  await start('Open camera');
  await page.getByRole('alert').filter({hasText:'Local backup needs attention'}).waitFor();
  assert(await page.getByRole('button',{name:'Pause recording',exact:true}).isVisible(),'Storage failure should be visible without pausing');
  await page.evaluate(() => { window.__failCheckpoint = false; });
  await page.getByRole('button',{name:'Stop and preserve recording',exact:true}).click();
  await page.getByRole('button',{name:'Save video',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  reports.push({case:'quota-failure-visible-during-recording-full-memory-take-still-saves'});

  // Cross-tab Web Locks: an item upload lock never blocks the local queue lock.
  await page.evaluate(() => window.__holdUpload());
  await page.waitForFunction(() => window.__uploadHeld);
  const second = await context.newPage();
  await second.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await second.goto(origin+'/'+basename(scratch)+'/index.html');
  await second.waitForFunction(() => typeof window.__enqueue === 'function');
  const queuedElsewhere = await second.evaluate(async () => {
    await window.__enqueue({id:'parallel-local-save',userId:'synthetic-video-user',entryId:'synthetic-entry',
      anchorOffset:0,durationMs:1000,liveTranscript:'',createdAt:new Date().toISOString()},new Blob(['durable']),null);
    return (await window.__readQueued('parallel-local-save')).video.size;
  });
  assert.equal(queuedElsewhere,7);
  await page.evaluate(() => window.__releaseUpload());
  await second.close();
  reports.push({case:'cross-tab-stalled-upload-does-not-block-new-local-save'});
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(JSON.stringify({passed:reports.length, reports},null,2));
  writeFileSync(join(output,'journal-video-browser-results.json'),JSON.stringify({passed:reports.length,reports},null,2));
} catch(error) {
  if(page) await page.screenshot({path:join(output,'journal-video-failure.png'),fullPage:true}).catch(()=>{});
  throw error;
} finally { await browser?.close(); await server.close(); rmSync(scratch,{recursive:true,force:true}); }
