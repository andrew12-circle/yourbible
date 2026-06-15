import { Link } from "react-router-dom";
import { BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import type { JSONValue } from "@/integrations/supabase/types";
import { CitationSourceIcon } from "@/components/journal/CitationSourceIcon";
import { OpenAiMark } from "@/components/myai/OpenAiMark";
import { useChatCitationArtifactUrls } from "@/hooks/useChatCitationArtifactUrls";
import { formatCitationLabel } from "@/lib/myai/citationLabel";
import { resolveCitationLink } from "@/lib/myai/citationLink";
import {
  citationChipTone,
  resolveCitationSourceKind,
} from "@/lib/myai/citationSourceStyle";
import {
  parseChatCitations,
  resolveSourceAttributionDisplay,
  type ChatCitation,
} from "@/lib/myai/parseChatCitations";
import { cn } from "@/lib/utils";

function SourceChip({
  citation,
  artifactUrlById,
}: {
  citation: ChatCitation;
  artifactUrlById: Record<string, string>;
}) {
  const link = resolveCitationLink(citation, artifactUrlById);
  const kind = resolveCitationSourceKind(citation, artifactUrlById);
  const tone = citationChipTone(kind, Boolean(link));
  const label = formatCitationLabel(citation);
  const showExternal = link?.external && kind !== "youtube";

  const chip = (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-normal transition-colors",
        tone.chip,
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
          tone.iconRing,
        )}
      >
        <CitationSourceIcon kind={kind} iconClassName={tone.iconColor} />
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {showExternal ? (
        <ExternalLink className="ml-0.5 inline h-3 w-3 shrink-0 opacity-55" aria-hidden />
      ) : null}
    </span>
  );

  if (!link) return chip;

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="no-underline"
        title={kind === "youtube" ? "Open on YouTube" : "Open source"}
      >
        {chip}
      </a>
    );
  }

  return (
    <Link to={link.href} className="no-underline">
      {chip}
    </Link>
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
  const artifactUrlById = useChatCitationArtifactUrls(parsed.internalSources);
  if (!display) return null;

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
          <div className={cn("flex flex-wrap gap-1.5", variant === "journal" ? "" : "")}>
            {internal.map((c, i) => (
              <SourceChip
                key={`${c.source_type}-${c.id ?? "x"}-${i}`}
                citation={c}
                artifactUrlById={artifactUrlById}
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
