import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { journalNewEntryEditHref } from "@/lib/journal/entryNavigation";
import { Mic, PenLine, Video } from "lucide-react";
import { MORNING_FORMULA_CONVERSATION_RETURN } from "@/lib/bible/readerNavigation";
import { MorningFormulaInlineJournal } from "@/components/living-hope/MorningFormulaInlineJournal";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  entryId: string | null;
  preview: { title: string | null; excerpt: string } | null;
  busy: boolean;
  error: string | null;
};

export function MorningConversationPanel({ entryId, preview, busy, error }: Props) {
  return (
    <div className="space-y-4">
      <div className={cn(lh.cardFlat, "p-4 space-y-3")}>
        <p className={cn(lh.bodySm)}>
          This is today&apos;s entry — the same one your thanks already went into. Get what&apos;s on your heart
          out honestly, however it comes:
        </p>
        {entryId && <Button asChild className="w-full sm:w-auto gap-2"><Link to={`${journalNewEntryEditHref(entryId)}?capture=video&returnTo=${encodeURIComponent(MORNING_FORMULA_CONVERSATION_RETURN)}&kind=morning_conversation`}><Video className="h-5 w-5" />Record my video journal</Link></Button>}
        <p className={lh.footnote}>Your video and the entire morning stay in this one entry. The recorder opens ready for you to press Record.</p>
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

        <details><summary className="cursor-pointer text-sm font-medium py-2">Prefer to write? Open the text journal</summary>
        <MorningFormulaInlineJournal
          entryId={entryId}
          busy={busy}
          error={error}
          section="heart"
          returnTo={MORNING_FORMULA_CONVERSATION_RETURN}
        />
        </details>

        {preview?.excerpt ? (
          <p className={cn(lh.footnote, "italic leading-snug border-t border-border/40 pt-3")}>
            &ldquo;{preview.excerpt}
            {preview.excerpt.length >= 180 ? "…" : ""}&rdquo;
          </p>
        ) : null}
      </div>

      <section className={cn(lh.cardAmber, "p-4")}>
        <h2 className={cn(lh.heading, "text-[15px] mb-2")}>Then listen</h2>
        <p className={cn(lh.bodyQuote, "text-[16px] mb-3")}>
          God, what do you want me to know today?
        </p>
        <p className={cn(lh.bodySm, "mb-0")}>
          Ask it slowly. Then be quiet and listen — not to fill the silence, but to receive. Capture anything
          you hear in the <strong className="font-medium text-foreground">Listening</strong> section of today&apos;s
          entry when you&apos;re ready.
        </p>
      </section>
    </div>
  );
}
