/** Compiled-worker desktop/phone regression with synthetic text and no provider access. */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, preview } from 'vite';
import react from '@vitejs/plugin-react-swc';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = process.cwd();
const scratch = mkdtempSync(join(root, '.transcript-only-browser-'));
const output = process.env.RUNNER_TEMP || scratch;
const quote = 'Read the entire argument before drawing a conclusion. John 3:16 is mentioned here but that does not verify the claim.';
writeFileSync(join(scratch, 'index.html'), '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/fixture.tsx"></script></body></html>');
writeFileSync(join(scratch, 'fixture.tsx'), `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Panel from '@/components/framework/artifact-detail/ArtifactTranscriptOnlyStudy';
import ErrorCard from '@/components/framework/artifact-detail/ArtifactTranscriptFetchErrorCard';
import '@/index.css';
function Fixture() {
  const [text, setText] = useState(${JSON.stringify('[12:49] ' + quote)});
  const [seek, setSeek] = useState(-1);
  window.setTranscript = setText;
  return <main style={{maxWidth:760,margin:'0 auto',padding:16}}>
    <h1 style={{fontSize:24,marginBottom:16}}>Saved transcript study</h1>
    <ErrorCard error="AI credits exhausted" hasTranscript onPaste={() => { throw Error('Unexpected paste action'); }} />
    <Panel artifactId="synthetic-source" text={text} onSeek={setSeek} />
    <output aria-label="Last seek">{seek}</output>
  </main>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
`);
let server, browser;
const failures = [];
try {
  const config = { configFile:false, root:scratch, plugins:[react()],
    resolve:{ alias:{ '@':join(root,'src') } },
    build:{ outDir:join(scratch,'dist'), emptyOutDir:true },
    preview:{host:'127.0.0.1',port:0}, logLevel:'warn' };
  await build(config);
  server = await preview(config);
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:1100,height:900}});
  const external = [];
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin + '/')) return route.continue();
    external.push(url); return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(error.message));
  let workers = 0;
  page.on('worker', () => { workers++; });
  await page.goto(origin);
  await page.getByText(quote,{exact:true}).waitFor();
  assert.ok(workers > 0, 'The production-built Web Worker must actually execute');
  assert.equal(await page.getByRole('alert').count(),0);
  assert.equal(await page.getByRole('button',{name:'Paste transcript'}).count(),0);
  assert.equal(await page.locator('output').textContent(),'-1');
  await page.getByRole('button',{name:'Play from 12:49'}).click();
  assert.equal(await page.locator('output').textContent(),'769');
  await page.screenshot({path:join(output,'transcript-only-desktop.png'),fullPage:true});

  const replacement = 'Replacement transcript: never substitute text from another source. Read the surrounding material before drawing conclusions.';
  await page.evaluate(text => window.setTranscript(text), replacement);
  await page.getByText(replacement,{exact:true}).waitFor();
  assert.equal(await page.getByText(quote,{exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:/^Play/}).count(),0);
  await page.getByRole('button',{name:'Hide excerpts'}).click();
  assert.equal(await page.locator('blockquote').count(),0);
  await page.getByRole('button',{name:'Show excerpts'}).click();
  await page.getByText(replacement,{exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Phone layout must not overflow horizontally');
  await page.screenshot({path:join(output,'transcript-only-phone.png'),fullPage:true});

  const long = Array.from({length:241},(_,i) => '['+i+':00] Section '+i+' asks readers to consider the source carefully before accepting an interpretation. Compare the written reference and the surrounding discussion.').join('\n');
  await page.evaluate(text => window.setTranscript(text), long);
  await page.getByText(/241 nonempty transcript segments scanned/).waitFor();
  assert.ok(await page.getByText(/Closing · Excerpt/).count() > 0);
  assert.ok(await page.locator('blockquote').count() <= 6);

  const noWorker = await context.newPage();
  noWorker.on('pageerror', error => failures.push(error.message));
  await noWorker.addInitScript(() => { window.Worker = undefined; });
  await noWorker.goto(origin);
  await noWorker.getByText(quote,{exact:true}).waitFor();
  await context.setOffline(true);
  await noWorker.evaluate(text => window.setTranscript(text), replacement);
  await noWorker.getByText(replacement,{exact:true}).waitFor();
  assert.equal(external.length,0,'Local selection must make no external requests');
  assert.deepEqual(failures,[]);
  console.log('PASS: compiled worker, saved-transcript warning, user-only seek, source replacement, phone layout, 241-minute coverage, and offline no-worker fallback.');
} finally {
  await browser?.close();
  await new Promise(resolve => server?.httpServer ? server.httpServer.close(resolve) : resolve());
  rmSync(scratch,{recursive:true,force:true});
}
