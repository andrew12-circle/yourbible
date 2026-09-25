/** Isolated component browser checks: no sign-in, production writes, or user data. */
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import { chromium } from "@playwright/test";

const root = process.cwd();
const temporary = await mkdtemp(path.join(root, ".morning-sunrise-check-"));
const output = path.join(root, "artifacts", "morning-sunrise");
await mkdir(output, { recursive: true });
await writeFile(path.join(temporary, "viewport.ts"), `export function useAppShellMode() { return { showHubShell: window.innerWidth >= 768 }; }
export function useVisualViewportMetrics() { return { viewportHeight: window.innerHeight }; }`);
await writeFile(path.join(temporary, "index.html"), '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Morning Formula component check</title></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>');
await writeFile(path.join(temporary, "main.tsx"), `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import { LivingHopeChrome } from '@/components/living-hope/LivingHopeChrome';
import { MorningSessionHero } from '@/components/living-hope/MorningSessionHero';
import { MorningSessionFooter } from '@/components/living-hope/MorningSessionFooter';
import { MorningFormulaSessionTimer } from '@/components/living-hope/MorningFormulaSessionTimer';
import { MorningWorshipMusic } from '@/components/living-hope/MorningWorshipMusic';
import { MorningWorshipGuide } from '@/components/living-hope/MorningWorshipGuide';
import { MorningGuidedCoach } from '@/components/living-hope/MorningGuidedCoach';
import { upsertWorshipMusicHistory } from '@/lib/livingHope/worshipMusic';
const steps = ['intro','worship','thanksgiving','scripture','prayer','vision','story','surrender','covering','assignment','done'].map(kind => ({ kind }));
const initialHistory = upsertWorshipMusicHistory(upsertWorshipMusicHistory([], 'https://www.youtube.com/playlist?list=PLMorningWorship'), 'https://www.youtube.com/watch?v=gUaoXqB73o8').map((item, index) => ({ ...item, thumbnail_url: 'https://example.invalid/morning-art.jpg', title: index === 0 ? '3 Hours Praying in Tongues, Soaking Worship & Prophetic Music for Intercession & Prayer' : 'Instrumental prayer' }));
function App() {
 const [stepIndex, setStepIndex] = useState(1);
 const [music, setMusic] = useState({ url: initialHistory[0].url, history: initialHistory });
 const [duration, setDuration] = useState(60);
 const kind = steps[stepIndex].kind;
 const title = kind === 'thanksgiving' ? 'Gratitude' : kind === 'worship' ? 'Worship' : kind;
 return <MemoryRouter><div className="demo-shell"><aside className="demo-sidebar"><h2>Belief</h2><small>ARCHITECTURE</small><nav>{['Overview','Bible','Journal','Prayer','Notes','Morning formula','Mind map','Artifacts'].map(label => <div key={label} className={label === 'Morning formula' ? 'active' : ''}>{label}</div>)}</nav></aside><div className="demo-main">
  <LivingHopeChrome session stepKey={kind} title="Morning formula"
   hero={<MorningSessionHero steps={steps} stepIndex={stepIndex} goalTotal={0} onStepIndexChange={setStepIndex} title={title} subtitle={kind === 'worship' ? 'Put on your worship music. Take a breath and turn your attention to God.' : undefined} />}
   right={<MorningFormulaSessionTimer durationMin={duration} onDurationChange={setDuration} stepRemainingMs={505000} sessionRemainingMs={3600000} stepExpired={false} visible />}
   footer={<MorningSessionFooter steps={steps} stepIndex={stepIndex} saving={false} onBack={() => setStepIndex(i => Math.max(0, i - 1))} onContinue={() => setStepIndex(i => i + 1)} />}>
   <div className="flex flex-1 flex-col py-3">{kind === 'worship' ? <div className="flex flex-1 flex-col gap-6"><MorningGuidedCoach>Put on your worship music. Take a breath and turn your attention to God.</MorningGuidedCoach><div className="space-y-6"><MorningWorshipMusic {...music} onChange={setMusic} /><MorningWorshipGuide stepBudgetMs={600000} /></div></div> : <p>Gratitude step reached.</p>}</div>
  </LivingHopeChrome>
 </div></div></MemoryRouter>;
}
const style = document.createElement('style');
style.textContent = 'body{margin:0}.demo-shell{display:flex;height:100dvh;background:#f3f2ef;padding:12px;gap:12px;box-sizing:border-box}.demo-sidebar{flex:0 0 220px;background:#fff;border-radius:18px;padding:24px 16px;color:#242932}.demo-sidebar h2{font-size:30px;font-weight:700}.demo-sidebar small{font-size:10px;letter-spacing:3px}.demo-sidebar nav{margin-top:30px;font-size:14px}.demo-sidebar nav>div{padding:11px 12px;margin-top:3px}.demo-sidebar .active{background:#f6efdf;border-radius:12px;font-weight:600}.demo-main{flex:1;min-width:0;overflow:hidden;border-radius:18px}.demo-main>.living-hope-root{height:100%;min-height:0}@media(max-width:767px){.demo-sidebar{display:none}.demo-shell{padding:0;gap:0}.demo-main{border-radius:0}}';
document.head.appendChild(style);
createRoot(document.getElementById('root')).render(<App />);
`);

