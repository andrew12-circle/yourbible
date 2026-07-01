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
import {
  lifeWeekReviewDismissKey,
  localDismissLifeWeekReview,
  localListClosedLifeWeekIndicesBySubject,
  localListDismissedLifeWeekReviewKeys,
} from "@/lib/lifeWeekReviewLocalStore";
import { syncLifeWeekReviewToJournal } from "@/lib/lifeWeekReviewJournal";
import { parseFamilyFromLayout } from "@/lib/lifeWeeksFamily";

type LifeWeekReviewContextValue = {
  loading: boolean;
  closedWeekIndicesBySubject: Record<LifeWeekReviewSubject, Set<number>>;
  /** Closed weeks for self — convenience for life-weeks chart. */
  closedWeekIndices: Set<number>;
  pendingReview: PendingLifeWeekReview | null;
  pendingReviewCount: number;
  completeReview: (reflection: string) => Promise<void>;
  dismissPendingReview: () => void;
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
  const [dismissedReviewKeys, setDismissedReviewKeys] = useState<Set<string>>(() =>
    userId ? localListDismissedLifeWeekReviewKeys(userId) : new Set(),
  );

  const refresh = useCallback(async () => {
    if (!userId || !enabled) {
      setClosedWeekIndicesBySubject(emptyClosedWeekIndicesBySubject());
      return;
    }
    setLoading(true);
    try {
      const closed = await listClosedLifeWeekIndicesBySubject(userId);
      setClosedWeekIndicesBySubject(closed);
    } catch {
      setClosedWeekIndicesBySubject(localListClosedLifeWeekIndicesBySubject(userId));
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) {
      setDismissedReviewKeys(new Set());
      return;
    }
    setDismissedReviewKeys(localListDismissedLifeWeekReviewKeys(userId));
  }, [userId]);

  useEffect(() => {
    if (!enabled) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [enabled, refresh]);

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
    return resolvePendingLifeWeekReviews(reviewPeople, closedWeekIndicesBySubject).filter(
      (review) => !dismissedReviewKeys.has(lifeWeekReviewDismissKey(review.subject, review.weekIndex)),
    );
  }, [enabled, loading, reviewPeople, closedWeekIndicesBySubject, dismissedReviewKeys]);

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
        void syncLifeWeekReviewToJournal(userId, {
          subject: pendingReview.subject,
          personName: pendingReview.personName,
          weekIndex: pendingReview.weekIndex,
          weekNumber: pendingReview.weekNumber,
          weekRangeLabel: pendingReview.weekRangeLabel,
          weekStart: pendingReview.weekStart,
          reflection,
        }).catch(() => {});
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

  const dismissPendingReview = useCallback(() => {
    if (!userId || !pendingReview) return;
    localDismissLifeWeekReview(userId, pendingReview.subject, pendingReview.weekIndex);
    const key = lifeWeekReviewDismissKey(pendingReview.subject, pendingReview.weekIndex);
    setDismissedReviewKeys((prev) => new Set([...prev, key]));
  }, [userId, pendingReview]);

  const value = useMemo(
    () => ({
      loading,
      closedWeekIndicesBySubject,
      closedWeekIndices: closedWeekIndicesBySubject.self,
      pendingReview,
      pendingReviewCount: pendingReviews.length,
      completeReview,
      dismissPendingReview,
      saving,
      refresh,
    }),
    [
      loading,
      closedWeekIndicesBySubject,
      pendingReview,
      pendingReviews.length,
      completeReview,
      dismissPendingReview,
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
