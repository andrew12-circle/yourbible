import { useCallback, useEffect, useState } from "react";
import { fetchStorageUsage } from "@/lib/storage/storageUsage";
import type { StorageUsageSummary } from "@/lib/storage/storageMeter";

export function useStorageUsage(enabled = true) {
  const [usage, setUsage] = useState<StorageUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setUsage(await fetchStorageUsage());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { usage, loading, error, reload };
}
