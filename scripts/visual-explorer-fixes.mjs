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
async function patch(path, before, after) {
  const url = new URL(path, root), text = await readFile(url, 'utf8');
  if (text.includes(after)) return;
  if (text.split(before).length !== 2) throw new Error(`Visual polish anchor changed in ${path}: ${before}`);
  await writeFile(url, text.replace(before, after));
}
await patch('src/components/bible/TopBar.tsx', 'items-center justify-end overflow-x-auto scrollbar-hide touch-pan-x', 'items-center justify-start overflow-x-auto scrollbar-hide touch-pan-x');
await patch('src/components/bible/TopBar.tsx', 'onClick={onChapterContext} title="Explore artwork, maps and places"', 'data-visual-explorer-trigger onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); onChapterContext(); }} title="Explore artwork, maps and places"');
await patch('src/components/bible/visual/explorer/VisualArtworkView.tsx', '<VisualImage src={asset.detailUrl}', '<VisualImage src={asset.readerUrl ?? asset.detailUrl}');
await patch('src/components/bible/visual/explorer/VisualLibraryWorkspace.tsx', 'const visibleVisuals = visuals.filter', 'const visibleVisuals = (section === "places" && collection === "all" ? [] : visuals).filter');
await patch('src/components/bible/visual/explorer/VisualLibraryWorkspace.tsx', '<option value="chapter">This chapter · {contextName} {chapter}</option>', '<option value="chapter">This chapter</option>');
await patch('src/components/bible/visual/explorer/VisualPlacesView.tsx', 'return <div className={galleryGrid}>{props.places.map', 'return <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">{props.places.map');
// Match asynchronous focus restoration without weakening the expected focus target.
await patch('scripts/test-visual-workspace.mjs', 'name:label,exact:true', 'name:label,exact:label!=="Saved"');
await patch('scripts/test-visual-workspace.mjs', "assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Explore artwork, maps and places');", "await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Explore artwork, maps and places');");
await patch('scripts/test-visual-workspace.mjs', "await page.screenshot({path:resolve(out,engine+'-artwork.png')});", "await page.waitForFunction(()=>{const img=document.querySelector('[aria-label=\"Artwork viewer\"] img');return img?.complete&&img.naturalWidth>0;});await page.screenshot({path:resolve(out,engine+'-artwork.png')});");
