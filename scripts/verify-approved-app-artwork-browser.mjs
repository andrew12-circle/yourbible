import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'artifacts/approved-app-artwork');
const fixture = await mkdtemp(path.join(root, '.artwork-preview-'));
await mkdir(output, { recursive: true });
let server;
let browser;
const counts = { beliefs: 0, tensions: 0, chats: 1, artifacts: 25, journalToday: 1, prayerWaiting: 19 };
const failures = [];
try {
  await writeFile(path.join(fixture, 'auth.ts'), 'export const useAuth = () => ({ user: null });');
  await writeFile(path.join(fixture, 'dashboard.ts'), `export const useHomeDashboard = () => ({ counts: ${JSON.stringify(counts)}, displayName: 'Icon preview', profilePhoto: null });`);
  await writeFile(path.join(fixture, 'media.ts'), 'export const HubSidebarMediaPlayer = () => null;');
  await writeFile(path.join(fixture, 'storage.ts'), 'export const HubSidebarStorageMeter = () => null;');
  await writeFile(path.join(fixture, 'mini.ts'), 'export const useMiniPhone = () => ({ openApp: () => {} });');
  await writeFile(path.join(fixture, 'mini-size.ts'), 'export const useMiniPhoneSize = () => ({ width: Math.min(360, window.innerWidth - 24) });');
  await writeFile(path.join(fixture, 'index.html'), '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body class="app-theme" style="margin:0"><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>');
  await writeFile(path.join(fixture, 'entry.tsx'), `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { HubSidebar } from '@/components/shell/HubSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { HomeAppButton } from '@/components/home/HomeAppButton';
import { MiniPhoneHomeGrid } from '@/components/mini-phone/MiniPhoneHomeGrid';
import { buildHomeApps } from '@/lib/home/homeApps';
import '@/index.css';
const apps = buildHomeApps(${JSON.stringify(counts)});
const phone = new URLSearchParams(location.search).has('phone');
createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/journal/notes']}>
    {phone ? <div data-mini-phone-screen style={{ position: 'relative', width: Math.min(360, innerWidth - 24), height: 780, margin: 12, overflow: 'hidden', borderRadius: 28 }}>
      <MiniPhoneHomeGrid apps={apps} wallpaper={null} wallpaperTint={0} wallpaperBlur={0}/>
    </div> : <SidebarProvider><HubSidebar/><main style={{ flex: 1, minWidth: 0, padding: 24 }}>
      <SidebarTrigger/>
      <h1 style={{ fontSize: 24, margin: '16px 0' }}>Approved artwork - component verification</h1>
      <section data-home-gallery style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 24, padding: 24, background: '#182131', borderRadius: 20 }}>
        {apps.filter(app => app.imageSrc).map(app => <HomeAppButton key={app.label} app={app} onClick={() => {}} iconSize={60}/>)}
      </section>
    </main></SidebarProvider>}
  </MemoryRouter>
);`);
  const mockAliases = {
    '@/contexts/AuthContext': 'auth.ts',
    '@/contexts/HomeDashboardContext': 'dashboard.ts',
    '@/components/media/HubSidebarMediaPlayer': 'media.ts',
    '@/components/shell/HubSidebarStorageMeter': 'storage.ts',
    '@/contexts/MiniPhoneContext': 'mini.ts',
    '@/hooks/useMiniPhoneSize': 'mini-size.ts',
  };
  server = await createServer({
    root, configFile: false, plugins: [react()],
    resolve: { alias: [
      ...Object.entries(mockAliases).map(([find, file]) => ({ find, replacement: path.join(fixture, file) })),
      { find: '@', replacement: path.join(root, 'src') },
    ] },
    server: { host: '127.0.0.1', port: 5192, strictPort: false },
  });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const url = `${origin}/${path.basename(fixture)}/index.html`;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 2 });
  // All data is a fixture. No production services or external assets are contacted.
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript(() => localStorage.setItem('yb_last_read', 'Gen/2'));
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(error.message));
  const waitForArt = async () => {
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll('[data-app-icon-renderer="artwork"] img')];
      return images.length > 0 && images.every(img => img.complete && img.naturalWidth === 160);
    });
  };
  const registry = await readFile(path.join(root, 'src/lib/home/appIconArtwork.ts'), 'utf8');
  const sources = [...new Set(registry.match(/\/app-icons\/illustrated-v1\/[a-z-]+\.webp/g))];
  assert.equal(sources.length, 13);
  for (const src of sources) {
    const response = await context.request.get(origin + src);
    assert.equal(response.status(), 200, src);
    assert.match(response.headers()['content-type'], /image\/webp/, src);
  }
  await page.goto(url);
  await waitForArt();
  for (const src of sources) {
    const image = page.locator(`a img[src="${src}"]`);
    assert.equal(await image.count(), src.includes('morning-formula') ? 2 : 1, src);
    const size = await image.first().boundingBox();
    assert.equal(Math.round(size.width), 28, src);
    assert.equal(Math.round(size.height), 28, src);
    assert.equal(await image.first().evaluate(img => img.parentElement.classList.contains('ios-icon')), false);
  }
  const gallery = page.locator('[data-home-gallery]');
  assert.equal(await gallery.locator('img').count(), await gallery.locator('button').count());
  assert.equal(await gallery.locator('svg').count(), 0);
  assert.equal(await page.getByRole('link', { name: 'Notes', exact: true }).getAttribute('aria-current'), 'page');
  assert.equal(await page.getByRole('link', { name: 'Journal', exact: true }).getAttribute('aria-current'), null);
  await page.screenshot({ path: path.join(output, 'desktop-light.png'), fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: path.join(output, 'desktop-dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'Framework', exact: true }).click();
  assert.equal(await page.getByRole('link', { name: 'Beliefs', exact: true }).count(), 1);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
    await page.getByRole('link', { name: 'Notes', exact: true }).waitFor();
    await waitForArt();
    const bible = page.locator('a[href="/read/Gen/2"] img');
    assert.equal(await bible.getAttribute('src'), '/app-icons/illustrated-v1/bible.webp');
    await page.screenshot({ path: path.join(output, `mobile-${width}.png`), fullPage: true });
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: 'Notes', exact: true }).waitFor({ state: 'hidden' });
    await page.goto(url + '?phone=1');
    await waitForArt();
    assert.ok(await page.locator('[data-mini-phone-screen] img[src*="illustrated-v1"]').count() > 1);
    await page.screenshot({ path: path.join(output, `mini-phone-${width}.png`), fullPage: true });
  }
  assert.deepEqual(failures, [], 'Browser exceptions');
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ status: 'passed', verifiedImages: sources.length, viewports: [1200, 390, 320], renderer: 'real sidebar, launcher and mini-phone with fixture data', backendVerified: false }, null, 2));
  console.log('Approved artwork browser checks passed: desktop, dark, mobile and mini-phone.');
} catch (error) {
  await writeFile(path.join(output, 'failure.txt'), String(error.stack || error));
  throw error;
} finally {
  await browser?.close();
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
