import { build } from 'esbuild';
for (const name of ['framework-fetch-transcript', 'framework-prefetch-youtube-captions']) {
  const output = await build({ entryPoints: [`supabase/functions/${name}/index.ts`], bundle: true,
    write: false, platform: 'neutral', format: 'esm', external: ['npm:*', 'https:*'], logLevel: 'silent' });
  if (!output.outputFiles[0]?.text.includes('Deno.serve')) throw new Error(`${name} has no handler`);
  console.log(`${name}: source/import graph bundled successfully (not runtime verification)`);
}
