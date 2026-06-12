import type { InlineChatTurn } from "@/lib/journal/inlineJournalChat";
import ChatAssistantMarkdown from "@/components/journal/ChatAssistantMarkdown";
import ChatSourceAttribution from "@/components/journal/ChatSourceAttribution";
import ChatOpeningBlessing from "@/components/journal/ChatOpeningBlessing";
import { journalChatUserBubbleClass } from "@/lib/journal/journalChatUi";
import { cn } from "@/lib/utils";

type Props = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  turns: InlineChatTurn[];
  aiBusy: boolean;
  streamingAssistantId?: string | null;
  seedUserText?: string;
  dictInterim?: string;
  className?: string;
};

export default function InlineJournalChatTranscript({
  scrollRef,
  bottomRef,
  turns,
  aiBusy,
  streamingAssistantId = null,
  seedUserText,
  dictInterim,
  className,
}: Props) {
  return (
    <div
      ref={scrollRef}
      className={cn("flex flex-1 flex-col gap-6 overflow-y-auto pt-1 pb-1", className)}
    >
      <ChatOpeningBlessing variant="transcript" />
      {seedUserText?.trim() && turns.length === 0 && (
        <div className="flex justify-end">
          <div className={journalChatUserBubbleClass}>
            {seedUserText}
          </div>
        </div>
      )}
      {turns.map((t) => (
        <div
          key={t.id}
          className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}
        >
          {t.role === "user" ? (
            <div className={journalChatUserBubbleClass}>
              {t.content}
            </div>
          ) : (
            <div className="max-w-none px-1 py-1">
              {aiBusy && t.id === streamingAssistantId ? (
                <ChatAssistantMarkdown content={t.content} streaming />
              ) : (
                <ChatAssistantMarkdown content={t.content} />
              )}
              {!(aiBusy && t.id === streamingAssistantId) && t.citations != null ? (
                <ChatSourceAttribution citations={t.citations} variant="journal" />
              ) : null}
            </div>
          )}
        </div>
      ))}
      {aiBusy && (
        <div className="flex justify-start">
          <div className="inline-flex items-center gap-1.5 px-1 py-1 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
            <span
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: "120ms" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: "240ms" }}
            />
          </div>
        </div>
      )}
      {dictInterim?.trim() ? (
        <p className="px-1 text-xs italic leading-relaxed text-muted-foreground/80" aria-live="polite">
          {dictInterim}
        </p>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
