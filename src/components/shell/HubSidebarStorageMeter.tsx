import { Link } from "react-router-dom";
import { HardDrive, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useStorageUsage } from "@/hooks/useStorageUsage";
import {
  formatStorageBytes,
  STORAGE_METER_CAP_BYTES,
  STORAGE_METER_CAP_GB,
  storageMeterBarClass,
  storageMeterPercent,
  storageMeterTextClass,
} from "@/lib/storage/storageMeter";

/** Compact iCloud-style storage gauge for the hub sidebar footer. */
export function HubSidebarStorageMeter() {
  const { user } = useAuth();
  const { usage, loading, error } = useStorageUsage(Boolean(user?.id));

  if (!user) return null;

  const bytes = usage?.total_bytes ?? 0;
  const pct = storageMeterPercent(bytes);
  const barClass = storageMeterBarClass(bytes);
  const textClass = storageMeterTextClass(bytes);
  const usedLabel = usage ? formatStorageBytes(bytes, 1) : "—";

  return (
    <Link
      to="/settings?section=storage"
      className={cn(
        "mb-2 block rounded-lg border border-border/40 bg-muted/20 px-2.5 py-2",
        "transition-colors hover:border-border/60 hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      aria-label={
        usage
          ? `Cloud storage ${usedLabel} of ${STORAGE_METER_CAP_GB} gigabytes used. Open storage settings.`
          : "Open storage settings"
      }
    >
      <div className="flex items-center gap-2 mb-1.5">
        <HardDrive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Storage
        </span>
        {loading && !usage ? (
          <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </div>

      <div
        className="relative mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/80"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-hidden={!usage}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", usage ? barClass : "bg-muted-foreground/30")}
          style={{ width: usage ? `${pct}%` : "0%" }}
        />
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("text-xs font-semibold tabular-nums", usage ? textClass : "text-muted-foreground")}>
          {usedLabel}
          <span className="font-normal text-muted-foreground"> of {STORAGE_METER_CAP_GB} GB</span>
        </span>
      </div>

      {usage ? (
        <p className="mt-1 truncate text-[10px] text-muted-foreground">
          Journal {formatStorageBytes(usage.journal_bytes, 1)} · Artifacts {formatStorageBytes(usage.artifacts_bytes, 1)}
        </p>
      ) : error ? (
        <p className="mt-1 text-[10px] text-muted-foreground">Tap to view storage</p>
      ) : null}
    </Link>
  );
}
