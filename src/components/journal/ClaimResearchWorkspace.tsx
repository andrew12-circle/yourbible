import { ClipboardCopy, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { FloatingClaimResearchHandoff } from "@/lib/journal/floatingJournalStore";
import { useClaimResearchWorkspace } from "@/hooks/useClaimResearchWorkspace";
import ClaimResearchHeader from "@/components/journal/ClaimResearchHeader";
import ClaimResearchComposer from "@/components/journal/ClaimResearchComposer";
import ClaimResearchVerdictDock from "@/components/journal/ClaimResearchVerdictDock";
import ResearchPackView from "@/components/journal/ResearchPackView";
import ResearchAssistantBubble from "@/components/journal/ResearchAssistantBubble";
import BeliefUpdateFromClaimDialog from "@/components/framework/BeliefUpdateFromClaimDialog";

type Props = {
  userId: string;
  research: FloatingClaimResearchHandoff;
  className?: string;
};

function BriefSkeleton() {
  return (
    <div className="space-y-2.5 animate-pulse" aria-hidden>
      <div className="h-3 w-4/5 rounded-md bg-muted/60" />
      <div className="h-3 w-full rounded-md bg-muted/50" />
      <div className="h-3 w-11/12 rounded-md bg-muted/40" />
      <div className="h-3 w-2/3 rounded-md bg-muted/30" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border/50 bg-card px-3.5 py-3 shadow-sm">
      <span className="inline-flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </span>
      <span className="text-xs text-muted-foreground">Thinking…</span>
    </div>
  );
}

export default function ClaimResearchWorkspace({ userId, research, className }: Props) {
  const ws = useClaimResearchWorkspace(userId, research);

  const copyPack = async () => {
    if (!ws.packMarkdown) return;
    try {
      await navigator.clipboard.writeText(ws.packMarkdown);
      toast({ title: "Copied to clipboard" });
    } catch (e) {
      toast({ title: "Copy failed", description: String(e), variant: "destructive" });
    }
  };

  const lastResearchedLabel = ws.latestRun?.created_at
    ? new Date(ws.latestRun.created_at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const showBriefContent = Boolean(ws.briefSummary && !ws.briefLoading);
  const showBriefSkeleton = ws.briefLoading && !ws.briefSummary;

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-muted/20 via-background to-background",
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pt-3 sm:px-4">
        <ClaimResearchHeader
          claimText={research.claimPreview}
          artifactId={research.artifactId}
          matchedBeliefId={research.matchedBeliefId}
          lastResearchedLabel={lastResearchedLabel}
          briefLoading={ws.briefLoading}
          reportLoading={ws.reportLoading}
          onOpenReport={() => void ws.openFullReport()}
          onRefreshBrief={() => void ws.refreshBrief()}
        />

        <section className="mt-4" aria-labelledby="research-brief-heading">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="research-brief-heading" className="text-xs font-semibold text-foreground">
              Research brief
            </h2>
            {ws.briefLoading && ws.briefSummary ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Refreshing" />
            ) : null}
          </div>
          {showBriefSkeleton ? <BriefSkeleton /> : null}
          {showBriefContent ? (
            <ResearchAssistantBubble variant="brief">{ws.briefSummary!}</ResearchAssistantBubble>
          ) : null}
          {!showBriefSkeleton && !showBriefContent ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              A multi-source summary will appear here — Scripture, history, and three voices.
            </p>
          ) : null}
          {ws.webStatusLabel && showBriefContent ? (
            <p className="mt-2 text-[10px] leading-snug text-muted-foreground/90">{ws.webStatusLabel}</p>
          ) : null}
        </section>

        <section className="mt-6 pb-4" aria-labelledby="research-chat-heading">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h2 id="research-chat-heading" className="text-xs font-semibold text-foreground">
              Conversation
            </h2>
          </div>

          {ws.showLoading ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
              <p className="text-sm text-muted-foreground">Starting your research chat…</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ws.chatBootstrapping && ws.messages.length === 0 ? <TypingIndicator /> : null}
              {ws.loadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : null}
              {!ws.loadingMessages &&
                ws.messages.length === 0 &&
                !ws.chatBootstrapping &&
                !ws.sending && (
                  <p className="rounded-xl border border-dashed border-border/70 bg-card/50 px-4 py-6 text-center text-sm leading-relaxed text-muted-foreground">
                    Ask anything about this claim — how it fits Scripture, your beliefs, or church history.
                  </p>
                )}
              {ws.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  {m.role === "user" ? (
                    <div className="max-w-[min(100%,20rem)] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-md">
                      {m.content}
                    </div>
                  ) : (
                    <ResearchAssistantBubble>{m.content}</ResearchAssistantBubble>
                  )}
                </div>
              ))}
              {ws.sending ? <TypingIndicator /> : null}
            </div>
          )}
        </section>
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
        onReflect={ws.reflectToJournal}
        onOpenReport={() => void ws.openFullReport()}
      />

      <ClaimResearchVerdictDock
        busy={ws.verdictBusy}
        onVerdict={(v) => void ws.applyVerdict(v)}
        onUpdateBelief={
          research.matchedBeliefId ? () => ws.setBeliefUpdateOpen(true) : undefined
        }
      />

      {research.matchedBeliefId ? (
        <BeliefUpdateFromClaimDialog
          open={ws.beliefUpdateOpen}
          onOpenChange={ws.setBeliefUpdateOpen}
          beliefId={research.matchedBeliefId}
          userId={userId}
          claimText={research.claimPreview}
        />
      ) : null}

      <Sheet open={ws.packOpen} onOpenChange={ws.setPackOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-4 py-4 text-left">
            <SheetTitle className="font-display text-lg font-normal">Research report</SheetTitle>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Bible alignment, historical context, and independent voices.
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
