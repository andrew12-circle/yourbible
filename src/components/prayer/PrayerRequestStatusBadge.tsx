import { cn } from "@/lib/utils";
import { PRAYER_STATUS_BADGE_CLASSES, PRAYER_STATUS_LABELS } from "@/lib/prayer/statuses";
import type { PrayerRequestStatus } from "@/lib/prayer/types";

export default function PrayerRequestStatusBadge({
  status,
  className,
}: {
  status: PrayerRequestStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        PRAYER_STATUS_BADGE_CLASSES[status],
        className,
      )}
    >
      {PRAYER_STATUS_LABELS[status]}
    </span>
  );
}
