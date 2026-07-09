import { Link } from "react-router-dom";
import { ChevronRight, ScrollText } from "lucide-react";
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

  return (
    <Link
      to={`/prayer/requests/${request.id}`}
      className={cn("group block transition active:scale-[0.995]", className)}
    >
      <div className="prayer-scroll prayer-scroll--card">
        <div className="prayer-scroll-roll prayer-scroll-roll-top" aria-hidden />
        <div className="prayer-scroll-body prayer-scroll-parchment">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <PrayerRequestStatusBadge status={request.status} />
                <span className="text-[11px] text-muted-foreground">
                  {PRAYER_CATEGORY_LABELS[request.category]}
                </span>
              </div>
              <h3 className="font-display text-lg leading-snug text-leather">{request.title}</h3>
              {request.prayer_text ? (
                <p className="prayer-scroll-text line-clamp-3 text-[15px] italic text-foreground/90">
                  {request.prayer_text}
                </p>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-gold-deep">
                  <ScrollText className="h-3.5 w-3.5" aria-hidden />
                  Open scroll
                </div>
              )}
              {request.amount_requested != null ? (
                <p className="text-sm font-medium tabular-nums text-foreground/80">
                  {formatLedgerAmount(request.amount_requested)}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Requested {formatDisplayDate(request.requested_at)}
                {wait ? ` · Waited ${wait}` : ""}
              </p>
            </div>
            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground/60 group-hover:text-leather" />
          </div>
        </div>
        <div className="prayer-scroll-roll prayer-scroll-roll-bottom" aria-hidden />
      </div>
    </Link>
  );
}
