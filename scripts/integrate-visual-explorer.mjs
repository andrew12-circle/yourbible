import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
function once(text, from, to, path) {
  if (text.split(from).length !== 2) throw new Error(`Integration anchor changed in ${path}: ${from}`);
  return text.replace(from, to);
}
async function edit(path, changes) {
  const url = new URL(path, root), original = await readFile(url, 'utf8');
  const marker = '// visual-explorer-toolbar-v1';
  if (original.includes(marker)) return;
  let text = original;
  for (const [from, to] of changes) text = once(text, from, to, path);
  await writeFile(url, `${marker}\n${text}`);
}
await edit('src/components/bible/TopBar.tsx', [
  ['  Home,', '  Home,\n  Palette,'],
  ['    showChapterContext,\n  };', '    showChapterContext: false,\n  };'],
  ['    readerGlassPanel,\n    singlePage', '    readerGlassPanel,\n    "z-[150]",\n    singlePage'],
  ['      <header\n        className=', '      <header\n        aria-hidden={!open || (singlePage && focusMode)}\n        style={{ visibility: open && !(singlePage && focusMode) ? "visible" : "hidden" }}\n        className='],
  ['"mx-3 mt-2 max-w-3xl sm:mx-auto sm:px-2 flex items-center gap-2 rounded-2xl px-2 sm:px-3 py-2"', '"mx-auto mt-2 flex w-[calc(100%-1.5rem)] max-w-6xl flex-wrap items-center gap-2 rounded-2xl px-2 py-2 sm:px-3"'],
  ['className="flex items-center gap-1 min-w-0 shrink max-w-[42%] sm:max-w-none"', 'className="flex min-w-0 flex-[1_0_15rem] items-center gap-1"'],
  ['              </Popover>\n            </div>', '              </Popover>\n              {!focusMode && onChapterContext ? <button type="button" onClick={onChapterContext} title="Explore artwork, maps and places" aria-label="Explore artwork, maps and places" className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-zinc-800 px-3 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-ring"><Palette className="h-4 w-4" aria-hidden="true" />Explore</button> : null}\n            </div>'],
  ['"flex items-center min-w-0 flex-1 justify-end",\n                singlePage && "overflow-x-auto scrollbar-hide touch-pan-x",', '"flex min-w-0 max-w-full flex-[1_1_38rem] items-center justify-end overflow-x-auto scrollbar-hide touch-pan-x",'],
  ['<BibleEarthButton book={currentBook.abbr} chapter={currentChapter} translation={bibles.find((entry) => entry.id === bibleId)?.abbreviation} />', '{!onChapterContext && <BibleEarthButton book={currentBook.abbr} chapter={currentChapter} translation={bibles.find((entry) => entry.id === bibleId)?.abbreviation} />}'],
]);
await edit('src/hooks/useReaderChapterMedia.ts', [
  ['chapterContext, hasChapterMedia, inlinePlatesForChapter', 'chapterContext, inlinePlatesForChapter'],
  ['import { hasVisualSeedForChapter } from "@/lib/visualBible/seed";\n', ''],
  ['showChapterContext: hasChapterMedia(bookAbbr, chapter) || hasVisualSeedForChapter(bookAbbr, chapter)', 'showChapterContext: true'],
]);
await edit('src/pages/reader/ReaderPage.tsx', [
  ['      <ReaderPageOverlays\n', '      <ReaderPageOverlays\n        visualOwnerId={user?.id}\n        bibleAbbreviation={displayBibles.find((entry) => entry.id === bibleId)?.abbreviation}\n'],
  ['      if (e.key !== "Escape") return;', '      if (e.key !== "Escape" || e.defaultPrevented || (e.target instanceof Element && e.target.closest(\'[role="dialog"]\'))) return;'],
]);
await edit('src/pages/reader/ReaderPageOverlays.tsx', [
  ['  chapterCtx: ChapterContextBundle;\n', '  chapterCtx: ChapterContextBundle;\n  visualOwnerId?: string;\n  bibleAbbreviation?: string;\n'],
  ['  chapterCtx,\n}: Props)', '  chapterCtx,\n  visualOwnerId,\n  bibleAbbreviation,\n}: Props)'],
  ['      <ChapterContextSheet\n', '      <ChapterContextSheet\n        ownerId={visualOwnerId}\n        translation={bibleAbbreviation}\n'],
]);
await edit('src/components/ui/dialog.tsx', [
  ['& { hideCloseButton?: boolean }', '& { hideCloseButton?: boolean; overlayClassName?: string }'],
  ['{ className, children, hideCloseButton = false, ...props }', '{ className, children, hideCloseButton = false, overlayClassName, ...props }'],
  ['    <DialogOverlay />', '    <DialogOverlay className={overlayClassName} />'],
]);
await edit('src/components/ui/sheet.tsx', [
  ['VariantProps<typeof sheetVariants> {}', 'VariantProps<typeof sheetVariants> { overlayClassName?: string }'],
  ['{ side = "right", className, children, style, ...props }', '{ side = "right", className, children, style, overlayClassName, ...props }'],
  ['        <SheetOverlay />', '        <SheetOverlay className={overlayClassName} />'],
]);
for (const name of ['NoteDialog', 'BookmarkDialog']) await edit(`src/components/bible/${name}.tsx`, [
  ['<DialogContent className="paper-texture border-gold/40">', '<DialogContent overlayClassName="z-[140]" className="z-[141] paper-texture border-gold/40">'],
]);
await edit('src/components/bible/VerseSheet.tsx', [
  ['<SheetContent side="bottom" className="h-[85vh]', '<SheetContent overlayClassName="z-[140]" side="bottom" className="z-[141] h-[85vh]'],
]);
await edit('src/components/bible/BibleSearchDialog.tsx', [
  ['<SelectContent className="max-h-64">', '<SelectContent className="z-[150] max-h-64">'],
  ['        aria-modal="true"', '        aria-modal="true"\n        onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); onClose(); } }}'],
]);
await edit('src/components/bible/ReaderToolbarActions.tsx', [
  ['<div className={cn("flex items-center gap-0.5 shrink-0", compact && "pr-0.5")}>', '<div role="group" aria-label="Reading tools" className={cn("flex items-center gap-0.5 shrink-0", compact && "pr-0.5")}>'],
  ['title="Art, maps & context for this chapter"', 'title="Explore artwork, maps and places"'],
  ['<PopoverContent align="end" className="w-56 p-3">', '<PopoverContent align="end" className="z-[150] w-56 p-3">'],
  ['<DropdownMenuContent align="end" className="w-56">', '<DropdownMenuContent align="end" className="z-[150] max-h-[75dvh] w-64 overflow-y-auto">'],
  ['<DropdownMenuSubContent className="max-h-72 overflow-y-auto">', '<DropdownMenuSubContent className="z-[151] max-h-72 overflow-y-auto">'],
  ['<DropdownMenuSubContent className="w-64">', '<DropdownMenuSubContent className="z-[151] w-64">'],
  ['      <ReaderIconButton onClick={onBookmark}', '      {onCycleAudioSpeed && onToggleAudio ? <button type="button" onClick={onCycleAudioSpeed} disabled={audioDisabled || audioLoading} aria-label={`Audio speed ${audioPlaybackRate} times; change speed`} title="Change audio speed. Device speech updates at the next segment." className="min-h-9 min-w-9 shrink-0 rounded-full px-1 text-xs text-zinc-600 hover:bg-white/60 disabled:opacity-40">{audioPlaybackRate}×</button> : null}\n\n      <ReaderIconButton onClick={onBookmark}'],
]);
await edit('src/components/bible/visual/explorer/VisualLibraryWorkspace.tsx', [
  ['import { BOOKS }', 'import type { ChapterContextBundle } from "@/data/biblePlates/types";\nimport { Link } from "react-router-dom";\nimport { parseBibleReference } from "@/lib/bible/parseBibleReference";\nimport { BOOKS }'],
  ['type Props = { book?: string;', 'type Props = { context?: ChapterContextBundle; book?: string;'],
  ['function Workspace({ book, chapter, translation:', 'function Workspace({ context, book, chapter, translation:'],
  ['.slice(0, section === "discover" ? 8 : limit);', '.slice(0, section === "discover" && collection === "all" ? 8 : limit);'],
  ['setSection("art"); setCollection(item.id); if (item.id !== "masterworks") setSection("discover");', 'setCollection(item.id); setSection(item.id === "masterworks" ? "art" : item.id === "maps" ? "maps" : item.id === "artifacts" ? "objects" : item.id === "places" ? "places" : "discover");'],
  ['section === "discover" && visuals.length > 8', 'section === "discover" && collection === "all" && visuals.length > 8'],
  ['section !== "discover" && visuals.length > limit', '(section !== "discover" || collection !== "all") && visuals.length > limit'],
  ['          <footer className=', '          {context && (context.timeline.length > 0 || context.relatedPassages.length > 0) && <details className="mt-7 rounded-xl border p-4 text-sm"><summary className="cursor-pointer font-medium">Study chronology & related Scriptures</summary><p className="my-3 text-xs text-muted-foreground">Inherited chronology notes; dates may reflect particular historical reconstructions.</p>{context.timeline.map(event => <p key={event.id} className="my-2">{event.label} · {event.approxYear}{event.empire ? ` · ${event.empire}` : ""}</p>)}<div className="flex flex-wrap gap-3">{context.relatedPassages.map(text => { const ref = parseBibleReference(text); return ref ? <Link key={text} className="inline-flex min-h-11 items-center underline" onClick={onNavigate} to={`/read/${ref.bookAbbr}/${ref.chapter}${ref.verse ? `?v=${ref.verse}` : ""}`}>{text}</Link> : <span key={text}>{text}</span>; })}</div></details>}\n          <footer className='],
]);
console.log('Visual workspace and reader toolbar integration complete.');
