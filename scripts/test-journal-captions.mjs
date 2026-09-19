/** Live-caption regression against the real desktop editor and mobile body editor.
 * Uses only synthetic data and a local Supabase substitute; no account is used.
 * Install Playwright separately, then set PLAYWRIGHT_MODULE to its index.mjs.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = process.cwd();
const scratch = mkdtempSync(join(root, '.journal-caption-browser-'));
const output = process.env.RUNNER_TEMP || scratch;
mkdirSync(output, { recursive: true });
const reports = [];
writeFileSync(join(scratch, 'index.html'), '<html><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
writeFileSync(join(scratch, 'supabase.ts'), `
export const fixture = {
  writes: 0,
  row: { id: '00000000-0000-4000-8000-000000000001', user_id: 'synthetic-user', revision: 1,
    title: 'Live journal writing', body: '', summary: null, mood: null, tags: [],
    entry_at_ts: '2026-09-18T09:22:00Z', pinned: false, analyze_for_mirror: false,
    journal_id: 'synthetic-journal', location_name: 'Test location', weather: null,
    weather_temp_c: null, weather_icon: null, entry_kind: null, lat: 10, lng: 20,
    e2e_encrypted: false, contentLocked: false },
};
const session = { user: { id: 'synthetic-user', email: 'test@example.test' }, access_token: 'synthetic' };
function query(table: string) {
  let single = false;
  let patch: Record<string, unknown> | null = null;
  const result = () => {
    if (patch && table === 'journal_entries') {
      fixture.row = { ...fixture.row, ...patch, revision: fixture.row.revision + 1 };
      fixture.writes += 1; patch = null;
    }
    let data: unknown = [];
    if (single) data = table === 'journal_entries' ? { ...fixture.row }
      : table === 'profiles' ? { user_id: 'synthetic-user', journal_e2e_enabled: false }
      : table === 'journals' ? { id: 'synthetic-journal', e2e_required: false } : null;
    return { data, error: null, count: 0 };
  };
  const chain = new Proxy({}, { get: (_target, prop) => {
    if (prop === 'then') return (yes: (value: unknown) => unknown, no: (error: unknown) => unknown) => Promise.resolve(result()).then(yes, no);
    return (...args: unknown[]) => {
      if (prop === 'single' || prop === 'maybeSingle') single = true;
      if (prop === 'update') patch = args[0] as Record<string, unknown>;
      return chain;
    };
  } });
  return chain;
}
const channel = { on: () => channel, subscribe: () => channel, unsubscribe: async () => {} };
export const supabase = {
  from: query, rpc: () => query('rpc'), channel: () => channel, removeChannel: async () => {},
  auth: { getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user: session.user }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  functions: { invoke: async () => ({ data: null, error: null }) },
  storage: { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }),
    createSignedUrl: async () => ({ data: { signedUrl: '/synthetic-video.mp4' }, error: null }) }) },
};
`);

writeFileSync(join(scratch, 'recorder.tsx'), `
export default function Recorder(props: any) {
  window.__captionRecorder = props;
  return <button aria-label="Record video" onClick={() => props.onRecordingStart?.(props.getAnchorOffset())}>Record video</button>;
}
`);
writeFileSync(join(scratch, 'fixture.tsx'), `
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import EntryEditorPane from '@/components/journal/EntryEditorPane';
import { NewJournalEntryBodyEditor } from '@/components/journal/new-entry/NewJournalEntryBodyEditor';
import { useJournalCaptionPreview } from '@/hooks/useJournalCaptionPreview';
import { TooltipProvider } from '@/components/ui/tooltip';
import { persistVideoJournalTranscriptToEntry } from '@/lib/journal/journalVideoEntryMerge';
import { fixture } from './supabase';
import '@/index.css';
const noop = () => {};
function MobileFixture() {
  const [body, setBody] = useState('');
  const preview = useJournalCaptionPreview('synthetic-user:mobile', body, true);
  const field = useRef(null), chat = useRef(null), bottom = useRef(null);
  window.__mobileCaption = { start: () => preview.start(body, body.length), update: preview.update, clear: preview.clear, getBody: () => body };
  return <div data-journal-entry-page style={{height:'100dvh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
    <header style={{height:60,flexShrink:0}}>Journal</header>
    <main data-journal-compose-scroll style={{overflowY:'auto',flex:1,minHeight:0,padding:'16px 20px 200px'}}>
      <h1>Mobile journal</h1>
      <NewJournalEntryBodyEditor body={body} videoCaptionPreview={preview.preview} onBodyChange={setBody}
        isListening={false} inlineChatMode={false} bodyPlaceholder="Write here" bodyTextareaRef={field}
        listeningSections={{thought:'',words:'',plan:'',interpretation:''}} setListeningSection={noop}
        chatScrollRef={chat} chatBottomRef={bottom} chatTurns={[]} aiBusy={false} dictInterim=""
        existingSketches={[]} existingAttachments={[]} pendingSketches={[]} pendingAttachments={[]}
        onOpenSketch={noop} onRemoveExistingPhoto={noop} onRemovePendingFile={noop} />
    </main>
    <footer data-journal-compose-dock style={{height:80,flexShrink:0}}>Write / Record / Dictate</footer>
  </div>;
}
function TestPage() {
  const [saves, setSaves] = useState(0);
  const [mobile, setMobile] = useState(false);
  window.__showMobile = () => setMobile(true);
  return <MemoryRouter><AuthContext.Provider value={{ user: { id: 'synthetic-user' }, loading: false, profile: null } as never}>
    <TooltipProvider>{mobile ? <MobileFixture /> : <div style={{height:'100dvh', display:'flex', flexDirection:'column', overflow:'hidden'}}>
      <EntryEditorPane entryId={fixture.row.id}
        journals={[{ id:'synthetic-journal', name:'Test journal', color:'210 80% 50%' } as never]}
        onChanged={() => setSaves(n => n + 1)} onClose={noop} onNew={noop} onDeleted={noop} />
      <output style={{display:'none'}}>{saves}</output>
    </div>}</TooltipProvider>
  </AuthContext.Provider></MemoryRouter>;
}
window.__journalFixture = fixture;
window.__commitCaption = async (text: string) => {
  const recorder = window.__captionRecorder;
  await persistVideoJournalTranscriptToEntry('synthetic-user', fixture.row.id, text, 0, recorder.getBodySnap());
};
createRoot(document.getElementById('root')!).render(<TestPage />);
`);
const server = await createServer({
  configFile: false, root, plugins: [react()],
  optimizeDeps: { entries: [join(scratch, "index.html")] },
  resolve: { alias: [
    { find: '@/components/journal/JournalVideoCaptureButton', replacement: join(scratch, 'recorder.tsx') },
    { find: '@/integrations/supabase/client', replacement: join(scratch, 'supabase.ts') },
    { find: '@', replacement: join(root, 'src') },
  ] },
  server: { host:'127.0.0.1', port:0 },
});
let browser, page;
try {
  await server.listen();
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  browser = await chromium.launch({ headless:true, ...(process.env.CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.CHROMIUM_EXECUTABLE_PATH} : {}) });
  page = await browser.newPage({ viewport:{width:1100,height:900} });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue()
    : route.fulfill({status:200,contentType:'text/html',body:'<div style="background:#eef2f5;height:200px">Synthetic map</div>'}));
  await page.goto(origin + '/' + basename(scratch) + '/index.html');
  const settle = async () => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    await page.waitForTimeout(35);
  };
  const body = page.locator('[data-journal-editor-scroll] textarea').first();
  await body.waitFor({state:'visible'});
  await page.locator('iframe[title="Map"]').waitFor({state:'visible'});
  const original = 'Text before recording.\n\nText after recording.';
  await body.fill(original);
  await page.waitForTimeout(900);
  await body.evaluate(el => {el.focus();el.setSelectionRange(22,22);});
  // Simulate the real dialog taking focus AFTER the capture button snapshots the caret.
  await page.evaluate(() => {
    const anchor = window.__captionRecorder.getAnchorOffset();
    document.activeElement.blur();
    window.__captionRecorder.onRecordingStart(anchor);
    window.__originalMap = document.querySelector('iframe[title="Map"]');
  });
  await settle();
  const utterance = 'These spoken words should appear in my journal as I talk. ';
  const checkCaption = async (label, selector='[data-journal-editor-scroll]', checkMap=true) => {
    await settle();
    const geometry = await page.evaluate(({selector,checkMap}) => {
      const pane = document.querySelector(selector), live = pane.querySelector('[data-journal-live-caption]');
      const caret = live.querySelector('[data-journal-caption-caret]');
      const box = pane.getBoundingClientRect(), end = caret.getBoundingClientRect();
      return {inside:!!live,top:pane.scrollTop,bottom:box.bottom,caretBottom:end.bottom,
        appScroll:window.scrollY,sameMap:!checkMap||window.__originalMap===document.querySelector('iframe[title="Map"]'),
        statusCaption:!!document.querySelector('[data-journal-save-status] [data-journal-live-caption]'),
        headerText:document.querySelector('header')?.textContent,
        focused:document.activeElement.tagName};
    }, {selector,checkMap});
    reports.push({label,...geometry});
    assert(geometry.inside && !geometry.statusCaption, label + ': caption must be inside journal body');
    assert(geometry.caretBottom <= geometry.bottom - 20, label + ': spoken line is clipped ' + JSON.stringify(geometry));
    assert.equal(geometry.appScroll,0,label+': must not scroll the whole app');
    assert(geometry.sameMap,label+': map was recreated');
    assert.notEqual(geometry.focused,'TEXTAREA',label+': must not focus a textarea/open the keyboard');
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS', label, JSON.stringify(geometry));
  };
  for (let i=1;i<=14;i+=1) {
    await page.evaluate(text => window.__captionRecorder.onLiveTranscript(text), utterance.repeat(i*3));
    await checkCaption('desktop cumulative speech '+i);
  }
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(()=>window.__journalFixture.row.body),original,'Live preview must not overwrite stored text');
  assert.equal(await page.locator('[data-journal-save-status]').count(),0,'No header caption banner');
  const liveNode = await page.locator('[data-journal-live-caption]').elementHandle();
  await page.evaluate(text=>window.__captionRecorder.onLiveTranscript(text),utterance.repeat(45));
  await settle();
  assert(await liveNode.evaluate(el=>el===document.querySelector('[data-journal-live-caption]')),'Live text node must remain mounted');
  await page.screenshot({path:join(output,'journal-caption-desktop.png')});
  const pane = page.locator('[data-journal-editor-scroll]');
  await pane.hover(); await page.mouse.wheel(0,-250); await page.waitForTimeout(150);
  const readingTop = await pane.evaluate(el=>el.scrollTop);
  await page.evaluate(text=>window.__captionRecorder.onLiveTranscript(text),utterance.repeat(48));
  await settle();
  assert(Math.abs(await pane.evaluate(el=>el.scrollTop)-readingTop)<2,'Manual reading must not snap back to live text');
  await page.evaluate(()=>window.__captionRecorder.onRecordingCancelled());
  await settle();
  assert.equal(await page.locator('[data-journal-live-caption]').count(),0,'Cancel must remove transient caption');
  assert.equal(await body.inputValue(),original,'Cancel must retain the original entry');
  await page.evaluate(()=>window.__captionRecorder.onRecordingStart(22));
  await settle();
  await page.evaluate(()=>window.__captionRecorder.onLiveTranscript('Final spoken words'));
  await settle();
  const fields = page.locator('[data-journal-editor-scroll] textarea');
  await fields.last().fill('\n\nMy manually edited ending.');
  await page.waitForTimeout(900);
  await page.evaluate(()=>document.activeElement.blur());
  await page.evaluate(()=>window.__commitCaption('Final spoken words'));
  await settle();
  assert.equal(await page.locator('[data-journal-live-caption]').innerText(),'','Saved text must not also appear as a preview');
  await page.evaluate(()=>window.__captionRecorder.onVideoSaved({transcript:'Final spoken words',anchorOffset:22}));
  await settle();
  const saved = await body.inputValue();
  assert(saved.includes('My manually edited ending.'),'Saving speech must preserve concurrent typing');
  assert.equal((saved.match(/Final spoken words/g)||[]).length,1,'Finished transcript must appear once');
  await page.setViewportSize({width:390,height:780});
  await page.evaluate(()=>window.__showMobile()); await settle();
  await page.evaluate(()=>window.__mobileCaption.start()); await settle();
  for(let i=1;i<=10;i+=1) {
    await page.evaluate(text=>window.__mobileCaption.update(text),utterance.repeat(i*2));
    await checkCaption('mobile cumulative speech '+i,'[data-journal-compose-scroll]',false);
  }
  assert.equal(await page.evaluate(()=>window.__mobileCaption.getBody()),'','Mobile live preview must not change stored text');
  await page.screenshot({path:join(output,'journal-caption-mobile.png')});
  await page.evaluate(()=>window.__mobileCaption.clear()); await settle();
  assert.equal(await page.locator('[data-journal-live-caption]').count(),0,'Mobile cancel must remove preview');
  console.log('All desktop/mobile journal-caption browser checks passed.');
} catch(error) {
  console.error(error); process.exitCode=1;
  if(page) {
    await page.screenshot({path:join(output,'journal-caption-failure.png')}).catch(()=>{});
    writeFileSync(join(output,'journal-caption-failure.html'),await page.content().catch(()=>''));
  }
} finally {
  writeFileSync(join(output,'journal-caption-browser-results.json'),JSON.stringify(reports,null,2));
  await browser?.close(); await server.close(); rmSync(scratch,{recursive:true,force:true});
}
