import { ChevronDown, MessageCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { InlineChatTurn } from "@/lib/journal/inlineJournalChat";
import ChatAssistantMarkdown from "@/components/journal/ChatAssistantMarkdown";
import ChatSourceAttribution from "@/components/journal/ChatSourceAttribution";
import { journalChatUserBubbleClass } from "@/lib/journal/journalChatUi";
import { cn } from "@/lib/utils";

type Props = {
  turns: InlineChatTurn[];
  defaultOpen?: boolean;
  className?: string;
  label?: string;
};

export default function JournalLiveChatCollapsible({
  turns,
  defaultOpen = false,
  className,
  label = "AI conversation",
}: Props) {
  if (!turns.length) return null;

  return (
    <Collapsible defaultOpen={defaultOpen} className={className}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/45">
        <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="shrink-0 text-xs font-normal text-muted-foreground">
          {turns.length} {turns.length === 1 ? "message" : "messages"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="flex flex-col gap-6 rounded-xl border border-border/50 bg-card/40 p-3" aria-label="Conversation transcript">
          {turns.map((t) => (
            <div
              key={t.id}
              className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}
            >
              {t.role === "user" ? (
                <div className={journalChatUserBubbleClass}>{t.content}</div>
              ) : (
                <div className="max-w-none px-1 py-1">
                  <ChatAssistantMarkdown content={t.content} />
                  {t.citations != null ? (
                    <ChatSourceAttribution citations={t.citations} variant="journal" />
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
