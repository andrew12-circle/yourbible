import { ClipboardCopy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { FloatingClaimResearchHandoff } from "@/lib/journal/floatingJournalStore";
import { useClaimResearchWorkspace } from "@/hooks/useClaimResearchWorkspace";
import ClaimResearchHeader from "@/components/journal/ClaimResearchHeader";
import ClaimResearchComposer from "@/components/journal/ClaimResearchComposer";
import ResearchPackView from "@/components/journal/ResearchPackView";
import ResearchAssistantBubble from "@/components/journal/ResearchAssistantBubble";
import BeliefUpdateFromClaimDialog from "@/components/framework/BeliefUpdateFromClaimDialog";
import {
  claimResearchAmbient,
  claimResearchColumn,
  geminiUserTurn,
} from "@/lib/journal/claimResearchTheme";
import ResearchGeminiAvatar from "@/components/journal/ResearchGeminiAvatar";

type Props = {
  userId: string;
  research: FloatingClaimResearchHandoff;
  className?: string;
};

function BriefSkeleton() {
  return (
    <div className="space-y-3 animate-pulse py-2" aria-hidden>
      <div className="h-4 w-32 rounded-full bg-muted/50" />
      <div className="h-3 w-full max-w-lg rounded-md bg-muted/40" />
      <div className="h-3 w-11/12 max-w-md rounded-md bg-muted/35" />
      <div className="h-3 w-4/5 max-w-sm rounded-md bg-muted/30" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-1.5 text-[10px] text-muted-foreground">
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

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Copied" });
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
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background",
        claimResearchAmbient,
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-6">
        <div className={claimResearchColumn}>
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

          <section className="mt-8" aria-label="Research brief">
            {ws.briefLoading && ws.briefSummary ? (
              <Loader2
                className="mb-2 h-3.5 w-3.5 animate-spin text-muted-foreground"
                aria-label="Refreshing brief"
              />
            ) : null}
            {showBriefSkeleton ? <BriefSkeleton /> : null}
            {showBriefContent ? (
              <ResearchAssistantBubble variant="brief">{ws.briefSummary!}</ResearchAssistantBubble>
            ) : null}
            {!showBriefSkeleton && !showBriefContent ? (
              <p className="text-[10px] leading-snug text-muted-foreground">
                A multi-source brief will appear here — live sources, Scripture, opposing views, and a research conclusion.
              </p>
            ) : null}
            {ws.webStatusLabel && showBriefContent ? (
              <p className="mt-2 text-[10px] text-muted-foreground/80">{ws.webStatusLabel}</p>
            ) : null}
          </section>

          <section className="mt-10 space-y-8" aria-label="Conversation">
            {ws.showLoading ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <ResearchGeminiAvatar size="md" />
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Loading research brief…</p>
              </div>
            ) : (
              <>
                {ws.chatBootstrapping && ws.messages.length === 0 ? <TypingIndicator /> : null}
                {ws.loadingMessages ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : null}
                {!ws.loadingMessages &&
                  ws.messages.length === 0 &&
                  !ws.chatBootstrapping &&
                  !ws.sending && (
                    <p className="py-6 text-center text-[10px] leading-snug text-muted-foreground">
                      Ask anything about this claim — Scripture, your beliefs, or church history.
                    </p>
                  )}
                {ws.messages.map((m, idx) => {
                  const isLastAssistant =
                    m.role === "assistant" &&
                    idx === ws.messages.length - 1 &&
                    !ws.sending;
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        m.role === "user" ? "flex justify-end" : "w-full",
                      )}
                    >
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
        </div>
      </div>

      <ClaimResearchComposer
        input={ws.input}
        onInputChange={ws.setInput}
        onSend={() => void ws.send()}
        onStop={ws.stop}
        onRetry={() => void ws.retryLast()}
        sending={ws.sending}
        disabled={ws.showLoading || ws.sessionEnsuring}
        canRetry={ws.messages.some((m) => m.role === "assistant")}
        packUseWeb={ws.packUseWeb}
        onPackUseWebChange={ws.setPackUseWeb}
        includeGeneral={ws.includeGeneral}
        onIncludeGeneralChange={ws.setIncludeGeneral}
        chatId={ws.chatId}
        onReflect={ws.reflectToJournal}
        onOpenReport={() => void ws.openFullReport()}
        verdictBusy={ws.verdictBusy}
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
            <SheetTitle className="text-lg font-normal">Research report</SheetTitle>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Sources gathered, Scripture, opposing views, and research conclusion.
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
