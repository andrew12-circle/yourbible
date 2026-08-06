import { Link } from "react-router-dom";
import { PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import PrayerBibleCardFrame from "@/components/prayer/PrayerBibleCardFrame";
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
      <PrayerBibleCardFrame>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-amber-100/80 text-amber-800 shadow-[0_2px_8px_hsl(38_58%_52%_/_0.18)] dark:bg-amber-950/40 dark:text-amber-200">
            <PartyPopper className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gold-deep">
              Praise report
            </p>
            <h3 className="mt-1 font-scripture text-xl font-semibold leading-tight text-foreground">
              {entry.title?.trim() || "Answered prayer"}
            </h3>
            {linkedRequest ? (
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Requested {formatDisplayDate(linkedRequest.requested_at)}
                {linkedRequest.answered_at
                  ? ` · Answered ${formatDisplayDate(linkedRequest.answered_at)}`
                  : ""}
                {wait ? ` · Waited ${wait}` : ""}
              </p>
            ) : (
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {new Date(entry.entry_at_ts).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            {excerpt ? (
              <p className="prayer-bible-card__text mt-2 line-clamp-3">{excerpt}</p>
            ) : null}
          </div>
        </div>
      </PrayerBibleCardFrame>
    </Link>
  );
}
