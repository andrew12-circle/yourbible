import ReactMarkdown from "react-markdown";
import type { InlineChatTurn } from "@/lib/journal/inlineJournalChat";
import { cn } from "@/lib/utils";

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
    <div
      ref={scrollRef}
      className={cn("flex flex-1 flex-col gap-3 overflow-y-auto pt-1 pb-1", className)}
    >
      {seedUserText?.trim() && turns.length === 0 && (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-[13px] leading-relaxed text-primary-foreground shadow-sm whitespace-pre-wrap">
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
