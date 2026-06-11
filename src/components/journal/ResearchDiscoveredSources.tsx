import { ExternalLink, Film, BookOpen, FileText, GraduationCap } from "lucide-react";
import {
  discoveredSourceKindLabel,
  formatViewCount,
  groupDiscoveredSources,
  type DiscoveredSourceKind,
  type DiscoveredSource,
} from "@/lib/framework/claimResearchPack";
import { cn } from "@/lib/utils";

const KIND_ORDER: DiscoveredSourceKind[] = ["youtube", "article", "book", "study"];

const KIND_ICONS: Record<DiscoveredSourceKind, typeof Film> = {
  youtube: Film,
  article: FileText,
  book: BookOpen,
  study: GraduationCap,
};

type Props = {
  sources: DiscoveredSource[];
  className?: string;
};

export default function ResearchDiscoveredSources({ sources, className }: Props) {
  const grouped = groupDiscoveredSources(sources);
  const total = sources.filter((s) => s.url?.startsWith("http")).length;

  if (total === 0) {
    return (
      <p className={cn("text-[10px] leading-snug text-muted-foreground", className)}>
        No live sources were gathered. Turn on web search and refresh research to discover YouTube talks, articles, and books.
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {KIND_ORDER.map((kind) => {
        const items = grouped[kind];
        if (!items?.length) return null;
        const Icon = KIND_ICONS[kind];
        return (
          <div key={kind}>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon className="h-3 w-3 shrink-0" aria-hidden />
              {discoveredSourceKindLabel(kind)}
              <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                ({items.length})
              </span>
            </h4>
            <ul className="space-y-1.5">
              {items.map((s) => (
                <li
                  key={s.url}
                  className="rounded-md border border-border/50 bg-background/80 px-2.5 py-2 text-[11px] leading-snug"
                >
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-start gap-1 font-medium text-primary underline-offset-2 hover:underline"
                  >
                    <span className="min-w-0 break-words">{s.title}</span>
                    <ExternalLink
                      className="mt-0.5 h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100"
                      aria-hidden
                    />
                  </a>
                  {s.kind === "youtube" && s.view_count != null ? (
                    <p className="mt-0.5 text-[9px] font-medium text-muted-foreground/80">
                      {formatViewCount(s.view_count)} views
                    </p>
                  ) : null}
                  {s.snippet ? (
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground line-clamp-3">
                      {s.snippet}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
