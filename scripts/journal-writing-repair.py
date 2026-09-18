from pathlib import Path
p = Path('src/components/journal/EntryEditorPane.tsx')
s = p.read_text()
def replace(old, new):
    global s
    assert s.count(old) == 1, f'Expected exactly one match: {old[:120]}'
    s = s.replace(old, new)
replace('useEffect, useLayoutEffect, useMemo', 'useEffect, useMemo')
replace('import { useJournalEditorCaretScroll } from "@/hooks/useJournalEditorCaretScroll";',
        'import { useJournalDeskWritingScroll } from "@/hooks/useJournalDeskWritingScroll";')
replace('  const bottomDockRef = useRef<HTMLDivElement | null>(null);\n', '')
replace('''  const textareaAutosizeEnabled =
    !inlineChatMode && !(showSavedChatView && !bodyEditing);''', '''  const textareaAutosizeEnabled =
    !!entry && !loadingEntry && !inlineChatMode && !(showSavedChatView && !bodyEditing);''')
replace('''  const { scrollToCaretEnd } = useJournalEditorCaretScroll({
    scrollRef: paneScrollRef,
    bottomDockRef: plainWriteLayout ? bottomDockRef : undefined,
    kbInset: 0,
    enabled: !!entry && !inlineChatMode && (bodyFocused || (showSavedChatView && bodyEditing)),
    resetKey: entryId,
    topInsetPx: 16,
  });''', '''  const { scrollToCaretEnd } = useJournalDeskWritingScroll({
    scrollRef: paneScrollRef,
    enabled: textareaAutosizeEnabled,
    value: textareaAutosizeValue,
    resetKey: entryId,
  });''')
replace('''  useLayoutEffect(() => {
    if (!plainWriteLayout || bodyFocused) return;
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [plainWriteLayout, bodyFocused, entry?.id, entry?.body]);

''', '')
replace('  const sketchAfterBody = sketchPhotos.length > 0;\n', '')
replace('''          "journal-pane-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain",
          plainWriteLayout && "flex flex-col",''', '''          "journal-pane-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none]",
          plainWriteLayout && "flex flex-col",''')
replace('''          plainWriteLayout ? "flex-1" : "min-h-full",
        )}
      >''', '''          plainWriteLayout ? "min-h-full shrink-0" : "min-h-full",
        )}
        style={plainWriteLayout ? { paddingBottom: "var(--journal-writing-room, 160px)" } : undefined}
      >''')
replace('''                  <div
                    className={cn(
                      "relative",
                      plainWriteLayout && !bodyFocused && !sketchAfterBody && "flex min-h-0 flex-1 flex-col",
                    )}
                  >''', '''                  <div className="relative shrink-0">''')
replace('''                      wrapperClassName={
                        plainWriteLayout && !bodyFocused && !sketchAfterBody
                          ? "flex min-h-0 flex-1 flex-col"
                          : undefined
                      }
                      className={cn(
                        journalPlainWriteFieldClass,
                        plainWriteLayout &&
                          (bodyFocused
                            ? "min-h-0"
                            : sketchAfterBody
                              ? "min-h-[8rem]"
                              : "max-h-full min-h-0 flex-1 overflow-y-auto"),
                      )}''', '''                      wrapperClassName="shrink-0"
                      className={cn(journalPlainWriteFieldClass, "max-h-none")}''')
replace('''        <JournalEntryMapDock
          ref={bottomDockRef}''', '''        <JournalEntryMapDock''')
p.write_text(s)
