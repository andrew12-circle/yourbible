"""One-shot, exact-context integration on the isolated reader repair branch.
The local execution environment cannot clone this repository. CI applies these
reviewable edits, removes this bootstrap, commits source, and runs verification.
No credentials, Bible content, provider calls, or production data are used.
"""
from pathlib import Path

changes = {}
def read(path):
    return changes.get(path, Path(path).read_text())
def replace(path, old, new, count=1):
    text = read(path)
    actual = text.count(old)
    if actual != count:
        raise RuntimeError(f'{path}: expected {count} exact matches, found {actual}: {old[:90]!r}')
    changes[path] = text.replace(old, new)
def between(path, start, end, new):
    text = read(path)
    if text.count(start) != 1 or text.count(end) != 1:
        raise RuntimeError(f'{path}: ambiguous integration boundary: {start[:70]}')
    left, right = text.index(start), text.index(end)
    if right <= left:
        raise RuntimeError('Reversed integration boundary')
    changes[path] = text[:left] + new + text[right:]

# Plain uppercase words are not evidence of a missing word boundary.
for p in ['src/lib/bible/parsePassageHtml.ts', 'supabase/functions/_shared/parsePassageHtml.ts']:
    text = read(p)
    if 'function repairGluedPronounI' in text:
        start = text.index('function repairGluedPronounI')
        end = text.index('\n}', start) + 2
        changes[p] = text[:start] + text[end:]
        replace(p, 'let t = repairGluedPronounI(text);', 'let t = text;')
        changes[p] = read(p).replace('/** Fix pronoun I merged with a following word from older parsers (IDIDN\'T → I didn\'t). */\n', '')

p = 'src/pages/reader/renderReaderPageScripture.tsx'
replace(p, 'import type { ReactNode } from "react";', 'import type { ReactNode } from "react";\nimport { renderReaderScrollStream } from "./renderReaderScrollStream";')
replace(p, '    inlineChapterPlates,\n', '')
between(p, '    scrollMode && useStreamReader && streamChapters.length > 0 ? (', '    ) : scrollMode && scrollDocumentBlocks.length > 0 ? (', '''    scrollMode && useStreamReader && streamChapters.length > 0 ? (
      renderReaderScrollStream(
        streamChapters.filter((ch) => ch.bookAbbr === book.abbr && ch.chapter === chapter),
        scriptureNodes,
      )
''')

p = 'src/components/bible/BookPaginator.tsx'
replace(p, '  buildStreamSliceMeasureHtml,\n', '  buildStreamSliceMeasureHtml,\n  buildStreamSliceFootnotesMeasureHtml,\n')
replace(p, '''  if (studyLayout === "holman") {
    applyHolmanStudyMeasureHtml(
      node,
      scriptureHtml,
      "",
      "",''', '''  const footnotesHtml = buildStreamSliceFootnotesMeasureHtml(slice);
  if (studyLayout === "holman" || footnotesHtml) {
    applyHolmanStudyMeasureHtml(
      node,
      scriptureHtml,
      "",
      footnotesHtml,''')

p = 'src/lib/bible/readerStreamChapters.ts'
replace(p, '  return chapters.map((ch) => `${ch.bookAbbr}:${ch.chapter}`).join("|");', '  // Notes, headings, poetry and equal-length text edits also change pagination.\n  return JSON.stringify(chapters);')

p = 'src/pages/reader/ReaderPage.tsx'
replace(p, '  startTransition,\n', '')
replace(p, '  areSameSplits,\n', '')
for line in ['  findSpreadPageForVerse,\n', '  interimSpreadDisplaySplits,\n', '  isSpreadDoubleColumnSplitsReady,\n', '  spreadPageForChapterEnd,\n', '  spreadPageForChapterStart,\n', '  spreadPageForChapterStartLeftPane,\n']:
    replace(p, line, '')
