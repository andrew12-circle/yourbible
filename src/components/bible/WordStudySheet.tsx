import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchBible, type BibleSearchHit } from "@/lib/bible/api";
import { findBookByAbbr } from "@/data/books";
import { fetchWlcVerseText } from "@/lib/bible/wlcVerse";
import { fetchSblgntVerse, type SblgntWord } from "@/lib/bible/sblgntVerse";
import { InterlinearWords } from "@/components/bible/InterlinearWords";
import {
  extractStrongsIdsFromText,
  lookupStrongs,
  type StrongsEntry,
} from "@/lib/bible/strongsDictionary";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

import type { WordStudyContext } from "@/lib/bible/wordStudyContext";

export type { WordStudyContext };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bibleId: string;
  context: WordStudyContext | null;
};

function cleanWord(raw: string): string {
  return raw.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function WordStudySheet({ open, onOpenChange, bibleId, context }: Props) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [concordance, setConcordance] = useState<BibleSearchHit[]>([]);
  const [concordanceLoading, setConcordanceLoading] = useState(false);
  const [hebrew, setHebrew] = useState<string | null>(null);
  const [hebrewLoading, setHebrewLoading] = useState(false);
  const [greekWords, setGreekWords] = useState<SblgntWord[]>([]);
  const [greekText, setGreekText] = useState<string | null>(null);
  const [greekLoading, setGreekLoading] = useState(false);
  const [strongsInput, setStrongsInput] = useState("");
  const [strongsEntry, setStrongsEntry] = useState<StrongsEntry | null>(null);
  const [strongsLoading, setStrongsLoading] = useState(false);
  const [strongsError, setStrongsError] = useState<string | null>(null);

  const word = context ? cleanWord(context.word) : "";
  const book = context ? findBookByAbbr(context.bookAbbr) : undefined;
  const primaryVerse = context?.verses[0] ?? 1;
  const isOt = book?.testament === "OT";
  const isNt = book?.testament === "NT";

  const footnoteStrongs = useMemo(() => {
    if (!context) return [];
    return [...new Set(context.footnotes.flatMap(extractStrongsIdsFromText))];
  }, [context]);

  useEffect(() => {
    if (!open || !context || !word || word.length < 2 || !bibleId) {
      setConcordance([]);
      return;
    }
    if (!online) return;
    const controller = new AbortController();
    setConcordanceLoading(true);
    searchBible(bibleId, word, 30, controller.signal)
      .then(setConcordance)
      .catch(() => setConcordance([]))
      .finally(() => {
        if (!controller.signal.aborted) setConcordanceLoading(false);
      });
    return () => controller.abort();
  }, [open, context, word, bibleId, online]);

  useEffect(() => {
    if (!open || !context || !isOt) {
      setHebrew(null);
      return;
    }
    const controller = new AbortController();
    setHebrewLoading(true);
    fetchWlcVerseText(context.bookAbbr, context.chapter, primaryVerse, controller.signal)
      .then(setHebrew)
      .catch(() => setHebrew(null))
      .finally(() => {
        if (!controller.signal.aborted) setHebrewLoading(false);
      });
    return () => controller.abort();
  }, [open, context, isOt, primaryVerse]);

  useEffect(() => {
    if (!open || !context || !isNt) {
      setGreekWords([]);
      setGreekText(null);
      return;
    }
    const controller = new AbortController();
    setGreekLoading(true);
    fetchSblgntVerse(context.bookAbbr, context.chapter, primaryVerse, controller.signal)
      .then((row) => {
        setGreekText(row?.text ?? null);
        setGreekWords(row?.words ?? []);
      })
      .catch(() => {
        setGreekText(null);
        setGreekWords([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setGreekLoading(false);
      });
    return () => controller.abort();
  }, [open, context, isNt, primaryVerse]);

  useEffect(() => {
    if (!open) {
      setStrongsInput("");
      setStrongsEntry(null);
      setStrongsError(null);
    }
  }, [open]);

  const lookupStrongsNumber = async (raw: string) => {
    setStrongsLoading(true);
    setStrongsError(null);
    try {
      const entry = await lookupStrongs(raw, book?.testament);
      if (!entry) {
        setStrongsEntry(null);
        setStrongsError("No entry found for that Strong's number.");
      } else {
        setStrongsEntry(entry);
      }
    } catch (err) {
      setStrongsEntry(null);
      setStrongsError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setStrongsLoading(false);
    }
  };

  const jumpToHit = (hit: BibleSearchHit) => {
    const b = findBookByAbbr(hit.book);
    onOpenChange(false);
    navigate(`/read/${b?.abbr ?? hit.book}/${hit.chapter}?v=${hit.verse}`);
  };

  if (!context) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[min(85vh,640px)] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-left font-scripture">
            Word study: <span className="text-primary">{word || context.word}</span>
          </SheetTitle>
          <p className="text-sm text-muted-foreground text-left">{context.reference}</p>
        </SheetHeader>

        <div className="mt-4 space-y-5 text-sm">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Concordance
            </h3>
            {!online ? (
              <p className="text-muted-foreground">Connect to search for other occurrences.</p>
            ) : concordanceLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Searching…
              </div>
            ) : concordance.length === 0 ? (
              <p className="text-muted-foreground">No other occurrences found for “{word}”.</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {concordance.map((hit, i) => (
                  <li key={`${hit.reference}-${i}`}>
                    <button
                      type="button"
                      onClick={() => jumpToHit(hit)}
                      className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-muted/60"
                    >
                      <span className="text-xs font-semibold text-primary">{hit.reference}</span>
                      <p className="line-clamp-1 text-foreground/90">{hit.text}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isOt ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Hebrew (WLC)
              </h3>
              {hebrewLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
              ) : hebrew ? (
                <p className="font-hebrew text-lg leading-relaxed text-right" dir="rtl">
                  {hebrew}
                </p>
              ) : (
                <p className="text-muted-foreground">Hebrew text unavailable for this verse.</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Westminster Leningrad Codex — verse-level, not word-aligned to English.
              </p>
            </section>
          ) : (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Greek (SBLGNT)
              </h3>
              {greekLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
              ) : greekText ? (
                <>
                  <p className="font-greek text-lg leading-relaxed mb-3">{greekText}</p>
                  {greekWords.length > 0 ? (
                    <>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Tap a word for its Strong&apos;s entry (MorphGNT + Open Scriptures).
                      </p>
                      <InterlinearWords
                        tokens={greekWords}
                        onStrongsClick={(id) => {
                          setStrongsInput(id);
                          void lookupStrongsNumber(id);
                        }}
                      />
                    </>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Greek text unavailable. Run <code className="text-xs">npm run generate:sblgnt</code>{" "}
                  to bundle MorphGNT SBLGNT.
                </p>
              )}
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Strong&apos;s dictionary
            </h3>
            <div className="flex gap-2">
              <Input
                value={strongsInput}
                onChange={(e) => setStrongsInput(e.target.value)}
                placeholder={isOt ? "H430 or 430" : "G26 or 26"}
                className="h-9"
                aria-label="Strong's number"
              />
              <Button
                type="button"
                size="sm"
                disabled={!strongsInput.trim() || strongsLoading}
                onClick={() => void lookupStrongsNumber(strongsInput)}
              >
                {strongsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {footnoteStrongs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {footnoteStrongs.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="text-xs px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80"
                    onClick={() => {
                      setStrongsInput(id);
                      void lookupStrongsNumber(id);
                    }}
                  >
                    {id}
                  </button>
                ))}
              </div>
            ) : null}
            {strongsError ? <p className="text-destructive text-xs mt-2">{strongsError}</p> : null}
            {strongsEntry ? (
              <div className="mt-3 rounded-lg border p-3 bg-muted/30 space-y-1">
                <p className="font-semibold">
                  {strongsEntry.id}
                  {strongsEntry.lemma ? (
                    <span className="font-hebrew ml-2" dir="rtl">
                      {strongsEntry.lemma}
                    </span>
                  ) : null}
                </p>
                {strongsEntry.transliteration ? (
                  <p className="text-muted-foreground italic">{strongsEntry.transliteration}</p>
                ) : null}
                <p>{strongsEntry.definition}</p>
                {strongsEntry.kjvUsage ? (
                  <p className="text-xs text-muted-foreground">KJV usage: {strongsEntry.kjvUsage}</p>
                ) : null}
              </div>
            ) : null}
            <p className="text-[11px] text-muted-foreground mt-2">
              Strong&apos;s Exhaustive Concordance (public domain) via Open Scriptures.
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
