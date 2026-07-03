import { useMemo } from "react";
import { computePrayerStats } from "@/lib/prayer/stats";
import type { PrayerRequestRow } from "@/lib/prayer/types";

export function usePrayerStats(requests: PrayerRequestRow[]) {
  return useMemo(() => computePrayerStats(requests), [requests]);
}
