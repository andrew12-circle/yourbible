import { ClipboardCopy, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useHardQuestionWorkspace } from "@/hooks/useHardQuestionWorkspace";
import type { HardQuestionRow } from "@/lib/framework/hardQuestions";
import { statusLabel } from "@/lib/framework/hardQuestions";
import { LAYER_META, type FrameworkLayer } from "@/data/framework";
import HardQuestionSourcesPanel from "./HardQuestionSourcesPanel";
import ResearchPackView from "@/components/journal/ResearchPackView";
import ResearchAssistantBubble from "@/components/journal/ResearchAssistantBubble";
import ClaimResearchComposer from "@/components/journal/ClaimResearchComposer";
import BeliefUpdateFromQuestionDialog from "@/components/framework/BeliefUpdateFromQuestionDialog";
import ResearchGeminiAvatar from "@/components/journal/ResearchGeminiAvatar";
import {
  claimResearchAmbient,
  claimResearchColumn,
  geminiUserTurn,
} from "@/lib/journal/claimResearchTheme";

type Props = {
  userId: string;
  question: HardQuestionRow;
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
      <span className="inline-flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </span>
      Thinking…
    </div>
  );
}

export default function HardQuestionWorkspace({ userId, question }: Props) {
  const ws = useHardQuestionWorkspace(userId, question);
  const layer = question.layer as FrameworkLayer | null;
  const suggestedBeliefId = question.linked_belief_ids?.[0] ?? null;

  const copyPack = async () => {
    if (!ws.packMarkdown) return;
    try {
      await navigator.clipboard.writeText(ws.packMarkdown);
      toast({ title: "Copied to clipboard" });
    } catch (e) {
      toast({ title: "Copy failed", description: String(e), variant: "destructive" });
    }
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background", claimResearchAmbient)}>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-6">
        <div className={claimResearchColumn}>
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{statusLabel(ws.status)}</span>
              {layer ? (
                <span style={{ color: LAYER_META[layer].tone }}>{LAYER_META[layer].title}</span>
              ) : null}
              <Link to="/framework/hard-questions" className="ml-auto normal-case tracking-normal text-xs hover:underline">
                All hard questions
              </Link>
            </div>
            <h1 className="font-display text-xl sm:text-2xl leading-snug text-foreground">{question.title}</h1>
            {question.framing ? (
              <p className="text-sm italic text-muted-foreground leading-relaxed">{question.framing}</p>
            ) : null}
            {question.why_it_matters ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground/80">Why it matters: </span>
                {question.why_it_matters}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-full text-xs"
                disabled={ws.briefLoading}
                onClick={() => void ws.refreshBrief()}
              >
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", ws.briefLoading && "animate-spin")} />
                Refresh research
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-full text-xs"
                onClick={() => void ws.openFullReport()}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Full report
              </Button>
            </div>
          </header>

          <div className="mt-6">
            <HardQuestionSourcesPanel
              sources={ws.sources}
              onAdd={ws.addSource}
              onDelete={ws.deleteSource}
            />
          </div>

          <section className="mt-8" aria-label="Research brief">
            {ws.briefLoading && !ws.briefSummary ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Building multi-lens research…
              </div>
            ) : null}
            {ws.briefSummary ? (
              <ResearchAssistantBubble variant="brief">{ws.briefSummary}</ResearchAssistantBubble>
            ) : !ws.briefLoading ? (
              <p className="text-sm text-muted-foreground">
                Research will appear here — scripture, opposing views, and synthesis.
              </p>
            ) : null}
            {ws.webStatusLabel && ws.briefSummary ? (
              <p className="mt-3 text-xs text-muted-foreground/80">{ws.webStatusLabel}</p>
            ) : null}
          </section>

          <section className="mt-8 rounded-lg border border-border bg-card p-4" aria-label="Research notes">
            <h3 className="mb-2 text-sm font-semibold">Your synthesis</h3>
            <PolishedTextarea
              value={ws.notes}
              onChange={(e) => ws.setNotes(e.target.value)}
              rows={4}
              className="text-sm mb-2"
              placeholder="What you're learning between research runs…"
            />
            <Button type="button" size="sm" variant="outline" disabled={ws.savingFields} onClick={() => void ws.saveNotes()}>
              Save notes
            </Button>
          </section>

          <section className="mt-10 space-y-8" aria-label="Conversation">
            {ws.showLoading ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <ResearchGeminiAvatar size="md" />
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Starting your research chat…</p>
              </div>
            ) : (
              <>
                {ws.chatBootstrapping && ws.messages.length === 0 ? <TypingIndicator /> : null}
                {ws.messages.map((m, idx) => {
                  const isLastAssistant =
                    m.role === "assistant" && idx === ws.messages.length - 1 && !ws.sending;
                  return (
                    <div key={m.id} className={cn(m.role === "user" ? "flex justify-end" : "w-full")}>
                      {m.role === "user" ? (
                        <div className={geminiUserTurn}>{m.content}</div>
                      ) : (
                        <ResearchAssistantBubble
                          onCopy={() => void copyMessage(m.content)}
                          onRetry={isLastAssistant ? () => void ws.retryLast() : undefined}
                          retryDisabled={ws.sending || !isLastAssistant}
                        >
                          {m.content}
                        </ResearchAssistantBubble>
                      )}
                    </div>
                  );
                })}
                {ws.sending ? <TypingIndicator /> : null}
              </>
            )}
          </section>

          <section className="mt-10 rounded-lg border border-primary/20 bg-primary/[0.03] p-4" aria-label="Conclusion">
            <h3 className="mb-2 text-sm font-semibold">Working conclusion</h3>
            <PolishedTextarea
              value={ws.conclusion}
              onChange={(e) => ws.setConclusion(e.target.value)}
              rows={5}
              className="text-sm mb-3"
              placeholder="The answer you're ready to stand on — honest, tested, yours."
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={ws.savingFields} onClick={() => void ws.saveConclusion(false)}>
                Save conclusion
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={ws.savingFields || !ws.conclusion.trim()}
                onClick={() => void ws.saveConclusion(true)}
              >
                Mark concluded
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!ws.conclusion.trim()}
                onClick={() => ws.setBeliefUpdateOpen(true)}
              >
                Update framework
              </Button>
            </div>
          </section>
        </div>
      </div>

      <ClaimResearchComposer
        input={ws.input}
        onInputChange={ws.setInput}
        onSend={() => void ws.send()}
        onStop={ws.stop}
        onRetry={() => void ws.retryLast()}
        sending={ws.sending}
        disabled={ws.showLoading}
        canRetry={ws.messages.some((m) => m.role === "assistant")}
        packUseWeb={ws.packUseWeb}
        onPackUseWebChange={ws.setPackUseWeb}
        includeGeneral={ws.includeGeneral}
        onIncludeGeneralChange={ws.setIncludeGeneral}
        chatId={ws.chatId}
        onReflect={() => {}}
        onOpenReport={() => void ws.openFullReport()}
      />

      <BeliefUpdateFromQuestionDialog
        open={ws.beliefUpdateOpen}
        onOpenChange={ws.setBeliefUpdateOpen}
        userId={userId}
        questionTitle={question.title}
        conclusion={ws.conclusion}
        suggestedBeliefId={suggestedBeliefId}
        suggestedLayer={layer}
      />

      <Sheet open={ws.packOpen} onOpenChange={ws.setPackOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-4 py-4 text-left">
            <SheetTitle className="text-lg font-normal">Research report</SheetTitle>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Scripture, history, opposing views, and synthesis.
            </p>
            {ws.webStatusLabel ? (
              <p className="text-[10px] text-muted-foreground">{ws.webStatusLabel}</p>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 h-8 rounded-full text-xs"
              disabled={!ws.packMarkdown}
              onClick={() => void copyPack()}
            >
              <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
              Copy markdown
            </Button>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1 px-4 py-3">
            {ws.reportLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : null}
            {!ws.reportLoading && ws.packData ? (
              <ResearchPackView data={ws.packData} instanceKey={String(ws.packInstance)} />
            ) : null}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
