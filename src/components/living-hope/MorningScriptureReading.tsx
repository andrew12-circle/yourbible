import { useMemo, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
import { useAuth } from "@/contexts/AuthContext";
import { usePassage } from "@/hooks/usePassage";
import { useBibles, pickDefaultBibleId } from "@/hooks/useBibles";
import type { MorningScripture } from "@/hooks/useMorningScripture";
import { getStoredBibleId } from "@/lib/bible/storedBibleId";
import { passageToCanonicalChapter } from "@/lib/bible/canonical/passageToCanonical";
import { buildDocumentBlocks } from "@/lib/bible/documentModel";
import { styledTextClass, verseParts } from "@/lib/bible/verseParts";
import { ScriptureDocumentBlocks } from "@/components/scripture/ScriptureDocumentBlocks";
import { morningReadingChapters, type MorningChapter } from "@/lib/livingHope/morningReading";
import { MorningScriptureActions } from "./MorningScriptureActions";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

function VerifiedChapter({ target }: { target: MorningChapter }) {
  const bibles = useBibles();
  const bibleId = pickDefaultBibleId(bibles.data ?? [], getStoredBibleId());
  const edition = bibles.data?.find((b) => b.id === bibleId);
  const passage = usePassage(bibleId, target.book, target.chapter, !!bibleId, edition?.abbreviation);
  const blocks = useMemo(() => {
    if (!passage.data) return [];
    const canonical = passageToCanonicalChapter(passage.data, target.book, target.chapter, bibleId);
    return buildDocumentBlocks(canonical.verses, canonical.layout, undefined, bibleId);
  }, [passage.data, target.book, target.chapter, bibleId]);
  if (bibles.error || passage.error || (!bibles.isPending && !bibleId)) return <div role="alert" className="space-y-3 py-6 text-sm">
    <p>The verified Bible text could not be loaded. No substitute text is being shown.</p>
    <Button variant="outline" onClick={() => { void bibles.refetch(); void passage.refetch(); }}>Retry Bible text</Button>
  </div>;
  if (!passage.data) return <p role="status" className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading {target.label}…</p>;
  return <article className="morning-scripture space-y-5" aria-label={`${target.label} Bible text`}>
    <header className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-semibold">{target.label}</h3><span className="text-xs text-muted-foreground">{edition?.abbreviation} · Full chapter</span></header>
    <div className="font-serif text-[20px] leading-[1.85] text-foreground [&_.scripture-heading]:mt-7 [&_.scripture-heading]:font-sans [&_.scripture-heading]:text-base [&_.scripture-heading]:font-semibold [&_p]:mb-5">
      <ScriptureDocumentBlocks blocks={blocks} renderVerse={(verse) => <span key={verse.verseId}>
        <sup className="mr-1.5 text-[11px] font-sans text-muted-foreground" aria-label={`Verse ${verse.number}`}>{verse.number}</sup>
        {verseParts(verse).map((part, i) => part.kind === "text" ? <span key={i} className={styledTextClass(part.style)}>{part.text}</span> : null)}{" "}
      </span>} />
    </div>
  </article>;
}

function InlineReading({ scripture }: { scripture: MorningScripture }) {
  const [index, setIndex] = useState(0);
  let chapters: MorningChapter[];
  try { chapters = morningReadingChapters(scripture); }
  catch (error) { return <p role="alert" className="py-5 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Open this passage in the full Bible."}</p>; }
  const target = chapters[index] ?? chapters[0];
  if (!target) return null;
  return <div className="space-y-6">
    {chapters.length > 1 && <label className="block text-sm text-muted-foreground">Today's readings
      <select className="mt-2 block min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground" value={Math.min(index, chapters.length - 1)} onChange={(e) => setIndex(Number(e.target.value))}>
        {chapters.map((item, i) => <option key={`${item.book}:${item.chapter}:${i}`} value={i}>{item.label}</option>)}
      </select>
    </label>}
    <VerifiedChapter key={`${target.book}:${target.chapter}`} target={target} />
  </div>;
}

type Props = { scripture: MorningScripture | null; busy: boolean; error: string | null; onRetry: () => void; reflection: string; onReflectionChange: (text: string) => void };
export function MorningScriptureReading({ scripture, busy, error, onRetry, reflection, onReflectionChange }: Props) {
  const { user } = useAuth();
  const preferenceKey = `yb-morning-reading:${user?.id ?? "guest"}`;
  const [choice, setChoice] = useState<{ key: string; mode: "physical" | "app" } | null>(null);
  let remembered: "physical" | "app" = "physical";
  try { if (localStorage.getItem(preferenceKey) === "app") remembered = "app"; } catch { /* A reading preference is optional. */ }
  const mode = choice?.key === preferenceKey ? choice.mode : remembered;
  const select = (next: "physical" | "app") => {
    setChoice({ key: preferenceKey, mode: next });
    try { localStorage.setItem(preferenceKey, next); } catch { /* Continue without persistence. */ }
  };
  return <section className="space-y-6" aria-label="Scripture reading">
    <div role="group" aria-label="Read Scripture with" className="flex gap-2 rounded-xl bg-muted/50 p-1">
      {(["physical", "app"] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => select(value)} className={cn("min-h-12 flex-1 rounded-lg px-3 text-sm", mode === value ? "bg-background font-semibold shadow-sm" : "text-muted-foreground")}>
        {value === "physical" ? "My physical Bible" : "Read here"}
      </button>)}
    </div>
    {scripture ? <>
      <div><p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{scripture.source === "reading-plan" ? scripture.planTitle : "Today's passage"}</p><h2 className="text-2xl font-semibold">{scripture.reference}</h2></div>
      {mode === "physical" ? <p className={lh.body}>Open your Bible to this passage. Take your time; continue when you are ready.</p> : <InlineReading key={`${user?.id}:${scripture.reference}`} scripture={scripture} />}
      <details className="text-sm text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3">More reading options</summary><MorningScriptureActions readerHref={scripture.readerHref} /></details>
    </> : busy ? <p role="status" className="py-6 text-muted-foreground">Loading today's passage…</p> : <Button variant="outline" onClick={onRetry}><BookOpen className="mr-2 h-4 w-4" />Get today's passage</Button>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <label className="block text-sm font-medium">What stood out? <span className="font-normal text-muted-foreground">Optional</span>
      <MorningVoiceField
        value={reflection}
        onChange={onReflectionChange}
        multiline
        rows={3}
        className="mt-3"
        label="What stood out?"
        placeholder="A verse, a thought, or something to carry into today…"
      />
    </label>
  </section>;
}
