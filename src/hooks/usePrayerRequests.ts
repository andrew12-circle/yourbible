import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createPrayerRequest,
  deletePrayerRequest,
  listPrayerRequests,
  updatePrayerRequest,
} from "@/lib/prayer/api";
import type {
  CreatePrayerRequestInput,
  PrayerCategory,
  PrayerRequestRow,
  PrayerRequestStatus,
  UpdatePrayerRequestInput,
} from "@/lib/prayer/types";

export function usePrayerRequests(
  userId: string | undefined,
  filter?: { status?: PrayerRequestStatus | "all"; category?: PrayerCategory | "all" },
) {
  const [rows, setRows] = useState<PrayerRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await listPrayerRequests(userId, filter);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [userId, filter?.status, filter?.category]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = async (input: CreatePrayerRequestInput) => {
    if (!userId) return null;
    const row = await createPrayerRequest(userId, input);
    if (row) setRows((prev) => [row, ...prev]);
    return row;
  };

  const update = async (id: string, patch: UpdatePrayerRequestInput) => {
    if (!userId) return null;
    const row = await updatePrayerRequest(userId, id, patch);
    if (row) setRows((prev) => prev.map((r) => (r.id === id ? row : r)));
    return row;
  };

  const remove = async (id: string) => {
    if (!userId) return false;
    await deletePrayerRequest(userId, id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    return true;
  };

  return { rows, loading, reload, create, update, remove };
}
