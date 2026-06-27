import { cn } from "@/lib/utils";
import {
  formatStorageBytes,
  STORAGE_METER_CAP_BYTES,
  STORAGE_METER_CAP_GB,
  storageMeterBarClass,
  storageMeterPercent,
  storageMeterTextClass,
} from "@/lib/storage/storageMeter";

type Props = {
  label: string;
  bytes: number;
  capBytes?: number;
  detail?: string;
  className?: string;
};

export function StorageMeterBar({
  label,
  bytes,
  capBytes = STORAGE_METER_CAP_BYTES,
  detail,
  className,
}: Props) {
  const pct = storageMeterPercent(bytes, capBytes);
  const barClass = storageMeterBarClass(bytes, capBytes);
  const textClass = storageMeterTextClass(bytes, capBytes);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("tabular-nums text-xs font-semibold", textClass)}>
          {formatStorageBytes(bytes)} / {STORAGE_METER_CAP_GB} GB
        </span>
      </div>
      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${formatStorageBytes(bytes)} of ${STORAGE_METER_CAP_GB} gigabytes`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
