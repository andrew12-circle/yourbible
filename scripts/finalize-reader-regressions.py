"""Exact-context source edits for the existing repair branch; no network access."""
from pathlib import Path
changes = {}
def patch(name, old, new, count=1):
    text = changes.get(name, Path(name).read_text())
    if text.count(old) != count:
        raise RuntimeError(f'{name}: expected {count} matches for {old[:100]!r}')
    changes[name] = text.replace(old, new)
patch('src/lib/bible/parsePassageHtml.test.ts', '''  it("repairs glued pronoun I from older cached parsers", () => {
    expect(
      sanitizePubVerseText(
        "IDIDN't know him, but ICAME baptizing with water so that he might be revealed to Israel.",
      ),
    ).toBe(
      "I didn't know him, but I came baptizing with water so that he might be revealed to Israel.",
    );
  });''', '''  it("does not guess word boundaries from uppercase text without source markup", () => {
    const original = "IDIDN't know him, but ICAME baptizing with water so that he might be revealed to Israel.";
    expect(sanitizePubVerseText(original)).toBe(original);
    expect(sanitizePubVerseText("ISRAEL ISAIAH IMAGE")).toBe("ISRAEL ISAIAH IMAGE");
  });''')
patch('src/lib/bible/passageCache.test.ts', '"abc|Jhn|3|v11"', '"abc|Jhn|3|v11|reader-integrity-v1|unsupported"')
patch('src/components/bible/ScripturePlate.reliability.test.tsx', '<PageFlip pageKey=', '<PageFlip direction="forward" pageKey=', 3)
patch('src/pages/reader/renderReaderPageScripture.tsx', '  if (useStudyPageStack) {', '''  // An illustration occupies its own page, never a Scripture column or footnote stack.
  if (!scrollMode && streamSlice?.isPlatePage && pageContentReady) return scriptureContent;

  if (useStudyPageStack) {''')
patch('src/hooks/useReaderPosition.ts', '  const anchor = ready ? anchorAtPage(page) : snapshot.intent === intent ? snapshot.anchor : null;', '''  const anchor = useMemo(() => {
    if (!ready) return snapshot.intent === intent ? snapshot.anchor : null;
    // Keep the exact logical anchor through repeated reflows. Replacing it with
    // each new page's first verse makes font-down/font-up cycles drift backwards.
    if (snapshot.intent === intent && snapshot.anchor) {
      const index = units.findIndex((unit) => unit.id === snapshot.anchor!.id);
      const start = splits[page] ?? 0;
      const end = splits[Math.min(page + (spread ? 2 : 1), splits.length - 1)] ?? units.length;
      if (index >= start && index < end) return snapshot.anchor;
    }
    return anchorAtPage(page);
  }, [ready, snapshot, intent, units, splits, page, spread, anchorAtPage]);''')
for name, text in changes.items():
    Path(name).write_text(text)
print('\n'.join(changes))
Path(__file__).unlink()
