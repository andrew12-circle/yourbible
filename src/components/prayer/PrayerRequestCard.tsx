import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import PrayerRequestStatusBadge from "@/components/prayer/PrayerRequestStatusBadge";
import { PRAYER_CATEGORY_LABELS } from "@/lib/prayer/categories";
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
      className={cn(
        "group flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 transition hover:border-foreground/25 hover:shadow-md active:scale-[0.99]",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <PrayerRequestStatusBadge status={request.status} />
          <span className="text-[11px] text-muted-foreground">
            {PRAYER_CATEGORY_LABELS[request.category]}
          </span>
        </div>
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{request.title}</h3>
        {request.prayer_text ? (
          <p className="line-clamp-2 text-sm text-muted-foreground leading-snug">{request.prayer_text}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Requested {formatDisplayDate(request.requested_at)}
          {wait ? ` · Waited ${wait}` : ""}
        </p>
      </div>
      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground" />
    </Link>
  );
}
