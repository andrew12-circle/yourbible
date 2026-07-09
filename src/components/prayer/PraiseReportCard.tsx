import { Link } from "react-router-dom";
import { PartyPopper } from "lucide-react";
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
    <Link to={`/journal/${entry.id}`} className={cn("group block transition active:scale-[0.995]", className)}>
      <div className="prayer-scroll prayer-scroll--card">
        <div className="prayer-scroll-roll prayer-scroll-roll-top" aria-hidden />
        <div className="prayer-scroll-body prayer-scroll-parchment">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-amber-100/80 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg leading-snug text-leather">
                {entry.title?.trim() || "Praise report"}
              </h3>
              {linkedRequest ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Requested {formatDisplayDate(linkedRequest.requested_at)}
                  {linkedRequest.answered_at
                    ? ` · Answered ${formatDisplayDate(linkedRequest.answered_at)}`
                    : ""}
                  {wait ? ` · Waited ${wait}` : ""}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(entry.entry_at_ts).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
              {excerpt ? (
                <p className="prayer-scroll-text mt-2 line-clamp-3 text-[15px]">{excerpt}</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="prayer-scroll-roll prayer-scroll-roll-bottom" aria-hidden />
      </div>
    </Link>
  );
}