replace(p, 'import { isBundledBibleId } from "@/lib/bible/bibleEditions";', 'import { isSupportedReaderBibleId } from "@/lib/bible/bibleEditions";')
replace(p, 'return isBundledBibleId(stored) ? stored : "";', 'return isSupportedReaderBibleId(stored) ? stored! : "";')
replace(p, 'import { useBibleScrollWheel } from "@/hooks/useBibleScrollWheel";', '''import { useBibleScrollWheel } from "@/hooks/useBibleScrollWheel";
import { useReaderPosition } from "@/hooks/useReaderPosition";
import { useReaderChapterNavigation } from "@/hooks/useReaderChapterNavigation";
import { useReaderOverflowRecovery } from "@/hooks/useReaderOverflowRecovery";
import { useFontLoadRevision } from "@/hooks/useFontLoadRevision";
import "./readerReliability.css";''')
replace(p, '  const currentBible = useMemo(', '  const { openChapter, pending: chapterNavigationPending } = useReaderChapterNavigation(bibleId, bibleEditionAbbr);\n  const currentBible = useMemo(')
replace(p, '    isError: passageError,\n', '    isError: passageError,\n    refetch: refetchPassage,\n')
replace(p, '  const readerSpread = useReaderSpread();', '  const readerSpread = useReaderSpread();\n  const readerFontRevision = useFontLoadRevision();')
between(p, '  const [splits, setSplits] = useState<number[]>([0]);', '  const verses = passage?.verses ?? [];', '''  const singlePaginationKey = useMemo(() => [
    bibleId, book.abbr, chapter, layoutFingerprint, fontChoice, fontScale,
    readerFontRevision, pageBox.w, pageBox.h, paginatorFirstPageHeight,
    subsequentPageHeight, spreadColumnLayout, effectiveStudyLayout,
    JSON.stringify(passage), PASSAGE_PARSER_REVISION, READER_PAGINATOR_SPLIT_REVISION,
  ].join("|"), [bibleId, book.abbr, chapter, layoutFingerprint, fontChoice, fontScale,
    readerFontRevision, pageBox.w, pageBox.h, paginatorFirstPageHeight,
    subsequentPageHeight, spreadColumnLayout, effectiveStudyLayout, passage]);
  const { streamSplits: splits, onStreamSplitsChange: handleSplitsChange } =
    useKeyedReaderStreamSplits(singlePaginationKey);
''')
between(p, '  useEffect(() => {\n    setSplits([0]);', '  const streamChapters = useMemo(', '')
between(p, '  const plateFocus = useMemo(', '  const readerStream = useMemo(', '')
replace(p, 'buildReaderStream(streamChapters, { plateFocus })', 'buildReaderStream(streamChapters)')
replace(p, '[streamChapters, plateFocus],', '[streamChapters],')
replace(p, '  const streamPaginationKey = [\n    streamCompositionKey,', '  const streamPaginationKey = [\n    bibleId,\n    readerFontRevision,\n    streamCompositionKey,')
between(p, '  const displayStreamSplits = useMemo(() => {', '  const paginatorFooterHeight = READER_COLUMN_FOOTER_GUARD_PX;', '''  // Only measured boundaries are displayable; never synthesize a half-chapter page.
  const displayStreamSplits = navStreamSplits;
  const spreadPanesRenderable = streamSplitsReady;
''')
between(p, '  const [chapterPage, setChapterPage] = useState(0);', '  const bookmarkVerse = useMemo(() => {', '''  const position = useReaderPosition({
    bibleId, bookAbbr: book.abbr, chapter, verses, stream: readerStream,
    useStream: useStreamReader, splits: useStreamReader ? navStreamSplits : splits,
    ready: verses.length > 0 && (useStreamReader ? streamSplitsReady : splitsReady),
    spread: effectiveSpread,
    layoutKey: `${useStreamReader ? streamPaginationKey : singlePaginationKey}|${(useStreamReader ? navStreamSplits : splits).join(",")}`,
    requestedVerse: Number(searchParams.get("v")) || undefined,
    enterAtEnd: Boolean((location.state as { readerEnterAtEnd?: boolean } | null)?.readerEnterAtEnd),
  });
  const chapterPage = position.page;
  const spreadPageIdx = position.page;
  const pendingVerse = position.anchor?.verse ?? null;
  const [flipDirection, setFlipDirection] = useState<"forward" | "back">("forward");
  useEffect(() => {
    if (!scrollMode) return;
    document.querySelector<HTMLElement>("[data-bible-scroll]")?.scrollTo(0, 0);
  }, [book.abbr, chapter, scrollMode]);
  useBibleScrollWheel(scrollMode, `${book.abbr}-${chapter}`);

''')
replace(p, '''  useEffect(() => {
    const v = parseInt(searchParams.get("v") ?? "", 10);
    if (v > 0) setPendingVerse(v);
  }, [book.abbr, chapter, searchParams]);

''', '')
between(p, '  useEffect(() => {\n    if (pendingVerse == null) return;', '  const pagesPerTurn = effectiveSpread ? 2 : 1;', '')
between(p, '  const goPage = (delta: number) => {', '  // ---- Verse interactions ----', '''  const goPage = (delta: number) => {
    if (!passage || !(useStreamReader ? streamSplitsReady : splitsReady)) return;
    lockPageFlip();
    window.getSelection()?.removeAllRanges();
    tbSelRef.current = null;
    setTbSel(null);
    setFlipDirection(delta > 0 ? "forward" : "back");
    const next = position.page + delta * pagesPerTurn;
    if (next < 0 || next >= totalPagesForNav) {
      // When a spread contains neighbors, cross the edge of the displayed window,
      // not the route chapter whose neighbor has already been read.
      const edge = useStreamReader && readerStream.length
        ? readerStream[delta < 0 ? 0 : readerStream.length - 1]
        : null;
      const ref = delta < 0
        ? getPrevChapterRef(edge?.bookAbbr ?? book.abbr, edge?.chapter ?? chapter)
        : getNextChapterRef(edge?.bookAbbr ?? book.abbr, edge?.chapter ?? chapter);
      if (ref) void openChapter(ref.book.abbr, ref.chapter, delta < 0,
        useBookSpread ? withReaderPageStartNumber(location.state, readerStream, navStreamSplits, book.abbr, chapter, routeChapterStartNumber, ref.book.abbr, ref.chapter) : location.state);
      return;
    }
    position.setPage((previous) => previous + delta * pagesPerTurn);
  };

''')
replace(p, '    const pageOutOfRange = !scrollMode && pageIdx >= totalPagesForNav;', '    const pageOutOfRange = !scrollMode && (useSpreadDoubleColumn && side === "right" ? pageIdx + 1 : pageIdx) >= totalPagesForNav;')
replace(p, '        {showPagePlaceholder ? (', '''        {passageError && !passage ? (
          <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p>This chapter could not be opened. Your saved notes have not changed.</p>
            <button type="button" className="min-h-11 rounded border px-4 py-2" onClick={() => void refetchPassage()}>Retry chapter</button>
          </div>
        ) : showPagePlaceholder ? (''')
