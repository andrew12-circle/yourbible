import { useState } from "react";
import { Loader2, PenLine, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MORNING_FORMULA_CONVERSATION_RETURN } from "@/lib/bible/readerNavigation";
import { MorningFormulaInlineJournal } from "./MorningFormulaInlineJournal";
import { MorningJournalCapture } from "./MorningJournalCapture";
import { cn } from "@/lib/utils";

type Props = { entryId: string | null; preview: { title: string | null; excerpt: string } | null; busy: boolean; error: string | null };
export function MorningConversationPanel({ entryId, busy, error }: Props) {
  const { user } = useAuth();
  const [writing, setWriting] = useState(false);
  return <div className="space-y-7">
    <div role="group" aria-label="Journal format" className="flex gap-2 rounded-xl bg-muted/50 p-1">
      {[{ write: false, text: "Video journal", Icon: Video }, { write: true, text: "Write instead", Icon: PenLine }].map(({ write, text, Icon }) =>
        <button key={text} type="button" aria-pressed={writing === write} onClick={() => setWriting(write)} className={cn("flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg text-sm", writing === write ? "bg-background font-semibold shadow-sm" : "text-muted-foreground")}><Icon className="h-4 w-4" aria-hidden />{text}</button>)}
    </div>
    {writing ? <MorningFormulaInlineJournal entryId={entryId} busy={busy} error={error} section="heart" returnTo={MORNING_FORMULA_CONVERSATION_RETURN} /> :
      entryId ? <MorningJournalCapture key={`${user?.id}:${entryId}`} entryId={entryId} /> : <p role="status" className="flex items-center gap-2 py-6 text-muted-foreground">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Opening today's journal…</p>}
    {error && !writing && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <section className="border-t border-border/50 pt-6">
      <h2 className="mb-3 text-xl font-semibold">Then listen</h2>
      <p className="mb-4 font-serif text-xl leading-relaxed">God, what do you want me to know today?</p>
      <details><summary className="min-h-11 cursor-pointer py-3 text-sm text-muted-foreground">Capture a reflection</summary>
        <MorningFormulaInlineJournal entryId={entryId} busy={busy} error={error} section="listening" returnTo={MORNING_FORMULA_CONVERSATION_RETURN} />
      </details>
    </section>
  </div>;
}
