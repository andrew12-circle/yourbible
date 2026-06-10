import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import type { InlineChatCitation, InlineChatTurn } from "@/lib/journal/inlineJournalChat";
import { CHAT_ASSISTANT_PROSE_COMPACT, prepareChatMarkdownForDisplay } from "@/lib/journal/prepareChatMarkdownForDisplay";
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

function citationHref(c: InlineChatCitation): string | null {
  if (c.id) {
    if (c.source_type === "belief") return `/framework/beliefs/${c.id}`;
    if (c.source_type === "journal") return `/journal/${c.id}`;
    if (c.source_type === "artifact") return `/framework/artifacts/${c.id}`;
  }
  if (c.source_type === "identity") return "/settings";
  if (c.source_type === "influence") return "/framework/influences";
  return null;
}

function CitationChips({ citations }: { citations: InlineChatCitation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {citations.map((c, i) => {
        const href = citationHref(c);
        const chip = (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight",
              href
                ? "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-border bg-muted/50 text-muted-foreground",
            )}
          >
            {c.label}
          </span>
        );
        return href ? (
          <Link key={`${c.source_type}-${c.id ?? "x"}-${i}`} to={href} className="no-underline">
            {chip}
          </Link>
        ) : (
          <span key={`${c.source_type}-${c.id ?? "x"}-${i}`}>{chip}</span>
        );
      })}
    </div>
  );
}

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
              <div className={CHAT_ASSISTANT_PROSE_COMPACT}>
                <ReactMarkdown>{prepareChatMarkdownForDisplay(t.content)}</ReactMarkdown>
              </div>
              {t.citations?.length ? <CitationChips citations={t.citations} /> : null}
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
