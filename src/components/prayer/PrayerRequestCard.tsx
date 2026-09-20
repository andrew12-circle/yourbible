import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import PrayerRequestStatusBadge from "@/components/prayer/PrayerRequestStatusBadge";
import { PRAYER_CATEGORY_LABELS } from "@/lib/prayer/categories";
import { formatLedgerAmount } from "@/lib/prayer/money";
import { formatDisplayDate, computeWaitDays, humanizeWaitDays } from "@/lib/prayer/stats";
import type { PrayerRequestRow } from "@/lib/prayer/types";

export default function PrayerRequestCard({
  request,
  className,
}: {
  request: PrayerRequestRow;
  className?: string;
}) {
  const wait =
    request.answered_at != null ? humanizeWaitDays(computeWaitDays(request) ?? 0) : null;
  const preview = request.prayer_text?.trim() || request.purpose?.trim();

  return (
    <Link
      to={`/prayer/requests/${request.id}`}
      className={cn(
        "group block h-full min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm transition-colors sm:p-5",
        "hover:border-primary/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <PrayerRequestStatusBadge status={request.status} />
            <span className="text-xs text-muted-foreground">
              {PRAYER_CATEGORY_LABELS[request.category]}
            </span>
          </div>
          <h3 className="break-words font-sans text-base font-semibold leading-snug text-foreground">
            {request.title}
          </h3>
          {preview ? (
            <p className="line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">
              {preview}
            </p>
          ) : null}
          {request.amount_requested != null ? (
            <p className="text-sm font-medium tabular-nums text-foreground">
              {formatLedgerAmount(request.amount_requested)}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border/60 pt-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Requested {formatDisplayDate(request.requested_at)}
              {wait ? ` · Waited ${wait}` : ""}
            </p>
            <span className="text-xs font-medium text-primary">View request</span>
          </div>
        </div>
        <ChevronRight
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
