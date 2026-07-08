import { BookOpen, Video } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title?: string | null;
  summary?: string | null;
  body?: string | null;
  hasVideo?: boolean;
  className?: string;
};

export default function JournalReflectionContextCard({
  title,
  summary,
  body,
  hasVideo = false,
  className,
}: Props) {
  const excerpt = body?.trim().replace(/\s+/g, " ").slice(0, 280) ?? "";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-foreground">
            {title?.trim() || "Your journal entry"}
          </p>
          {hasVideo ? (
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Video className="h-3.5 w-3.5" aria-hidden />
              Includes video journal
            </p>
          ) : null}
          {summary?.trim() ? (
            <p className="text-muted-foreground leading-relaxed">{summary.trim()}</p>
          ) : excerpt ? (
            <p className="text-muted-foreground leading-relaxed">{excerpt}…</p>
          ) : (
            <p className="text-muted-foreground leading-relaxed">
              Your entry is saved — My AI can walk through it with you here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
