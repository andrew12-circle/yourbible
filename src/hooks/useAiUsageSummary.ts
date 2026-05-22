import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AiUsageTotalsRow = {
  provider: string;
  operation: string;
  call_count: number;
  total_tokens: number;
  estimated_usd: number;
};

export type AiUsageDailyRow = {
  day: string;
  call_count: number;
  total_tokens: number;
  estimated_usd: number;
};

export type AiUsageByFunctionRow = {
  function_name: string;
  call_count: number;
  estimated_usd: number;
};

export type AiUsageSummary = {
  totals: AiUsageTotalsRow[];
  daily: AiUsageDailyRow[];
  byFunction: AiUsageByFunctionRow[];
  totalUsd: number;
  totalCalls: number;
  totalTokens: number;
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

export function useAiUsageSummary(days: number, enabled: boolean) {
  const [summary, setSummary] = useState<AiUsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [totalsRes, dailyRes, fnRes] = await Promise.all([
        supabase.rpc("get_ai_usage_totals", { p_days: days }),
        supabase.rpc("get_ai_usage_daily", { p_days: days }),
        supabase.rpc("get_ai_usage_by_function", { p_days: days }),
      ]);

      if (totalsRes.error) throw totalsRes.error;
      if (dailyRes.error) throw dailyRes.error;
      if (fnRes.error) throw fnRes.error;

      const totals = (totalsRes.data ?? []) as AiUsageTotalsRow[];
      const daily = (dailyRes.data ?? []) as AiUsageDailyRow[];
      const byFunction = (fnRes.data ?? []) as AiUsageByFunctionRow[];

      const totalUsd = totals.reduce((s, r) => s + toNumber(r.estimated_usd), 0);
      const totalCalls = totals.reduce((s, r) => s + toNumber(r.call_count), 0);
      const totalTokens = totals.reduce((s, r) => s + toNumber(r.total_tokens), 0);

      setSummary({ totals, daily, byFunction, totalUsd, totalCalls, totalTokens });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [days, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { summary, loading, error, reload: load };
}
