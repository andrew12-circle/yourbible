import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ChevronDown, MessageCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { InlineChatCitation, InlineChatTurn } from "@/lib/journal/inlineJournalChat";
import { CHAT_ASSISTANT_PROSE_COMPACT, prepareChatMarkdownForDisplay } from "@/lib/journal/prepareChatMarkdownForDisplay";
import {
  journalChatCitationChipBaseClass,
  journalChatCitationChipLinkedClass,
  journalChatCitationChipMutedClass,
  journalChatUserBubbleClass,
} from "@/lib/journal/journalChatUi";
import { cn } from "@/lib/utils";

type Props = {
  turns: InlineChatTurn[];
  defaultOpen?: boolean;
  className?: string;
  label?: string;
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
              journalChatCitationChipBaseClass,
              href ? journalChatCitationChipLinkedClass : journalChatCitationChipMutedClass,
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
        <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/40 p-3" aria-label="Conversation transcript">
          {turns.map((t) => (
            <div
              key={t.id}
              className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}
            >
              {t.role === "user" ? (
                <div className={journalChatUserBubbleClass}>{t.content}</div>
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