replace(p, '    if (verseBook !== book.abbr || verseChapter !== chapter) {\n      navigate(`/read/${verseBook}/${verseChapter}?v=${v.number}`);', '    if (verseBook !== book.abbr || verseChapter !== chapter) {\n      void openChapter(verseBook, verseChapter, false, undefined, v.number);')
replace(p, '      if (prevChapterRef) navigate(`/read/${prevChapterRef.book.abbr}/${prevChapterRef.chapter}`);', '      if (prevChapterRef) void openChapter(prevChapterRef.book.abbr, prevChapterRef.chapter);')
replace(p, '      if (nextChapterRef) navigate(`/read/${nextChapterRef.book.abbr}/${nextChapterRef.chapter}`);', '      if (nextChapterRef) void openChapter(nextChapterRef.book.abbr, nextChapterRef.chapter);')
replace(p, '      data-bible-reader\n', '      data-bible-reader\n      aria-busy={chapterNavigationPending || loadingPassage}\n')
replace(p, '"relative transition-all duration-700 overflow-hidden",', '"relative overflow-hidden",')
between(p, '        onJumpTo={(b, c, v) => {', '        fontScale={fontScale}', '''        onJumpTo={(b, c, v) => {
          if (b.abbr === book.abbr && c === chapter) {
            if (v && v > 0) position.goToVerse(v);
            else position.goToStart();
          } else {
            void openChapter(b.abbr, c, false, undefined, v);
          }
        }}
''')
replace(p, '              direction={flipDirection}', '''              scopeKey={`${user?.id ?? "guest"}:${bibleId}:${book.abbr}:${chapter}`}
              ready={!!passage && (useStreamReader ? streamSplitsReady : splitsReady)}
              direction={flipDirection}''', count=2)
replace(p, '          plateFocus={plateFocus}\n', '')
replace(p, '          headings={paginatorHeadings}\n', '          headings={paginatorHeadings}\n          poetryBlocks={passage?.poetryBlocks}\n          measurementKey={singlePaginationKey}\n')
replace(p, '  if (!loading && !user) return <Navigate to="/auth" replace />;', '''  useReaderOverflowRecovery(`${singlePaginationKey}|${streamPaginationKey}|${activePageIdx}`);

  if (!loading && !user) return <Navigate to="/auth" replace />;''')
