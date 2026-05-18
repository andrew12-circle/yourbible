import ReactMarkdown from "react-markdown";
import type { InlineChatTurn } from "@/lib/journal/inlineJournalChat";

type Props = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  turns: InlineChatTurn[];
  aiBusy: boolean;
  seedUserText?: string;
  dictInterim?: string;
  className?: string;
};

export default function InlineJournalChatTranscript({
  scrollRef,
  bottomRef,
  turns,
  aiBusy,
  seedUserText,
  dictInterim,
  className,
}: Props) {
  return (
    <div ref={scrollRef} className={className ?? "flex-1 overflow-y-auto pt-1 space-y-3"}>
      {seedUserText?.trim() && turns.length === 0 && (
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm">
          {seedUserText}
        </div>
      )}
      {turns.map((t) => (
        <div
          key={t.id}
          className={
            t.role === "user"
              ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-3 py-2 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap"
              : "max-w-full px-1 py-1 text-[13px] prose prose-sm dark:prose-invert prose-p:my-2 prose-p:text-[13px] prose-p:leading-relaxed"
          }
        >
          {t.role === "assistant" ? <ReactMarkdown>{t.content}</ReactMarkdown> : <div>{t.content}</div>}
        </div>
      ))}
      {aiBusy && (
        <div className="px-1 py-1 inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
          <span
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
            style={{ animationDelay: "120ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
            style={{ animationDelay: "240ms" }}
          />
        </div>
      )}
      {dictInterim?.trim() ? (
        <p className="text-xs italic leading-relaxed text-muted-foreground/80 px-1" aria-live="polite">
          {dictInterim}
        </p>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
