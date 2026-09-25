import { readFile, writeFile } from 'node:fs/promises';
async function change(path, from, to) {
  const url = new URL(`../${path}`, import.meta.url), text = await readFile(url, 'utf8');
  if (text.includes(to)) return;
  if (text.split(from).length !== 2) throw new Error(`Audio integration anchor changed: ${path}`);
  await writeFile(url, text.replace(from, to));
}
await change('src/lib/bible/api.ts', 'fetchSleepAudio(text: string, voiceId?: string): Promise<Blob>', 'fetchSleepAudio(text: string, voiceId?: string, signal?: AbortSignal): Promise<Blob>');
await change('src/lib/bible/api.ts', 'body: JSON.stringify({ text, voiceId }),', 'body: JSON.stringify({ text, voiceId }),\n    signal,');
await change('src/lib/bible/browserTts.ts', '  signal: AbortSignal,\n): Promise<void>', '  signal: AbortSignal,\n  rate = 0.88,\n): Promise<void>');
await change('src/lib/bible/browserTts.ts', 'utterance.rate = 0.88;', 'utterance.rate = Number.isFinite(rate) ? Math.max(0.1, Math.min(10, rate)) : 0.88;');