let server;
let browser;
try {
  server = await createServer({
    root, configFile: false, plugins: [react()],
    resolve: { alias: [
      { find: "@/hooks/useAppShellMode", replacement: path.join(temporary, "viewport.ts") },
      { find: "@/hooks/useKeyboardInset", replacement: path.join(temporary, "viewport.ts") },
      { find: "@", replacement: path.join(root, "src") },
    ] },
    server: { host: "127.0.0.1", port: 4193, strictPort: true },
  });
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1709, height: 900 }, reducedMotion: "reduce" });
  page.on("pageerror", error => errors.push(error.message));
  await page.route(/https:\/\//, route => route.abort());
  const url = `http://127.0.0.1:4193/${path.basename(temporary)}/index.html`;
  async function ready() {
    await page.goto(url);
    await page.getByRole("heading", { name: "Worship", exact: true }).waitFor();
    await page.locator(".morning-music-art-fallback").waitFor();
  }
  async function verifyLayout(name) {
    const result = await page.evaluate(() => {
      const main = document.querySelector("main").getBoundingClientRect();
      const card = document.querySelector(".morning-music-card").getBoundingClientRect();
      const footer = document.querySelector(".morning-session-footer").getBoundingClientRect();
      return { width: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth,
        cardInside: card.left >= main.left - 1 && card.right <= main.right + 1,
        footerVisible: footer.bottom <= innerHeight + 1 && footer.top >= 0,
        singleHeading: document.querySelectorAll('h1').length === 1 };
    });
    assert.ok(result.overflow <= 1, `${name}: horizontal overflow ${JSON.stringify(result)}`);
    assert.ok(result.cardInside && result.footerVisible && result.singleHeading, `${name}: ${JSON.stringify(result)}`);
    await page.screenshot({ path: path.join(output, `${name}.png`) });
  }
  await ready();
  assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuemax"), "9");
  assert.equal(await page.getByRole("link", { name: "Play worship" }).getAttribute("target"), "_blank");
  await verifyLayout("desktop");
  await page.getByText("All steps", { exact: true }).click();
  const future = page.getByRole("list", { name: "Morning formula steps" }).getByRole("button").nth(1);
  assert.ok(await future.isDisabled(), "Future steps must stay locked");
  await page.screenshot({ path: path.join(output, "desktop-menu.png") });
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".morning-step-disclosure").evaluate(el => el.open), false);
  await page.getByRole("button", { name: "Instrumental prayer", exact: true }).click();
  assert.match(await page.getByRole("link", { name: "Play worship" }).getAttribute("href"), /PLMorningWorship/);
  await page.getByRole("button", { name: "Change music", exact: true }).click();
  await page.getByRole("textbox", { name: "Worship song or playlist link" }).fill("https://www.youtube.com/watch?v=gUaoXqB73o8");
  await page.getByRole("textbox", { name: "Worship music name" }).fill("Quiet morning");
  await page.getByRole("button", { name: "Save music", exact: true }).click();
  assert.ok(await page.getByText("Quiet morning", { exact: true }).count() >= 1);
  await page.getByRole("button", { name: /Continue to Gratitude/ }).click();
  await page.getByRole("heading", { name: "Gratitude", exact: true }).waitFor();
  assert.equal(await page.locator("main").evaluate(el => el.scrollTop), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('id')), "morning-session-title");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("heading", { name: "Worship", exact: true }).waitFor();
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await verifyLayout("dark");
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await ready();
    await verifyLayout(width === 390 ? "mobile" : "narrow");
    const continueButton = await page.getByRole("button", { name: /Continue to Gratitude/ }).boundingBox();
    assert.ok(continueButton.height >= 44, "Continue must remain a touch-sized target");
    await page.locator("main").evaluate(el => el.scrollTo(0, el.scrollHeight));
    await page.getByRole("heading", { name: "4. Respond", exact: true }).scrollIntoViewIfNeeded();
    const respond = await page.getByRole("heading", { name: "4. Respond", exact: true }).boundingBox();
    const footer = await page.locator(".morning-session-footer").boundingBox();
    assert.ok(respond.y + respond.height <= footer.y + 1, "Respond must not be trapped under the footer");
    await page.getByRole("button", { name: /Continue to Gratitude/ }).click();
    await page.getByRole("heading", { name: "Gratitude", exact: true }).waitFor();
    assert.equal(await page.locator("main").evaluate(el => el.scrollTop), 0);
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log("Morning sunrise: desktop, dark, mobile, narrow layout, menu, music save/switch, footer and heading focus passed.");
} finally {
  await browser?.close();
  await server?.close();
  await rm(temporary, { recursive: true, force: true });
}
