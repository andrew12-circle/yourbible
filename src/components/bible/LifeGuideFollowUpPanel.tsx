import { useState } from "react";
import { Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIFE_GUIDE_FOLLOWUP_PROMPTS, type LifeGuideFollowUp } from "@/lib/bible/lifeGuide";
import { cn } from "@/lib/utils";

interface Props {
  followups: LifeGuideFollowUp[];
  busy: boolean;
  onAsk: (question: string) => void;
  className?: string;
}

export function LifeGuideFollowUpPanel({ followups, busy, onAsk, className }: Props) {
  const [input, setInput] = useState("");

  const submit = () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    onAsk(q);
  };

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 space-y-4", className)}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <MessageCircleQuestion className="w-3.5 h-3.5" aria-hidden />
        Dig deeper
      </div>
      <p className="text-sm text-muted-foreground">
        Ask a follow-up — get more literal instruction from the same Scriptures.
      </p>

      {followups.length > 0 && (
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {followups.map((turn, i) => (
            <div key={i} className="space-y-2">
              <div className="text-sm font-medium text-foreground/90">{turn.question}</div>
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap rounded-xl bg-muted/40 px-4 py-3">
                {turn.answer}
              </div>
              {turn.action_hint && (
                <p className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2">
                  Do today: {turn.action_hint}
                </p>
              )}
              {(turn.new_passages ?? []).map((p) => (
                <div key={p.reference} className="text-xs text-muted-foreground border-l-2 border-gold/40 pl-3">
                  <span className="font-medium text-foreground">{p.reference}</span> — {p.do_this}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {LIFE_GUIDE_FOLLOWUP_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onAsk(prompt)}
            disabled={busy}
            className="text-left text-[12px] leading-snug px-2.5 py-1.5 rounded-lg bg-muted/50 hover:bg-muted border border-border/50 transition disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="e.g. What if they won't accept my apology?"
          className="rounded-xl"
          disabled={busy}
        />
        <Button onClick={submit} disabled={busy || !input.trim()} size="icon" className="shrink-0 rounded-xl">
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-label="Thinking" />
          ) : (
            <Send className="w-4 h-4" aria-label="Ask" />
          )}
        </Button>
      </div>
    </section>
  );
}
