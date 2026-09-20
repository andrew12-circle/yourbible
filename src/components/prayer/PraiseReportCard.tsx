import { Link } from "react-router-dom";
import { ChevronRight, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDisplayDate, computeWaitDays, humanizeWaitDays } from "@/lib/prayer/stats";
import type { PrayerRequestRow } from "@/lib/prayer/types";

type PraiseEntry = {
  id: string;
  title: string | null;
  body: string | null;
  entry_at_ts: string;
};

export default function PraiseReportCard({
  entry,
  linkedRequest,
  className,
}: {
  entry: PraiseEntry;
  linkedRequest?: PrayerRequestRow | null;
  className?: string;
}) {
  const excerpt = (entry.body ?? "").replace(/\*\*/g, "").slice(0, 220);
  const wait =
    linkedRequest?.answered_at != null
      ? humanizeWaitDays(computeWaitDays(linkedRequest) ?? 0)
      : null;

  return (
    <Link
      to={`/journal/${entry.id}`}
      className={cn(
        "group block h-full min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm transition-colors sm:p-5",
        "hover:border-primary/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PartyPopper className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <h3 className="break-words font-sans text-base font-semibold leading-snug text-foreground">
            {entry.title?.trim() || "Praise report"}
          </h3>
          {linkedRequest ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Requested {formatDisplayDate(linkedRequest.requested_at)}
              {linkedRequest.answered_at
                ? ` · Answered ${formatDisplayDate(linkedRequest.answered_at)}`
                : ""}
              {wait ? ` · Waited ${wait}` : ""}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {new Date(entry.entry_at_ts).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          {excerpt ? (
            <p className="line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">
              {excerpt}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs font-medium text-primary">
            <span>Read praise report</span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </div>
        </div>
      </div>
    </Link>
  );
}
