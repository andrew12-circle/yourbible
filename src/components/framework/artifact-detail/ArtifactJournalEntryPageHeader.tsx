import type { CSSProperties, ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  hasArtifactJournalSourceContent,
  resolveArtifactJournalThumbnail,
  type ArtifactJournalSourceInput,
} from "@/lib/journal/artifactJournalEntrySource";
import { artifactMobileJournalEdgePad } from "@/lib/framework/artifactLayoutCss";
import { cn } from "@/lib/utils";

export type ArtifactJournalEntryPageHeaderProps = ArtifactJournalSourceInput & {
  title: string;
  onTitleChange: (value: string) => void;
  titlePlaceholder?: string;
  className?: string;
  style?: CSSProperties;
  /** Handwritten pad: compact header on ruled paper. */
  variant?: "sheet" | "compact" | "notebook";
  /** Icons/actions on the same row as the title (mobile typed journal). */
  titleActions?: ReactNode;
};

function channelInitial(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "?";
  const first = trimmed.replace(/^@/, "").charAt(0);
  return first ? first.toUpperCase() : "?";
}

export default function ArtifactJournalEntryPageHeader({
  title,
  onTitleChange,
  titlePlaceholder = "Title",
  className,
  style,
  variant = "sheet",
  channel,
  channelUrl,
  author,
  thumbnailUrl,
  youTubeVideoId,
  providerName,
  titleActions,
}: ArtifactJournalEntryPageHeaderProps) {
  const source: ArtifactJournalSourceInput = {
    entryTitle: title,
    channel,
    channelUrl,
    author,
    thumbnailUrl,
    youTubeVideoId,
    providerName,
  };

  if (!hasArtifactJournalSourceContent(source) && !title.trim() && !titleActions) return null;

  const channelTrim = channel?.trim() || null;
  const primary = channelTrim || providerName?.trim() || null;
  const authorTrim = author?.trim() || null;
  const showAuthor =
    authorTrim &&
    primary &&
    authorTrim.localeCompare(primary, undefined, { sensitivity: "accent" }) !== 0;
  const avatarSrc = resolveArtifactJournalThumbnail(source);
  const fallbackLabel = primary || authorTrim || providerName?.trim() || "Source";
  const compact = variant === "compact";
  const notebook = variant === "notebook";

  return (
    <header
      className={cn(
        "shrink-0 bg-white",
        notebook
          ? cn(
              "border-b border-sky-200/80 pb-2 pt-2.5",
              !titleActions && "pr-16",
              artifactMobileJournalEdgePad,
            )
          : cn("border-b border-border/35", compact ? "px-3 py-2" : "pb-2"),
        className,
      )}
      style={style}
    >
      {hasArtifactJournalSourceContent(source) ? (
        <div
          className={cn(
            "flex min-w-0 items-center gap-2.5",
            notebook ? "mb-1" : compact ? "mb-1.5" : "mb-2",
          )}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              className={cn(
                "shrink-0 rounded-full object-cover ring-1 ring-border/60 bg-muted",
                notebook || compact ? "h-7 w-7" : "h-9 w-9",
              )}
            />
          ) : (
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-1 ring-border/60",
                notebook || compact ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs",
              )}
              aria-hidden
            >
              {channelInitial(fallbackLabel)}
            </span>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            {primary ? (
              channelUrl && channelTrim ? (
                <a
                  href={channelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex max-w-full items-center gap-1 font-medium text-foreground hover:underline",
                    notebook || compact ? "text-xs" : "text-sm",
                  )}
                >
                  <span className="truncate">{primary}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-55" aria-hidden />
                </a>
              ) : (
                <p
                  className={cn(
                    "truncate font-medium text-foreground",
                    notebook || compact ? "text-xs" : "text-sm",
                  )}
                >
                  {primary}
                </p>
              )
            ) : null}
            {showAuthor ? (
              <p
                className={cn(
                  "truncate text-muted-foreground",
                  notebook || compact ? "text-[10px]" : "text-xs",
                )}
              >
                {authorTrim}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 items-center gap-1">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={titlePlaceholder}
          aria-label="Journal entry title"
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent px-0 font-semibold shadow-none placeholder:text-muted-foreground/55 focus-visible:ring-0",
            notebook
              ? "h-auto py-0 text-[15px] leading-snug"
              : compact
                ? "h-auto py-0 text-sm"
                : "h-auto py-0.5 text-base",
          )}
        />
        {titleActions ? <div className="flex shrink-0 items-center gap-0.5">{titleActions}</div> : null}
      </div>
    </header>
  );
}
