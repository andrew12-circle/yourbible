import { Link } from "react-router-dom";
import { BookOpen, Loader2, Mic, PenLine, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MORNING_FORMULA_CONVERSATION_RETURN } from "@/lib/bible/readerNavigation";
import { journalNewEntryEditHref } from "@/lib/journal/entryNavigation";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  entryId: string | null;
  preview: { title: string | null; excerpt: string } | null;
  busy: boolean;
  error: string | null;
  onEnsureEntry: () => Promise<string | null>;
};

export function MorningConversationPanel({ entryId, preview, busy, error, onEnsureEntry }: Props) {
  const returnTo = encodeURIComponent(MORNING_FORMULA_CONVERSATION_RETURN);
  const journalHref = entryId
    ? `${journalNewEntryEditHref(entryId)}?returnTo=${returnTo}&kind=morning_conversation`
    : null;

  return (
    <div className="space-y-4">
      <div className={cn(lh.cardFlat, "p-4 space-y-3")}>
        <p className={cn(lh.bodySm)}>
          This is your journal — not a box to type in here. Get what&apos;s inside out honestly, however it comes:
        </p>
        <ul className={cn("grid grid-cols-1 sm:grid-cols-3 gap-2 text-[13px]", lh.muted)}>
          <li className="flex items-start gap-2 rounded-xl bg-muted/30 px-3 py-2">
            <PenLine className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" aria-hidden />
            <span>Write or sketch what you&apos;re carrying</span>
          </li>
          <li className="flex items-start gap-2 rounded-xl bg-muted/30 px-3 py-2">
            <Mic className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" aria-hidden />
            <span>Talk it out — use Audio in the journal</span>
          </li>
          <li className="flex items-start gap-2 rounded-xl bg-muted/30 px-3 py-2">
            <Video className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" aria-hidden />
            <span>Add photos or video of how you&apos;re feeling</span>
          </li>
        </ul>

        {busy && !entryId ? (
          <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Opening today&apos;s journal…</span>
          </div>
        ) : journalHref ? (
          <Button className={lh.btnPrimary} asChild>
            <Link to={journalHref}>
              <BookOpen className="w-4 h-4 mr-2" />
              {preview?.excerpt ? "Continue in journal" : "Open today's conversation"}
            </Link>
          </Button>
        ) : (
          <Button className={lh.btnPrimary} disabled={busy} onClick={() => void onEnsureEntry()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Open today's conversation"}
          </Button>
        )}

        {preview?.excerpt ? (
          <p className={cn(lh.footnote, "italic leading-snug border-t border-border/40 pt-3")}>
            &ldquo;{preview.excerpt}
            {preview.excerpt.length >= 180 ? "…" : ""}&rdquo;
          </p>
        ) : null}

        {error ? <p className="text-[12px] text-destructive">{error}</p> : null}
      </div>

      <section className={cn(lh.cardAmber, "p-4")}>
        <h2 className={cn(lh.heading, "text-[15px] mb-2")}>Then listen</h2>
        <p className={cn(lh.bodyQuote, "text-[16px] mb-3")}>
          God, what do you want me to know today?
        </p>
        <p className={cn(lh.bodySm, "mb-0")}>
          Ask it slowly. Then be quiet and listen — not to fill the silence, but to receive. Capture anything
          you hear in the <strong className="font-medium text-foreground">Listening</strong> section of your
          journal when you&apos;re ready.
        </p>
      </section>
    </div>
  );
}