# Clear old chapter interactions when the chapter identity changes.
replace(p, '  useEffect(() => {\n    if (!spreadStudyActive || !tbSel?.pageSide) return;', '''  useEffect(() => {
    setActiveVerse(null);
    setSheetOpen(false);
    setNoteOpen(null);
    setTbSel(null);
    window.getSelection()?.removeAllRanges();
  }, [bibleId, book.abbr, chapter, setTbSel]);
  useEffect(() => {
    if (!spreadStudyActive || !tbSel?.pageSide) return;''')

p = 'src/hooks/useReaderChapterNavigation.ts'
replace(p, 'enterAtEnd = false, state?: unknown)', 'enterAtEnd = false, state?: unknown, verse?: number)')
replace(p, 'navigate(`/read/${bookAbbr}/${chapter}`,', 'navigate(`/read/${bookAbbr}/${chapter}${verse && verse > 0 ? `?v=${verse}` : ""}`,')

# Replace the write-enabled bootstrap workflow with a read-only verification workflow.
changes['.github/workflows/bible-reader-reliability.yml'] = '''name: Bible reader reliability
on:
  push:
    branches: [main, 'fix/bible-reader-*']
    paths: ['src/hooks/usePassage*', 'src/hooks/useReader*', 'src/components/bible/**', 'src/pages/reader/**', 'src/lib/bible/**', 'scripts/test-bible-reader*', '.github/workflows/bible-reader-reliability.yml', 'package*.json']
  pull_request:
    paths: ['src/hooks/usePassage*', 'src/hooks/useReader*', 'src/components/bible/**', 'src/pages/reader/**', 'src/lib/bible/**', 'scripts/test-bible-reader*', '.github/workflows/bible-reader-reliability.yml', 'package*.json']
permissions:
  contents: read
concurrency:
  group: bible-reader-${{ github.ref }}
  cancel-in-progress: true
env:
  VITE_SUPABASE_URL: https://example.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY: reader-test-placeholder
  VITE_SUPABASE_ANON_KEY: reader-test-placeholder
jobs:
  regression:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    defaults:
      run:
        shell: bash
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - name: Full repository lint
        id: lint
        continue-on-error: true
        run: npm run lint 2>&1 | tee "$RUNNER_TEMP/reader-lint.log"
      - name: Full repository tests
        id: tests
        continue-on-error: true
        run: npm test 2>&1 | tee "$RUNNER_TEMP/reader-tests.log"
      - name: Production build and distribution safeguards
        id: build
        continue-on-error: true
        run: npm run build 2>&1 | tee "$RUNNER_TEMP/reader-build.log"
      - name: No new TypeScript diagnostics
        id: types
        continue-on-error: true
        run: node scripts/check-journal-type-regressions.mjs 46391e6a3e940133e596bba2850eb34911a4370a 2>&1 | tee "$RUNNER_TEMP/reader-types.log"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: bible-reader-regression
          path: ${{ runner.temp }}/reader-*.log
      - name: Require all verification steps
        if: always()
        run: test '${{ steps.lint.outcome }}' = success && test '${{ steps.tests.outcome }}' = success && test '${{ steps.build.outcome }}' = success && test '${{ steps.types.outcome }}' = success
'''
changes['docs/bible-reader-reliability.md'] = '''# Bible reader reliability repair

The reader validates request identity before display, uses cache-first production
Scripture delivery with a 30-day maximum record age, separates development and
production cache keys, and does not use previous-query placeholder data. API.Bible
full-text distribution safeguards and production bundle stripping are unchanged.

Page positions are Scripture/artwork anchors, not stale visual indexes. Backward
navigation carries an explicit end-of-chapter intent. Only measured page boundaries
are displayed; exact-layout splits can be reused in the current reader session.
Both paginators measure poetry and page footnotes. Extremely tall content has a
scrollable recovery path instead of remaining clipped.

Scroll and paged modes share artwork ordering, including mid-chapter plates.
Nearby images are warmed from local application URLs; failures have a retry control.
A retained page snapshot is inert and cannot cross a user/edition/chapter identity.
The broad uppercase-I text rewrite was removed. Previously corrupted source exports
cannot be reconstructed by this change; a verified source import is still required
for any damaged original bundle.

Verification must include npm run lint, npm test, npm run build, TypeScript baseline
comparison, delayed chapter responses, offline cache misses/hits, artwork failures,
font/column reflow, backward chapter boundaries and large-font overflow. Synthetic
fixtures require no Bible provider credentials or real API.Bible calls. Physical
Safari/iPhone validation is separate from automated component tests.
'''
for name, content in changes.items():
    path = Path(name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
print('\n'.join(sorted(changes)))
Path(__file__).unlink()
