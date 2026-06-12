import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  parseChatJournalEntry,
  type ChatJournalMessage,
} from "@/lib/journal/chatJournalEntry";
import { journalChatUserBubbleClass } from "@/lib/journal/journalChatUi";
import ChatAssistantMarkdown from "@/components/journal/ChatAssistantMarkdown";

type Props = {
  body: string;
  summary?: string | null;
  className?: string;
  /** When set, the summary paragraph is clickable (e.g. to resume journaling). */
  onSummaryClick?: () => void;
  /** Hide the summary block — useful when editing the summary in a textarea above. */
  hideSummary?: boolean;
};

export default function ChatJournalView({
  body,
  summary,
  className,
  onSummaryClick,
  hideSummary = false,
}: Props) {
  const parsed = useMemo(
    () => parseChatJournalEntry(body, summary),
    [body, summary],
  );

  if (parsed.kind === "plain") {
    return (
      <p className={cn("text-[16px] leading-relaxed whitespace-pre-wrap", className)}>
        {body.trim() || (
          <span className="italic text-muted-foreground">No body</span>
        )}
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {!hideSummary && parsed.summary ? (
        onSummaryClick ? (
          <button
            type="button"
            onClick={onSummaryClick}
            className="block w-full cursor-text rounded-lg text-left text-[16px] leading-relaxed whitespace-pre-wrap text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 -mx-2 px-2 py-1"
          >
            {parsed.summary}
          </button>
        ) : (
          <p className="text-[16px] leading-relaxed whitespace-pre-wrap text-foreground">
            {parsed.summary}
          </p>
        )
      ) : null}

      {!hideSummary && onSummaryClick && !parsed.summary ? (
        <button
          type="button"
          onClick={onSummaryClick}
          className="block w-full rounded-lg border border-dashed border-border/70 px-3 py-4 text-left text-[15px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          Click to continue writing…
        </button>
      ) : null}

      {parsed.messages.length > 0 ? (
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            View conversation
            <span className="text-muted-foreground font-normal">
              ({parsed.messages.length}{" "}
              {parsed.messages.length === 1 ? "message" : "messages"})
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <SavedChatTranscript messages={parsed.messages} />
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

function SavedChatTranscript({ messages }: { messages: ChatJournalMessage[] }) {
  return (
    <div className="flex flex-col gap-6" aria-label="Conversation transcript">
      {messages.map((t, i) => (
        <div
          key={`${t.role}-${i}`}
          className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}
        >
          {t.role === "user" ? (
            <div className={journalChatUserBubbleClass}>
              {t.content}
            </div>
          ) : (
            <div className="max-w-none px-1 py-1">
              <ChatAssistantMarkdown content={t.content} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
