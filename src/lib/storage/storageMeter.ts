/** Display scale for the storage meter (0 → this cap). */
export const STORAGE_METER_CAP_GB = 20;

export const STORAGE_METER_CAP_BYTES = STORAGE_METER_CAP_GB * 1024 * 1024 * 1024;

export type StorageUsageSummary = {
  journal_bytes: number;
  artifacts_bytes: number;
  total_bytes: number;
  breakdown?: {
    journal_photos_bytes?: number;
    journal_videos_bytes?: number;
    voice_memos_bytes?: number;
    artifact_uploads_bytes?: number;
  };
};

export type StorageMeterLevel = "low" | "moderate" | "high" | "critical";

export function formatStorageBytes(bytes: number, digits = 1): string {
  const n = Math.max(0, Number(bytes) || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(digits)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(digits)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(digits)} GB`;
}

export function storageMeterPercent(bytes: number, capBytes = STORAGE_METER_CAP_BYTES): number {
  if (capBytes <= 0) return 0;
  return Math.min(100, (Math.max(0, bytes) / capBytes) * 100);
}

export function storageMeterLevel(bytes: number, capBytes = STORAGE_METER_CAP_BYTES): StorageMeterLevel {
  const pct = storageMeterPercent(bytes, capBytes);
  if (pct >= 90) return "critical";
  if (pct >= 75) return "high";
  if (pct >= 50) return "moderate";
  return "low";
}

const LEVEL_BAR_CLASS: Record<StorageMeterLevel, string> = {
  low: "bg-emerald-500",
  moderate: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const LEVEL_TEXT_CLASS: Record<StorageMeterLevel, string> = {
  low: "text-emerald-600 dark:text-emerald-400",
  moderate: "text-amber-600 dark:text-amber-400",
  high: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
};

export function storageMeterBarClass(bytes: number, capBytes = STORAGE_METER_CAP_BYTES): string {
  return LEVEL_BAR_CLASS[storageMeterLevel(bytes, capBytes)];
}

export function storageMeterTextClass(bytes: number, capBytes = STORAGE_METER_CAP_BYTES): string {
  return LEVEL_TEXT_CLASS[storageMeterLevel(bytes, capBytes)];
}

export function storageMeterHint(bytes: number, capBytes = STORAGE_METER_CAP_BYTES): string | null {
  const level = storageMeterLevel(bytes, capBytes);
  if (level === "critical") {
    return "You're near the 20 GB meter cap. Upgrade Supabase storage or connect Google Drive backup.";
  }
  if (level === "high") {
    return "Storage is getting full. Consider Google Drive backup or exporting to a hard drive.";
  }
  if (level === "moderate") {
    return "About halfway on the 20 GB scale — you're on track, but plan ahead for long-term archiving.";
  }
  return null;
}
