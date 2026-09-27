/** Real Morning Formula presentation with isolated fixtures; never authenticates or writes production data. */
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import { chromium } from "@playwright/test";

const root = process.cwd();
const temporary = await mkdtemp(path.join(root, ".morning-sanctuary-check-"));
const output = path.join(root, "artifacts", "morning-sanctuary");
await mkdir(output, { recursive: true });
await writeFile(path.join(temporary, "index.html"), '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Morning Formula fixture verification</title></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>');
await writeFile(path.join(temporary, "environment.tsx"), String.raw`
import React, { useState } from 'react';
export function useAppShellMode() { return { showHubShell: window.innerWidth >= 768 }; }
export function useVisualViewportMetrics() { return { viewportHeight: window.innerHeight, keyboardInset: 0 }; }
export function useKeyboardInset() { return 0; }
export function useAuth() { return { user: { id: 'morning-browser-fixture' }, profile: { user_id: 'morning-browser-fixture', journal_e2e_enabled: false, display_name: 'Morning reader' }, loading: false }; }
export function AuthProvider({ children }) { return children; }
export function useLivingHope() {
 const [letter, setLetter] = useState({ id: 'fixture-letter', user_id: 'morning-browser-fixture', status: 'draft', timeframe_years: 2, full_letter: 'Dear future me,\n\nKeep making room for faith, family, and meaningful work.', mission_statement: '', gratitude: '', realizations: '', outlook: '', wishes: '', scripture_anchor: '', surrender_prayer: '', unlock_at: null });
 return { busy: false, letter, goals: [], saveLetterField: async patch => setLetter(value => ({ ...value, ...patch })), setTimeframe: async years => setLetter(value => ({ ...value, timeframe_years: years })), seal: async () => {}, unlock: async () => {}, addGoal: async () => {}, patchGoal: async () => {}, removeGoal: async () => {} };
}
export function useBibles() { return { data: [{ id: 'fixture-edition', name: 'Browser fixture edition', abbreviation: 'FIXTURE' }], isPending: false, refetch: async () => {} }; }
export function pickDefaultBibleId() { return 'fixture-edition'; }
export function usePassage() { return { data: { reference: 'John 14', verses: [{ number: 1, text: 'Verified chapter fixture. This is test content, not a Scripture quotation.' }], paragraphStarts: [1], headings: [] }, refetch: async () => {} }; }
`);
await writeFile(path.join(temporary, "main.tsx"), String.raw`
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import '@/index.css';
import { LivingHopeChrome } from '@/components/living-hope/LivingHopeChrome';
import { MorningFormulaHub } from '@/components/living-hope/MorningFormulaHub';
import { MorningSessionHero } from '@/components/living-hope/MorningSessionHero';
import { MorningSessionFooter } from '@/components/living-hope/MorningSessionFooter';
import { MorningFormulaSessionTimer } from '@/components/living-hope/MorningFormulaSessionTimer';
import { MorningGuidedExperience } from '@/components/living-hope/MorningGuidedExperience';
import { MorningSessionComplete } from '@/components/living-hope/MorningSessionComplete';
import { WorkbookSectionEditor } from '@/components/living-hope/WorkbookSectionEditor';
import FutureLetterPage from '@/pages/living-hope/FutureLetterPage';
import { emptyWorkbook, WORKBOOK_SECTIONS } from '@/lib/livingHope/workbookTypes';
import { emptyDailyAssignment, DEFAULT_SURRENDER_PRAYER, ritualStepSubtitle } from '@/lib/livingHope/morningRitual';
import { DEFAULT_COVERING_PRAYER } from '@/lib/livingHope/coveringPrayer';
import { upsertWorshipMusicHistory } from '@/lib/livingHope/worshipMusic';
const initialWorkbook = { ...emptyWorkbook(), vision_headline: 'A faithful, present life.', vision_tagline: 'Practice the next right step.', income_lines: [{ id: 'line1', label: 'Meaningful work', amount: '5000' }], income_total_label: 'Monthly plan', stories: [{ id: 'scene1', title: 'A peaceful morning', text: 'The room is quiet. I take a breath, listen closely, and give my family my full attention.' }], manifesto: [{ id: 'manifesto1', text: 'I choose faithfulness over hurry.' }], quotes: [{ id: 'quote1', text: 'Make room for what matters.' }], lifestyle: ['Leave room for rest.'], routine: [{ id: 'routine1', label: 'Morning prayer', detail: 'Begin before opening email.' }], business_targets: [{ id: 'business1', name: 'Meaningful work', kpis: ['Serve one person well.'] }], financial_standards: ['Review the plan each week.'], family_leadership: ['Be present and listen.'], rules_of_operation: ['Pause before responding.'], metrics: [{ id: 'metric1', label: 'Focused work', unit: 'minutes' }], worship_playlist_url: 'https://www.youtube.com/watch?v=gUaoXqB73o8', worship_music_history: upsertWorshipMusicHistory([], 'https://www.youtube.com/watch?v=gUaoXqB73o8').map(item => ({ ...item, title: 'Morning worship', thumbnail_url: 'https://example.invalid/test-cover.jpg' })) };
const goal = { id: 'goal1', status: 'active', title: 'Be present with my family', vivid_detail: 'A calm, attentive conversation.' };
const steps = ['intro','worship','thanksgiving','scripture','prayer','manifesto','vision','story','surrender','covering','assignment','goal','metrics','done'].map(kind => kind === 'goal' ? { kind, goalId: goal.id } : { kind });
const view = new URLSearchParams(window.location.search).get('view') || 'hub';
const sectionKey = view.startsWith('workbook:') ? view.slice(9) : null;
const route = sectionKey ? '/living-hope/workbook/' + sectionKey : view === 'letter' ? '/living-hope/letter' : '/living-hope';
const query = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Contents() {
 const [workbook, setWorkbook] = useState(initialWorkbook);
 const [stepIndex, setStepIndex] = useState(Math.max(0, steps.findIndex(step => step.kind === view)));
 const [duration, setDuration] = useState(60);
 const [thanksgivingNow, setNow] = useState(['A new morning', 'People who care for me', '', '', '']);
 const [thanksgivingNotYet, setAhead] = useState(['Wisdom for the day ahead', '', '', '', '']);
 const [reflection, setReflection] = useState('');
 const [vision, setVision] = useState('');
 const [storyRecall, setStoryRecall] = useState('');
 const [assignment, setAssignment] = useState(emptyDailyAssignment());
 const [surrender, setSurrender] = useState(DEFAULT_SURRENDER_PRAYER);
 const [covering, setCovering] = useState(DEFAULT_COVERING_PRAYER);
 const [metrics, setMetrics] = useState({});
 const [touches, setTouches] = useState({});
 const [selectedStory, setSelectedStory] = useState(0);
 const [weekly, setWeekly] = useState(workbook.weekly_questions.map(() => ''));
 const updateNow = (index, text) => setNow(values => values.map((value, i) => i === index ? text : value));
 const updateAhead = (index, text) => setAhead(values => values.map((value, i) => i === index ? text : value));
 if (view === 'hub') return <LivingHopeChrome hubLanding><MorningFormulaHub workbook={workbook} letter={null} goals={[goal]} todayReview={null} streak={3} greeting="Good morning" /></LivingHopeChrome>;
 if (view === 'letter') return <FutureLetterPage />;
 if (sectionKey) {
   const meta = WORKBOOK_SECTIONS.find(section => section.key === sectionKey);
   return <LivingHopeChrome title={meta.label} subtitle={meta.hint}><div className="morning-workbook-fields space-y-5"><WorkbookSectionEditor section={sectionKey} workbook={workbook} onChange={setWorkbook} weeklyAnswers={weekly} onWeeklyAnswersChange={setWeekly} metricValues={metrics} onMetricValuesChange={setMetrics} /></div></LivingHopeChrome>;
 }
 const step = steps[stepIndex];
 const back = () => setStepIndex(index => Math.max(0, index - 1));
 const next = () => setStepIndex(index => Math.min(steps.length - 1, index + 1));
 return <LivingHopeChrome session stepKey={step.kind} title="Morning formula"
  hero={step.kind !== 'done' ? <MorningSessionHero steps={steps} stepIndex={stepIndex} goalTotal={1} onStepIndexChange={setStepIndex} title={step.kind === 'intro' ? 'Make room for your morning.' : ritualStepSubtitle(step, 0, 1)} /> : undefined}
  right={<MorningFormulaSessionTimer durationMin={duration} onDurationChange={setDuration} stepRemainingMs={505000} sessionRemainingMs={3600000} stepExpired={false} visible />}
  footer={step.kind !== 'done' ? <MorningSessionFooter steps={steps} stepIndex={stepIndex} saving={false} onBack={back} onContinue={next} /> : undefined}>
  <div className="flex-1 flex flex-col py-3"><div className="flex-1 flex flex-col">
   {step.kind === 'done' ? <MorningSessionComplete userId="morning-browser-fixture" entryId={null} reference="John 14:1–6" reflection="A thought to carry into the day." assignment={{ ...assignment, mustDo: 'Make time for one unhurried conversation.' }} /> : <MorningGuidedExperience
    step={step} formalName="Morning reader" letter={null} workbook={workbook} manifestoItem={workbook.manifesto[0]}
    storySuggestedIndex={0} storySelectedIndex={selectedStory} onStorySelectedIndexChange={setSelectedStory}
    onAddStory={text => setWorkbook(value => ({ ...value, stories: [...value.stories, { id: crypto.randomUUID(), text }] }))}
    onUpdateStory={(index, patch) => setWorkbook(value => ({ ...value, stories: value.stories.map((story, i) => i === index ? { ...story, ...patch } : story) }))}
    onDeleteStory={index => setWorkbook(value => ({ ...value, stories: value.stories.filter((_, i) => i !== index) }))}
    storyRecall={storyRecall} setStoryRecall={setStoryRecall} currentGoal={goal} goals={[goal]} touches={touches}
    setTouch={(id, patch) => setTouches(value => ({ ...value, [id]: { ...value[id], goal_id: id, ...patch } }))}
    visionRecall={vision} setVisionRecall={setVision} metricValues={metrics} setMetricValues={setMetrics}
    thanksgivingNow={thanksgivingNow} thanksgivingNotYet={thanksgivingNotYet} onThanksgivingNowChange={updateNow} onThanksgivingNotYetChange={updateAhead}
    conversationEntryId={null} conversationPreview={null} conversationBusy={false} conversationError={null} ensureConversationEntry={async () => null}
    scriptureReflection={reflection} setScriptureReflection={setReflection} dailyAssignment={assignment} setDailyAssignment={patch => setAssignment(value => ({ ...value, ...patch }))}
    surrender={surrender} setSurrender={setSurrender} covering={covering} setCovering={setCovering}
    scripture={{ source: 'daily', reference: 'John 14:1-6', readerHref: '/read/Jhn/14', passage: 'UNVERIFIED PREVIEW MUST NOT APPEAR' }} scriptureBusy={false} scriptureError={null} onGenerateScripture={() => {}} journalEntryId={null}
    worshipPlaylistUrl={workbook.worship_playlist_url} worshipPlaylistHistory={workbook.worship_music_history}
    onWorshipMusicChange={({ url, history }) => setWorkbook(value => ({ ...value, worship_playlist_url: url, worship_music_history: history }))}
    onSwitchToStructured={() => {}} canGoBack={stepIndex > 0} onGoBack={back} onContinue={next} saving={false} isLastStep={stepIndex === steps.length - 2}
    stepBudgetMs={600000} stepRemainingMs={505000} stepExpired={false} durationMin={duration} onDurationChange={setDuration}
    prayerRecordings={workbook.prayer_recordings} onPrayerRecordingChange={(key, value) => setWorkbook(book => ({ ...book, prayer_recordings: { ...book.prayer_recordings, [key]: value } }))}
   />}
  </div>{step.kind !== 'done' && <details className="mt-7 border-t border-border/40 pt-2 text-sm text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3">Session options</summary><p>Fixture session options</p></details>}</div>
 </LivingHopeChrome>;
}
function App() { return <QueryClientProvider client={query}><TooltipProvider><MemoryRouter initialEntries={[route]}><div className="demo-shell"><aside className="demo-sidebar"><h2>Belief</h2><small>ARCHITECTURE</small><nav>{['Overview','Bible','Journal','Prayer','Notes','Morning formula','Mind map','Artifacts'].map(label => <div key={label} className={label === 'Morning formula' ? 'active' : ''}>{label}</div>)}</nav></aside><div className="demo-main"><Contents /></div></div></MemoryRouter></TooltipProvider></QueryClientProvider>; }
const style = document.createElement('style');
style.textContent = 'body{margin:0}.demo-shell{display:flex;height:100dvh;background:#f3f2ef;padding:12px;gap:12px;box-sizing:border-box}.demo-sidebar{flex:0 0 220px;background:#fff;border-radius:18px;padding:24px 16px;color:#242932}.demo-sidebar h2{font-size:30px;font-weight:700}.demo-sidebar small{font-size:10px;letter-spacing:3px}.demo-sidebar nav{margin-top:30px;font-size:14px}.demo-sidebar nav>div{padding:11px 12px;margin-top:3px}.demo-sidebar .active{background:#f6efdf;border-radius:12px;font-weight:600}.demo-main{flex:1;min-width:0;overflow:hidden;border-radius:18px}.demo-main>.living-hope-root{height:100%;min-height:0}@media(max-width:767px){.demo-sidebar{display:none}.demo-shell{padding:0;gap:0}.demo-main{border-radius:0}}';
document.head.appendChild(style);
createRoot(document.getElementById('root')).render(<App />);
`);

