import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import {
  listClosedLifeWeekIndices,
  resolvePendingLifeWeekReview,
  saveLifeWeekReview,
  type PendingLifeWeekReview,
} from "@/lib/lifeWeekReview";

type LifeWeekReviewContextValue = {
  loading: boolean;
  closedWeekIndices: Set<number>;
  pendingReview: PendingLifeWeekReview | null;
  completeReview: (reflection: string) => Promise<void>;
  saving: boolean;
  refresh: () => Promise<void>;
};

const LifeWeekReviewContext = createContext<LifeWeekReviewContextValue | null>(null);

export function LifeWeekReviewProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const birthIso = profile?.date_of_birth ?? null;
  const enabled = Boolean(userId && birthIso?.trim() && !needsOnboarding(profile));

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closedWeekIndices, setClosedWeekIndices] = useState<Set<number>>(() => new Set());

  const refresh = useCallback(async () => {
    if (!userId || !enabled) {
      setClosedWeekIndices(new Set());
      return;
    }
    setLoading(true);
    try {
      const closed = await listClosedLifeWeekIndices(userId);
      setClosedWeekIndices(closed);
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pendingReview = useMemo(() => {
    if (!enabled || loading) return null;
    return resolvePendingLifeWeekReview(birthIso, Date.now(), closedWeekIndices);
  }, [enabled, loading, birthIso, closedWeekIndices]);

  const completeReview = useCallback(
    async (reflection: string) => {
      if (!userId || !pendingReview) return;
      setSaving(true);
      try {
        await saveLifeWeekReview(userId, pendingReview.weekIndex, pendingReview.weekStart, reflection);
        setClosedWeekIndices((prev) => new Set(prev).add(pendingReview.weekIndex));
      } finally {
        setSaving(false);
      }
    },
    [userId, pendingReview],
  );

  const value = useMemo(
    () => ({
      loading,
      closedWeekIndices,
      pendingReview,
      completeReview,
      saving,
      refresh,
    }),
    [loading, closedWeekIndices, pendingReview, completeReview, saving, refresh],
  );

  return <LifeWeekReviewContext.Provider value={value}>{children}</LifeWeekReviewContext.Provider>;
}

export function useLifeWeekReview(): LifeWeekReviewContextValue {
  const ctx = useContext(LifeWeekReviewContext);
  if (!ctx) {
    throw new Error("useLifeWeekReview must be used within LifeWeekReviewProvider");
  }
  return ctx;
}

export function useLifeWeekReviewOptional(): LifeWeekReviewContextValue | null {
  return useContext(LifeWeekReviewContext);
}
