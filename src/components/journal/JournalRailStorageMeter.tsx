import { Link } from "react-router-dom";
import { HardDrive, Loader2 } from "lucide-react";
import { useStorageUsage } from "@/hooks/useStorageUsage";
import {
  formatStorageBytes,
  STORAGE_METER_CAP_GB,
  storageMeterBarClass,
  storageMeterPercent,
  storageMeterTextClass,
} from "@/lib/storage/storageMeter";
import { cn } from "@/lib/utils";

/** Compact storage meter pinned to the bottom of the journal sidebar rail. */
export function JournalRailStorageMeter({ className }: { className?: string }) {
  const { usage, loading, error } = useStorageUsage(true);

  const bytes = usage?.total_bytes ?? 0;
  const pct = storageMeterPercent(bytes);
  const barClass = storageMeterBarClass(bytes);
  const textClass = storageMeterTextClass(bytes);

  return (
    <Link
      to="/settings?section=storage"
      className={cn(
        "block rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50",
        className,
      )}
      title="Open storage settings"
    >
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <HardDrive className="h-3.5 w-3.5" aria-hidden />
        Storage
      </div>
      {loading && !usage ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : error ? (
        <p className="text-xs text-muted-foreground">Storage unavailable</p>
      ) : (
        <>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className={cn("text-xs font-semibold tabular-nums", textClass)}>
              {formatStorageBytes(bytes)}
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              / {STORAGE_METER_CAP_GB} GB
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Storage used: ${formatStorageBytes(bytes)} of ${STORAGE_METER_CAP_GB} gigabytes`}
          >
            <div
              className={cn("h-full rounded-full transition-all duration-500", barClass)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}
    </Link>
  );
}
