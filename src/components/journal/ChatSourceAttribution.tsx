import { Link } from "react-router-dom";
import { BookOpen, ShieldCheck } from "lucide-react";
import type { JSONValue } from "@/integrations/supabase/types";
import { OpenAiMark } from "@/components/myai/OpenAiMark";
import { formatCitationLabel } from "@/lib/myai/citationLabel";
import {
  parseChatCitations,
  resolveSourceAttributionDisplay,
  type ChatCitation,
} from "@/lib/myai/parseChatCitations";
import { cn } from "@/lib/utils";

function citationHref(c: ChatCitation): string | null {
  if (c.id) {
    if (c.source_type === "belief") return `/framework/beliefs/${c.id}`;
    if (c.source_type === "journal") return `/journal/${c.id}`;
    if (c.source_type === "artifact") return `/framework/artifacts/${c.id}`;
  }
  if (c.source_type === "identity") return "/settings";
  if (c.source_type === "influence") return "/framework/influences";
  return null;
}

function SourceChip({
  citation,
  chipClassName,
  linkedClassName,
  mutedClassName,
}: {
  citation: ChatCitation;
  chipClassName: string;
  linkedClassName: string;
  mutedClassName: string;
}) {
  const href = citationHref(citation);
  const chip = (
    <span
      className={cn(
        chipClassName,
        href ? linkedClassName : mutedClassName,
      )}
    >
      {formatCitationLabel(citation)}
    </span>
  );
  return href ? (
    <Link to={href} className="no-underline">
      {chip}
    </Link>
  ) : (
    chip
  );
}

type Props = {
  citations: JSONValue | ChatCitation[] | unknown;
  /** My AI uses slightly larger chips; journal chat uses compact styling. */
  variant?: "myai" | "journal";
  className?: string;
};

export default function ChatSourceAttribution({ citations, variant = "myai", className }: Props) {
  const parsed = parseChatCitations(citations);
  const display = resolveSourceAttributionDisplay(parsed);
  if (!display) return null;

  const chipClassName =
    variant === "journal"
      ? "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-normal"
      : "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-normal";

  const linkedClassName =
    variant === "journal"
      ? "border-border/60 bg-background text-foreground/80 hover:bg-muted/50"
      : "border-border/60 bg-background text-foreground/80 hover:bg-muted/50";

  const mutedClassName =
    variant === "journal"
      ? "border-border/50 bg-muted/30 text-muted-foreground"
      : "border-border/50 bg-muted/30 text-muted-foreground";

  const internal = display.internalSources;

  return (
    <div className={cn("mt-4 border-t border-border/30 pt-3", className)}>
      {display.kind === "framework_only" && (
        <div className="flex items-start gap-2.5 rounded-lg bg-blue-500/[0.06] px-3 py-2.5 ring-1 ring-blue-500/15">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-medium text-foreground">Your framework only</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              This answer is grounded in your beliefs, journals, and saved framework — not web search or outside AI knowledge.
            </p>
          </div>
        </div>
      )}

      {display.kind === "framework_primary" && (
        <div className="flex items-start gap-2.5 rounded-lg bg-blue-500/[0.06] px-3 py-2.5 ring-1 ring-blue-500/15">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-medium text-foreground">From your records</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Pulled from your framework this turn. Outside knowledge is enabled in settings but wasn&apos;t needed here.
            </p>
          </div>
        </div>
      )}

      {display.kind === "openai_supplement" && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
          <OpenAiMark size="sm" className="mt-0.5" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-medium text-foreground">Includes outside knowledge (OpenAI)</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              OpenAI supplemented this answer where your saved framework was silent or thin — not live web search.
            </p>
          </div>
        </div>
      )}

      {display.kind === "web_openai" && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
          <OpenAiMark size="sm" className="mt-0.5" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-medium text-foreground">Web search via OpenAI</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              OpenAI searched the web for this answer, blended with your framework context when relevant.
            </p>
          </div>
        </div>
      )}

      {internal.length > 0 ? (
        <div className={cn(display.kind !== "framework_only" || internal.length > 0 ? "mt-3" : "")}>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
            From your records
          </p>
          <div className="flex flex-wrap gap-1.5">
            {internal.map((c, i) => (
              <SourceChip
                key={`${c.source_type}-${c.id ?? "x"}-${i}`}
                citation={c}
                chipClassName={chipClassName}
                linkedClassName={linkedClassName}
                mutedClassName={mutedClassName}
              />
            ))}
          </div>
        </div>
      ) : display.kind === "framework_only" ? null : (
        <p className="mt-2 text-[11px] text-muted-foreground">No specific journal or belief rows were cited.</p>
      )}
    </div>
  );
}