let server;
let browser;
let page;
const errors = [];
const report = [];
const views = ['hub', 'intro', 'worship', 'thanksgiving', 'scripture', 'prayer', 'manifesto', 'vision', 'story', 'surrender', 'covering', 'assignment', 'goal', 'metrics', 'done', 'letter', ...['vision','stories','manifesto','quotes','lifestyle','routine','business','standards','family','rules','weekly','metrics'].map(key => `workbook:${key}`)];
try {
  server = await createServer({ root, configFile: false, plugins: [react()], resolve: { alias: [
    ...['@/contexts/AuthContext', '@/hooks/useAppShellMode', '@/hooks/useKeyboardInset', '@/hooks/useLivingHope', '@/hooks/useBibles', '@/hooks/usePassage'].map(find => ({ find, replacement: path.join(temporary, 'environment.tsx') })),
    { find: '@', replacement: path.join(root, 'src') },
  ] }, server: { host: '127.0.0.1', port: 4195, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1724, height: 980 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(20_000);
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/https:\/\//, route => route.abort());
  const url = `http://127.0.0.1:4195/${path.basename(temporary)}/index.html`;
  async function show(view) {
    await page.goto(`${url}?view=${encodeURIComponent(view)}`);
    await page.locator('.morning-theme h1').waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  async function inspect(view, size, screenshot = true) {
    const result = await page.evaluate(() => {
      const main = document.querySelector('.morning-theme-scroll');
      const box = main.getBoundingClientRect();
      const footer = document.querySelector('.morning-session-footer')?.getBoundingClientRect();
      const bad = [...document.querySelectorAll('.morning-surface,.morning-gratitude-panel,.morning-reading-passage,.morning-reflection-card,.morning-assignment-field,.morning-workspace-body,input:not([type=file]):not([type=hidden]),textarea')].filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 1 && rect.height > 1 && (rect.left < box.left - 2 || rect.right > box.right + 2);
      }).map(element => ({ tag: element.tagName, className: element.className }));
      return { width: innerWidth, documentOverflow: document.documentElement.scrollWidth - innerWidth, mainOverflow: main.scrollWidth - main.clientWidth,
        headingCount: document.querySelectorAll('.morning-theme h1').length, bad,
        footerVisible: !footer || (footer.bottom <= innerHeight + 1 && footer.top >= 0) };
    });
    report.push({ view, size, ...result });
    if (screenshot) await page.screenshot({ path: path.join(output, `${size}-${view.replace(':', '-')}.png`) });
    assert.equal(result.headingCount, 1, `${size}/${view}: duplicate heading`);
    assert.ok(result.documentOverflow <= 1 && result.mainOverflow <= 2, `${size}/${view}: horizontal overflow ${JSON.stringify(result)}`);
    assert.deepEqual(result.bad, [], `${size}/${view}: clipped card or input`);
    assert.ok(result.footerVisible, `${size}/${view}: unreachable footer`);
  }
  for (const [size, width, height] of [['desktop', 1724, 980], ['mobile', 390, 844], ['narrow', 320, 844]]) {
    await page.setViewportSize({ width, height });
    for (const view of views) { await show(view); await inspect(view, size, size !== 'narrow' || ['hub','scripture','assignment','letter','workbook:vision'].includes(view)); }
  }
  await page.setViewportSize({ width: 1724, height: 980 });
  await show('hub');
  assert.equal(await page.getByRole('progressbar', { name: "Today's session progress" }).getAttribute('aria-valuenow'), '0');
  await page.getByText('Explore all foundation sections', { exact: true }).click();
  assert.equal(await page.locator('.morning-foundation-section-grid a').count(), 13);
  await inspect('hub-expanded', 'desktop');
  const imageSize = await page.evaluate(() => new Promise(resolve => { const image = new Image(); image.onload = () => resolve(image.naturalWidth); image.onerror = () => resolve(0); image.src = '/images/morning-sanctuary.webp'; }));
  assert.equal(imageSize, 1000, 'Bundled scenery failed to load');

  await show('thanksgiving');
  const left = await page.locator('[data-group=now]').boundingBox();
  const right = await page.locator('[data-group=not-yet]').boundingBox();
  assert.ok(right.x > left.x + left.width - 1, 'Desktop gratitude should be side by side');
  await page.getByRole('textbox', { name: 'Thankful today 3', exact: true }).fill('An unhurried morning');
  await page.getByRole('button', { name: /Thankful for what's ahead/ }).click();
  await page.getByRole('textbox', { name: "Thankful for what's ahead 2", exact: true }).fill('Clarity in my decisions');
  await page.getByRole('button', { name: /Thankful today/ }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Thankful today 3', exact: true }).inputValue(), 'An unhurried morning');

  await show('scripture');
  assert.equal(await page.getByText('UNVERIFIED PREVIEW MUST NOT APPEAR').count(), 0);
  await page.getByRole('textbox', { name: 'What stood out?', exact: true }).fill('One thought for today.');
  await page.getByRole('button', { name: 'Read here', exact: true }).click();
  await page.getByText('Verified chapter fixture.', { exact: false }).waitFor();
  await inspect('scripture-inline', 'desktop');
  await page.getByRole('button', { name: 'My physical Bible', exact: true }).click();
  assert.equal(await page.getByRole('textbox', { name: 'What stood out?', exact: true }).inputValue(), 'One thought for today.');

  await show('surrender');
  await page.getByRole('button', { name: 'Edit prayer', exact: true }).click();
  await page.getByRole('textbox', { name: 'Surrender prayer text', exact: true }).fill('My personal prayer remains mine.');
  await page.getByRole('button', { name: 'Read prayer', exact: true }).click();
  await page.getByText('My personal prayer remains mine.', { exact: true }).waitFor();

  await show('worship');
  await page.getByText('All steps', { exact: true }).click();
  assert.ok(await page.getByRole('list', { name: 'Morning formula steps' }).getByRole('button').nth(1).isDisabled());
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.morning-step-disclosure').evaluate(element => element.open), false);
  await page.locator('.morning-session-footer button').last().click();
  await page.getByRole('heading', { name: 'Gratitude', exact: true }).waitFor();
  assert.equal(await page.locator('main').evaluate(element => element.scrollTop), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'morning-session-title');

  for (const view of ['hub','thanksgiving','scripture','surrender','assignment','workbook:vision']) {
    await show(view); await page.evaluate(() => document.documentElement.classList.add('dark')); await inspect(view, 'dark');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await show('thanksgiving');
  assert.equal(await page.locator('[data-group=not-yet]').isVisible(), false);
  await page.getByRole('button', { name: /Thankful for what's ahead/ }).click();
  assert.equal(await page.locator('[data-group=now]').isVisible(), false);
  assert.equal(await page.locator('[data-group=not-yet]').isVisible(), true);
  await page.locator('main').evaluate(element => element.scrollTo(0, element.scrollHeight));
  const continueBox = await page.locator('.morning-session-footer button').last().boundingBox();
  assert.ok(continueBox.height >= 44 && continueBox.y + continueBox.height <= 844, 'Phone continue control is not reachable');
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log(`Morning Formula complete redesign: ${report.length} layout checks passed; hub, all 14 step states, letter, 12 foundation editors, phone/narrow/dark layouts, local imagery, reading, gratitude, prayer, and navigation.`);
} catch (error) {
  await page?.screenshot({ path: path.join(output, 'failure.png') }).catch(() => undefined);
  throw error;
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ layouts: report, errors }, null, 2));
  await browser?.close();
  await server?.close();
  await rm(temporary, { recursive: true, force: true });
}
