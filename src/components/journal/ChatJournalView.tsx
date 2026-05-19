import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
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

type Props = {
  body: string;
  summary?: string | null;
  className?: string;
};

export default function ChatJournalView({ body, summary, className }: Props) {
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
      {parsed.summary ? (
        <p className="text-[16px] leading-relaxed whitespace-pre-wrap text-foreground">
          {parsed.summary}
        </p>
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
    <div className="flex flex-col gap-3" aria-label="Conversation transcript">
      {messages.map((t, i) => (
        <div
          key={`${t.role}-${i}`}
          className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}
        >
          {t.role === "user" ? (
            <div className="max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-[13px] leading-relaxed text-primary-foreground shadow-sm whitespace-pre-wrap">
              {t.content}
            </div>
          ) : (
            <div className="max-w-[92%] rounded-2xl border border-border/70 bg-card px-3 py-2 text-[13px] shadow-sm">
              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-p:text-[13px] prose-p:leading-relaxed">
                <ReactMarkdown>{t.content}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
