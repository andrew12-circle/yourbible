import assert from 'node:assert/strict';
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error('Set PLAYWRIGHT_MODULE to the installed Playwright entry point.');
const { chromium, webkit } = await import(pathToFileURL(modulePath).href);
const output = resolve(process.env.RUNNER_TEMP || '/tmp', 'bible-earth-browser');
await mkdir(output, { recursive: true });
const source = JSON.parse(await readFile('public/bible-geography/atlas-v1.json', 'utf8'));
const unknown = source.places.find((place) => !place.candidates.length);
assert(unknown, 'Unknown places must remain in the actual atlas');
const html = 'earth-harness.html', entry = 'earth-harness.tsx';
await writeFile(html, '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/earth-harness.tsx"></script></body></html>');
await writeFile(entry, `import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BibleEarthButton } from './src/components/bible/earth/BibleEarthButton';
import { BOOKS } from './src/data/books';
import './src/index.css';
createRoot(document.getElementById('root')!).render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><BibleEarthButton book={BOOKS.find(b => b.name === 'John')!.abbr} chapter={9} translation="CSB" /></QueryClientProvider></MemoryRouter>);`);
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4179', '--strictPort'], { stdio: 'pipe' });
let logs = '';
server.stdout.on('data', (chunk) => { logs += chunk; });
server.stderr.on('data', (chunk) => { logs += chunk; });
const results = [];
try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch('http://127.0.0.1:4179/earth-harness.html')).ok) break; } catch { /* startup */ }
    await new Promise((done) => setTimeout(done, 500));
  }
  for (const [engine, launcher, viewport] of [['chromium', chromium, { width: 1440, height: 1000 }], ['webkit', webkit, { width: 390, height: 844 }]]) {
    const browser = await launcher.launch();
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [], external = [];
    let atlasRequests = 0;
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1') {
        if (url.pathname.endsWith('/atlas-v1.json')) atlasRequests++;
        return route.continue();
      }
      external.push(url.href);
      return route.abort();
    });
    try {
      await page.goto('http://127.0.0.1:4179/earth-harness.html');
      assert.equal(atlasRequests, 0, 'Closed reader must not load geography');
      await page.getByRole('button', { name: 'Explore this chapter in Google Earth' }).click();
      await page.getByRole('heading', { name: 'John 9', exact: true }).waitFor();
      const search = page.getByLabel('Search biblical or modern place names');
      await search.fill('Siloam');
      const card = page.getByTestId('earth-place-card').filter({ has: page.getByRole('heading', { name: /Siloam/i }) }).first();
      await card.waitFor();
      const earth = card.locator('a[href^="https://earth.google.com/web/search/"]');
      assert(await earth.count(), 'Passage place needs an Earth link');
      assert.match(await earth.first().getAttribute('href'), /-?\d+(\.\d+)?%2C-?\d+/);
      assert.equal(await earth.first().getAttribute('target'), '_blank');
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export these places', exact: true }).click()]);
      const kml = await readFile(await download.path(), 'utf8');
      assert.match(kml, /<kml/);
      assert.match(kml, /Siloam/);
      const valid = await page.evaluate((xml) => !new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror'), kml);
      assert(valid, 'Downloaded KML must be valid XML');
      await page.screenshot({ path: resolve(output, `${engine}-john9.png`), fullPage: true });
      await page.getByRole('button', { name: 'All Bible places', exact: true }).click();
      await search.fill(unknown.name);
      const unknownCard = page.getByTestId('earth-place-card').filter({ has: page.getByRole('heading', { name: unknown.name, exact: true }) });
      await unknownCard.waitFor();
      assert.equal(await unknownCard.locator('a[href^="https://earth.google.com/"]').count(), 0, 'Unknown locations must not invent pins');
      await page.getByRole('button', { name: 'Return to my passage' }).click();
      await page.getByLabel('Verses (optional)').fill('12-3');
      await page.getByRole('alert').waitFor();
      assert(await page.getByRole('button', { name: 'Export these places', exact: true }).isDisabled());
      await page.getByLabel('Verses (optional)').fill('7');
      await page.getByRole('heading', { name: 'John 9 verses 7', exact: true }).waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert.equal(overflow, false, 'Explorer must fit viewport');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Explore this chapter in Google Earth' }).click();
      await page.getByRole('heading', { name: 'John 9', exact: true }).waitFor();
      assert.equal(atlasRequests, 1, 'Reopening must reuse the atlas cache');
      assert.equal(external.filter((url) => /supabase|api\.bible|openai|generativelanguage/.test(url)).length, 0, 'Explorer must not call Bible/AI/database services');
      assert.deepEqual(errors, []);
      results.push({ engine, viewport, passed: true, atlasRequests, unknown: unknown.name });
    } catch (error) {
      await page.screenshot({ path: resolve(output, `${engine}-failure.png`), fullPage: true });
      throw error;
    } finally { await browser.close(); }
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  server.kill('SIGTERM');
  await Promise.all([rm(html, { force: true }), rm(entry, { force: true })]);
  await writeFile(resolve(output, 'results.json'), JSON.stringify(results, null, 2));
  await writeFile(resolve(output, 'vite.log'), logs);
}
