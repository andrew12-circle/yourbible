import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";

export interface MorningDailyReading {
  id: string;
  reference: string;
  passage: string;
  reason: string;
  prompt: string;
}

export function useMorningDailyReading(userId: string | undefined) {
  const [reading, setReading] = useState<MorningDailyReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    if (!userId) return null;
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase
        .from("daily_readings")
        .select("id, reference, passage, reason, prompt")
        .eq("user_id", userId)
        .eq("date", today)
        .maybeSingle();
      const row = data as MorningDailyReading | null;
      setReading(row);
      return row;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load reading");
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, today]);

  const generate = useCallback(async () => {
    if (!userId) return null;
    setGenerating(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("framework-daily", { body: {} });
      if (fnError) throw fnError;
      if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(String(data.error));
      }
      return await load();
    } catch (e: unknown) {
      const msg = await edgeFunctionErrorMessage("framework-daily", e);
      setError(msg);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [userId, load]);

  const ensureReading = useCallback(async () => {
    const existing = reading ?? (await load());
    if (existing) return existing;
    if (autoStarted.current) return null;
    autoStarted.current = true;
    return generate();
  }, [reading, load, generate]);

  useEffect(() => {
    if (!userId) return;
    void load();
  }, [userId, load]);

  return {
    reading,
    loading,
    generating,
    busy: loading || generating,
    error,
    load,
    generate,
    ensureReading,
  };
}
