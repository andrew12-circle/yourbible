/** Browser regression against the real EntryEditorPane and writing controls.
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
const scratch = mkdtempSync(join(root, '.journal-scroll-browser-'));
const output = process.env.RUNNER_TEMP || scratch;
mkdirSync(output, { recursive: true });
const reports = [];
writeFileSync(join(scratch, 'index.html'), '<html><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
writeFileSync(join(scratch, 'supabase.ts'), `
export const fixture = {
  writes: 0,
  row: { id: '00000000-0000-4000-8000-000000000001', user_id: 'synthetic-user', revision: 1,
    title: 'Writing viewport test', body: '', summary: null, mood: null, tags: [],
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
writeFileSync(join(scratch, 'fixture.tsx'), `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import EntryEditorPane from '@/components/journal/EntryEditorPane';
import { TooltipProvider } from '@/components/ui/tooltip';
import { measureTextareaCaretRect } from '@/lib/journal/textareaMirrorStyles';
import { fixture } from './supabase';
import '@/index.css';

function TestPage() {
  const [saves, setSaves] = useState(0);
  return <MemoryRouter><AuthContext.Provider value={{ user: { id: 'synthetic-user' }, loading: false, profile: null } as never}>
    <TooltipProvider><div style={{height:'100dvh', display:'flex', flexDirection:'column', overflow:'hidden'}}>
      <EntryEditorPane entryId={fixture.row.id}
        journals={[{ id: 'synthetic-journal', name: 'Test journal', color: '210 80% 50%' } as never]}
        onChanged={() => setSaves(n => n + 1)} onClose={() => {}} onNew={() => {}} onDeleted={() => {}} />
      <output style={{display:'none'}}>{saves}</output>
    </div></TooltipProvider>
  </AuthContext.Provider></MemoryRouter>;
}
window.__journalFixture = fixture;
window.__journalGeometry = () => {
  const pane = document.querySelector('[data-journal-editor-scroll]');
  const field = pane?.querySelector('textarea.journal-plain-write-field');
  if (!pane || !field) throw new Error('Editor not mounted');
  const p = pane.getBoundingClientRect(), t = field.getBoundingClientRect();
  const caret = measureTextareaCaretRect(field);
  return { paneTop: p.top, paneBottom: p.bottom, paneHeight: p.height, top: pane.scrollTop,
    caretTop: t.top + caret.top - field.scrollTop, caretBottom: t.top + caret.top + caret.height - field.scrollTop,
    height: field.clientHeight, contentHeight: field.scrollHeight, internalScroll: field.scrollTop,
    position: field.selectionStart, length: field.value.length, windowScroll: window.scrollY,
    dockTop: document.querySelector('[data-journal-map-dock]').getBoundingClientRect().top };
};
createRoot(document.getElementById('root')!).render(<TestPage />);
`);
const server = await createServer({
  configFile: false, root, plugins: [react()],
  resolve: { alias: [
    { find: '@/integrations/supabase/client', replacement: join(scratch, 'supabase.ts') },
    { find: '@', replacement: join(root, 'src') },
  ] },
  server: { host: '127.0.0.1', port: 0 },
});
let browser;
let page;
try {
  await server.listen();
  const address = server.httpServer.address();
  const origin = 'http://127.0.0.1:' + address.port;
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    if (route.request().url().startsWith(origin)) return route.continue();
    // Keep the actual map iframe node, but do not contact maps or real services.
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<div style="background:#eef2f5;height:200px">Synthetic map</div>' });
  });
  await page.goto(origin + '/' + basename(scratch) + '/index.html');
  const body = page.locator('[data-journal-editor-scroll] textarea.journal-plain-write-field').first();
  await body.waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('iframe[title="Map"]').waitFor({ state: 'visible' });
  await page.evaluate(() => {
    window.__originalMap = document.querySelector('iframe[title="Map"]');
    window.__originalBody = document.querySelector('textarea.journal-plain-write-field');
  });
  const settle = async () => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForTimeout(30);
  };
  const check = async (label, mustScroll = true) => {
    await settle();
    const g = await page.evaluate(() => window.__journalGeometry());
    reports.push({ label, ...g });
    assert(g.caretTop >= g.paneTop - 2, label + ': caret above viewport ' + JSON.stringify(g));
    assert(g.caretBottom <= g.paneBottom - Math.min(60, g.paneHeight * 0.12), label + ': no writing space below caret ' + JSON.stringify(g));
    assert(g.contentHeight <= g.height + 1, label + ': textarea clipped internally ' + JSON.stringify(g));
    assert(g.internalScroll <= 1, label + ': nested textarea scroll ' + JSON.stringify(g));
    if (mustScroll) assert(g.top > 0, label + ': outer pane did not scroll');
    assert.equal(g.windowScroll, 0, label + ': scrolled the whole window');
    assert(await page.evaluate(() => document.querySelector('iframe[title="Map"]') === window.__originalMap), label + ': map was replaced');
    assert(await page.evaluate(() => document.querySelector('textarea.journal-plain-write-field') === window.__originalBody), label + ': editor was replaced');
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS', label, JSON.stringify(g));
    return g;
  };
  await body.focus();
  const paragraph = 'This synthetic journal sentence checks natural wrapping and continued writing in the same editor. ';
  await page.keyboard.insertText(paragraph.repeat(35));
  await check('long wrapped paste');
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('Another visible line ' + i);
    await check('continued typing ' + i);
  }
  await page.keyboard.press('Enter');
  await check('blank trailing line');
  await page.keyboard.press('Control+Home');
  await page.keyboard.insertText('Inserted at the start.\n');
  const middle = await check('edit near beginning', false);
  assert(middle.position < 100, 'Moving the caret must not force it to the document end');
  await page.keyboard.press('Control+End');
  await page.keyboard.insertText('\n' + paragraph.repeat(12));
  await check('resume at end');
  await page.waitForTimeout(1000);
  await check('autosave leaves cursor and map intact');
  const beforeWheel = await page.evaluate(() => window.__journalGeometry().top);
  await body.hover();
  await page.mouse.wheel(0, -250);
  await page.waitForTimeout(400);
  const readingTop = await page.evaluate(() => window.__journalGeometry().top);
  assert(readingTop < beforeWheel, 'Native wheel should scroll earlier text');
  await page.waitForTimeout(300);
  assert(Math.abs((await page.evaluate(() => window.__journalGeometry().top)) - readingTop) < 2, 'Reading position should not snap back');
  await page.keyboard.insertText(' Typing resumes following.');
  await check('typing after manual scroll');
  await page.setViewportSize({ width: 760, height: 700 });
  await page.waitForTimeout(200);
  await check('narrower shorter window');
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText('A short replacement after deleting the long entry.');
  const short = await check('delete and shrink', false);
  assert(short.height < 150, 'Textarea must shrink after deletion');
  await page.keyboard.insertText('\n' + paragraph.repeat(45));
  await check('grow again after deletion');
  await page.screenshot({ path: join(output, 'journal-writing-browser.png') });
  console.log('All browser writing checks passed.');
} catch (error) {
  console.error(error);
  if (page) {
    await page.screenshot({ path: join(output, 'journal-writing-browser-failure.png') }).catch(() => {});
    writeFileSync(join(output, 'journal-writing-browser-dom.html'), await page.content().catch(() => 'Unavailable'));
  }
  process.exitCode = 1;
} finally {
  writeFileSync(join(output, 'journal-writing-browser-results.json'), JSON.stringify(reports, null, 2));
  await browser?.close();
  await server.close();
  rmSync(scratch, { recursive: true, force: true });
}
