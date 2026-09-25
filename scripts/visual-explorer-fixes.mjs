import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const audioUrl = new URL('src/hooks/useReaderAudio.ts', root);
let audio = await readFile(audioUrl, 'utf8');
if (!audio.includes('// Bind reader media actions.')) {
  audio = audio.replace('        bindSleepMediaSession(audio, { title: reference, subtitle: `Part ${index + 1} of ${chunks.current.length}`, setId: reference });\n', '').replaceAll(', setId: reference', '');
  const anchor = '  const cycleSpeed = useCallback(() => {';
  if (!audio.includes(anchor)) throw new Error('Reader audio speed integration changed');
  audio = audio.replace(anchor, `  // Bind reader media actions.
  useEffect(() => {
    if (status === "idle") return;
    const unbind = bindSleepMediaSession({
      onPlay: () => { if (statusRef.current === "paused") void toggle(); },
      onPause: () => { if (statusRef.current === "playing") void toggle(); },
      onStop: stop,
    });
    updateSleepMediaSession({ title: reference, subtitle: reference, artist: "YourBible" }, status === "playing" ? "playing" : status === "paused" ? "paused" : "none");
    return unbind;
  }, [status, reference, stop, toggle]);

` + anchor);
  await writeFile(audioUrl, audio);
}
const topUrl = new URL('src/components/bible/TopBar.tsx', root);
let top = await readFile(topUrl, 'utf8');
top = top.replace('items-center justify-end overflow-x-auto scrollbar-hide touch-pan-x', 'items-center justify-start overflow-x-auto scrollbar-hide touch-pan-x');
await writeFile(topUrl, top);
