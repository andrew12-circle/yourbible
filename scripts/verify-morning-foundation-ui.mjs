/** Isolated, in-memory fixture: no real account, database writes, or microphone. */
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import { chromium } from "@playwright/test";

const root = process.cwd();
const temporary = await mkdtemp(path.join(root, ".morning-foundation-check-"));
const output = path.join(root, "artifacts", "morning-foundation");
await mkdir(output, { recursive: true });
await writeFile(path.join(temporary, "index.html"), '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Morning foundation test fixture</title></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>');
await writeFile(path.join(temporary, "environment.tsx"), `export function useAuth() { return { user: { id: 'foundation-browser-fixture' }, profile: { user_id: 'foundation-browser-fixture', journal_e2e_enabled: false }, loading: false }; }`);
await writeFile(path.join(temporary, "main.tsx"), String.raw`
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MorningFoundationContext } from '@/components/living-hope/foundation/MorningFoundationContext';
import { MorningWorshipPractice, WorshipMusicChoice } from '@/components/living-hope/foundation/MorningWorshipPractice';
import { MorningAngelsPrayer } from '@/components/living-hope/foundation/MorningAngelsPrayer';
import { MorningFocusOpening, MorningRealMemories, MorningMemorySceneBridge, MorningActionBridge, MorningHopePrayer } from '@/components/living-hope/foundation/MorningFoundationPanels';
import { TodayAssignmentPanel } from '@/components/living-hope/TodayAssignmentPanel';
import { emptyMorningFoundationSession } from '@/lib/livingHope/morningFoundation';
import { emptyDailyAssignment } from '@/lib/livingHope/morningRitual';
import { emptyWorkbook } from '@/lib/livingHope/workbookTypes';
import '@/index.css';
const settings = { theme: 'Practice presence in this season.', motto: 'Listen first. Choose the next faithful step.', question: 'How will I practice what matters today?', hopePrayer: '' };
const initial = { ...emptyWorkbook(), morning_foundation: settings, morning_memories: [{ id: 'fixture-memory', kind: 'real_memory', title: 'Fixture memory: a meaningful conversation', body: 'Browser test content only. This is not a claimed event from any user’s life.', happenedOn: '', photoPath: '', audioPath: '', sceneId: 'fixture-scene' }], stories: [{ id: 'fixture-scene', title: 'Fixture future scene: an attentive evening', text: 'Imagined browser test content.' }], quotes: [{ id: 'fixture-quote', text: 'A saved personal reminder.' }], rules_of_operation: ['Pause before responding.'] };
function Fixture() {
  const [view, setView] = useState('opening');
  const [workbook, setWorkbook] = useState(initial);
  const [day, setDay] = useState({ ...emptyMorningFoundationSession(), ...settings, initialized: true });
  const [assignment, setAssignment] = useState({ ...emptyDailyAssignment(), mustDo: 'Keep my existing priority' });
  const [editing, setEditing] = useState(false);
  const [scene, setScene] = useState('fixture-scene');
  return <MorningFoundationContext.Provider value={{ workbook, day, selectedSceneId: scene, onEditingChange: setEditing, worshipRemainingMs: 600000, soundCuesEnabled: false,
    onDayChange: patch => setDay(value => ({ ...value, ...patch })),
    onSaveSettings: async settings => { setWorkbook(value => ({ ...value, morning_foundation: settings })); setDay(value => ({ ...value, ...settings })); },
    onSaveMemories: async memories => setWorkbook(value => ({ ...value, morning_memories: memories })),
    onSelectScene: id => { setScene(id); setDay(value => ({ ...value, sceneId: id, sceneTitle: workbook.stories.find(story => story.id === id)?.title || '' })); }
  }}><main className="morning-theme" style={{ maxWidth: 1180, margin: '0 auto', padding: 20, minHeight: '100vh', overflowWrap: 'anywhere' }}>
    <p style={{ fontSize: 12, marginBottom: 16 }}>Isolated test fixture · no real account or database</p>
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>{['opening','gratitude','scene','assignment','worship','angels'].map(name => <button key={name} type="button" disabled={editing} onClick={() => setView(name)} style={{ minHeight: 44, padding: '8px 12px', border: '1px solid #999', borderRadius: 12 }}>{name}</button>)}</nav>
    {view === 'opening' && <MorningFocusOpening />}
    {view === 'worship' && <><MorningWorshipPractice /><WorshipMusicChoice><p>Fixture worship music</p></WorshipMusicChoice></>}
    {view === 'angels' && <MorningAngelsPrayer />}
    {view === 'gratitude' && <><MorningRealMemories /><MorningHopePrayer /></>}
    {view === 'scene' && <><MorningMemorySceneBridge /><MorningActionBridge /></>}
    {view === 'assignment' && <TodayAssignmentPanel assignment={assignment} onChange={patch => setAssignment(value => ({ ...value, ...patch }))} scriptureReflection="" visionRecall="" storyRecall="" thanksgivingNow={[]} touches={{}} goals={[]} />}
  </main></MorningFoundationContext.Provider>;
}
createRoot(document.getElementById('root')).render(<MemoryRouter><TooltipProvider><Fixture /></TooltipProvider></MemoryRouter>);
`);
let server;
let browser;
const errors = [];
const report = [];
try {
  server = await createServer({ root, configFile: false, plugins: [react()], optimizeDeps: { entries: [path.join(temporary, "index.html")] }, resolve: { alias: [{ find: "@/contexts/AuthContext", replacement: path.join(temporary, "environment.tsx") }, { find: "@", replacement: path.join(root, "src") }] }, server: { host: "127.0.0.1", port: 4197, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.setDefaultTimeout(20_000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/https:\/\//, (route) => route.abort());
  const url = `http://127.0.0.1:4197/${path.basename(temporary)}/index.html`;
  const inspect = async (size, view) => {
    const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, controls: [...document.querySelectorAll('input:not([type=file]),textarea,select')].filter(element => { const rect = element.getBoundingClientRect(); return rect.width > 1 && (rect.left < -1 || rect.right > innerWidth + 1); }).map(element => element.getAttribute('aria-label')) }));
    report.push({ size, view, ...geometry });
    assert.ok(geometry.overflow <= 1, `${size}/${view}: horizontal overflow`);
    assert.deepEqual(geometry.controls, [], `${size}/${view}: clipped inputs`);
    await page.screenshot({ path: path.join(output, `${size}-${view}.png`), fullPage: true });
  };
  for (const [size, width, height] of [["desktop", 1440, 960], ["tablet", 820, 1180], ["phone", 390, 844], ["narrow", 320, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto(url);
    await page.getByRole("heading", { name: settingsHeading() }).waitFor();
    await inspect(size, "opening");
    await page.getByRole("button", { name: "Edit my foundation", exact: true }).click();
    await page.getByRole("textbox", { name: "My motto", exact: true }).fill("An edited motto for this fixture.");
    await inspect(size, "foundation-editor");
    assert.equal(await page.getByRole("button", { name: "gratitude", exact: true }).isDisabled(), true);
    await page.getByRole("button", { name: "Save my foundation", exact: true }).click();
    await page.getByRole("button", { name: "Edit my foundation", exact: true }).waitFor();
    await page.getByRole("button", { name: "gratitude", exact: true }).click();
    await page.getByRole("button", { name: "Recall this memory", exact: true }).click();
    await page.getByRole("textbox", { name: "What I remember and appreciate", exact: true }).fill("My fixture reflection.");
    await page.getByRole("button", { name: "Use this paired scene today", exact: true }).click();
    await inspect(size, "memory-recall");
    await page.getByRole("button", { name: "Add a real memory", exact: true }).click();
    await page.getByRole("textbox", { name: "Memory title", exact: true }).fill("Second fixture memory");
    await page.getByRole("textbox", { name: "What actually happened?", exact: true }).fill("Test content, not a user fact.");
    assert.equal(await page.getByRole("button", { name: "Save memory", exact: true }).isDisabled(), true);
    await page.getByRole("checkbox").check();
    await inspect(size, "memory-editor");
    await page.getByRole("button", { name: "Save memory", exact: true }).click();
    await page.getByRole("heading", { name: "Second fixture memory", exact: true }).waitFor();
    await page.getByRole("button", { name: "scene", exact: true }).click();
    await page.getByRole("textbox", { name: "My action from this morning", exact: true }).fill("Listen carefully at dinner.");
    await inspect(size, "scene-bridge");
    await page.getByRole("button", { name: "assignment", exact: true }).click();
    await page.getByRole("button", { name: "Add without replacing my assignment", exact: true }).click();
    assert.equal(await page.getByRole("textbox", { name: "The one thing — if only one thing gets done", exact: true }).inputValue(), "Keep my existing priority\nListen carefully at dinner.");
    await inspect(size, "assignment");
    await page.getByRole("button", { name: "worship", exact: true }).click();
    await page.getByRole("button", { name: "Start prayer timer", exact: true }).click();
    await page.getByRole("button", { name: "Pause prayer timer", exact: true }).click();
    await page.getByRole("button", { name: "Pray in tongues", exact: true }).click();
    assert.equal(await page.getByText("Fixture worship music", { exact: true }).count(), 0);
    await inspect(size, "worship-prayer");
    await page.getByRole("button", { name: "angels", exact: true }).click();
    await page.getByRole("button", { name: "Write my prayer", exact: true }).click();
    await page.getByRole("textbox", { name: "My angels and protection prayer", exact: true }).fill("Fixture personal prayer. Not Scripture.");
    await inspect(size, "angels-editor");
    await page.getByRole("button", { name: "Save this prayer", exact: true }).click();
    await page.getByRole("button", { name: "Record my angels prayer", exact: true }).waitFor();
    assert.equal(await page.getByRole("checkbox", { name: "I spoke this prayer aloud today" }).isChecked(), false);
    await page.getByRole("checkbox", { name: "I spoke this prayer aloud today" }).check();
    await inspect(size, "angels-prayer");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await inspect("phone-dark", "angels-prayer");
  assert.deepEqual(errors, [], "Browser runtime errors");
  await writeFile(path.join(output, "report.json"), JSON.stringify({ passed: true, report, errors }, null, 2));
  console.log(`Morning foundation: ${report.length} responsive states, real-memory confirmation, saved pairing and non-destructive assignment passed.`);
} finally {
  await browser?.close();
  await server?.close();
  await rm(temporary, { recursive: true, force: true });
}
function settingsHeading() { return "Practice presence in this season."; }
