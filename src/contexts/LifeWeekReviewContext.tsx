import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import {
  emptyClosedWeekIndicesBySubject,
  listClosedLifeWeekIndicesBySubject,
  resolvePendingLifeWeekReviews,
  saveLifeWeekReview,
  type LifeWeekReviewPerson,
  type LifeWeekReviewSubject,
  type PendingLifeWeekReview,
} from "@/lib/lifeWeekReview";
import { parseFamilyFromLayout } from "@/lib/lifeWeeksFamily";

type LifeWeekReviewContextValue = {
  loading: boolean;
  closedWeekIndicesBySubject: Record<LifeWeekReviewSubject, Set<number>>;
  /** Closed weeks for self — convenience for life-weeks chart. */
  closedWeekIndices: Set<number>;
  pendingReview: PendingLifeWeekReview | null;
  pendingReviewCount: number;
  completeReview: (reflection: string) => Promise<void>;
  saving: boolean;
  refresh: () => Promise<void>;
};

const LifeWeekReviewContext = createContext<LifeWeekReviewContextValue | null>(null);

export function LifeWeekReviewProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const birthIso = profile?.date_of_birth ?? null;
  const displayName = profile?.display_name?.trim() || "You";
  const familyMembers = useMemo(() => parseFamilyFromLayout(profile?.layout), [profile?.layout]);
  const enabled = Boolean(userId && !needsOnboarding(profile));

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closedWeekIndicesBySubject, setClosedWeekIndicesBySubject] = useState<
    Record<LifeWeekReviewSubject, Set<number>>
  >(emptyClosedWeekIndicesBySubject);

  const refresh = useCallback(async () => {
    if (!userId || !enabled) {
      setClosedWeekIndicesBySubject(emptyClosedWeekIndicesBySubject());
      return;
    }
    setLoading(true);
    try {
      const closed = await listClosedLifeWeekIndicesBySubject(userId);
      setClosedWeekIndicesBySubject(closed);
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reviewPeople = useMemo((): LifeWeekReviewPerson[] => {
    const people: LifeWeekReviewPerson[] = [];
    if (birthIso?.trim()) {
      people.push({ subject: "self", birthIso: birthIso.trim(), personName: displayName });
    }
    for (const member of familyMembers) {
      if (!member.birthDate) continue;
      people.push({
        subject: member.id,
        birthIso: member.birthDate,
        personName: member.name,
      });
    }
    return people;
  }, [birthIso, displayName, familyMembers]);

  const pendingReviews = useMemo(() => {
    if (!enabled || loading || reviewPeople.length === 0) return [];
    return resolvePendingLifeWeekReviews(reviewPeople, closedWeekIndicesBySubject);
  }, [enabled, loading, reviewPeople, closedWeekIndicesBySubject]);

  const pendingReview = pendingReviews[0] ?? null;

  const completeReview = useCallback(
    async (reflection: string) => {
      if (!userId || !pendingReview) return;
      setSaving(true);
      try {
        await saveLifeWeekReview(
          userId,
          pendingReview.subject,
          pendingReview.weekIndex,
          pendingReview.weekStart,
          reflection,
        );
        setClosedWeekIndicesBySubject((prev) => {
          const next = emptyClosedWeekIndicesBySubject();
          for (const subject of Object.keys(prev) as LifeWeekReviewSubject[]) {
            next[subject] = new Set(prev[subject]);
          }
          next[pendingReview.subject].add(pendingReview.weekIndex);
          return next;
        });
      } finally {
        setSaving(false);
      }
    },
    [userId, pendingReview],
  );

  const value = useMemo(
    () => ({
      loading,
      closedWeekIndicesBySubject,
      closedWeekIndices: closedWeekIndicesBySubject.self,
      pendingReview,
      pendingReviewCount: pendingReviews.length,
      completeReview,
      saving,
      refresh,
    }),
    [
      loading,
      closedWeekIndicesBySubject,
      pendingReview,
      pendingReviews.length,
      completeReview,
      saving,
      refresh,
    ],
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
