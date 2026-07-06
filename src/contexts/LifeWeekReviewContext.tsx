import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import {
  LIFE_WEEK_REVIEW_MAX_DISMISSALS,
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
  localIncrementLifeWeekReviewDismissCount,
  localListClosedLifeWeekIndicesBySubject,
  localListLifeWeekReviewDismissCounts,
} from "@/lib/lifeWeekReviewLocalStore";
import { syncLifeWeekReviewToJournal } from "@/lib/lifeWeekReviewJournal";
import { parseFamilyFromLayout } from "@/lib/lifeWeeksFamily";
import type { JournalVideoCaptureResult } from "@/hooks/useJournalVideoCapture";
import { saveJournalVideoCaptureWithQueue } from "@/lib/journal/journalVideoUploadProcessor";
import { pickBestVideoJournalTranscript } from "@/lib/journal/journalVideoBody";

export type LifeWeekReviewVideoCapture = {
  result: JournalVideoCaptureResult;
  durationMs: number;
};

export type LifeWeekReviewDraft = {
  checked: boolean;
  reflection: string;
  recordedVideo: LifeWeekReviewVideoCapture | null;
};

export function lifeWeekReviewDraftKey(subject: LifeWeekReviewSubject, weekIndex: number): string {
  return `${subject}:${weekIndex}`;
}

const emptyLifeWeekReviewDraft = (): LifeWeekReviewDraft => ({
  checked: false,
  reflection: "",
  recordedVideo: null,
});

type LifeWeekReviewContextValue = {
  loading: boolean;
  closedWeekIndicesBySubject: Record<LifeWeekReviewSubject, Set<number>>;
  /** Closed weeks for self — convenience for life-weeks chart. */
  closedWeekIndices: Set<number>;
  pendingReview: PendingLifeWeekReview | null;
  pendingReviewCount: number;
  /** Remaining "remind me later" dismissals before this week stops prompting. */
  pendingReviewDismissalsLeft: number;
  getDraft: (subject: LifeWeekReviewSubject, weekIndex: number) => LifeWeekReviewDraft;
  patchDraft: (
    subject: LifeWeekReviewSubject,
    weekIndex: number,
    patch: Partial<LifeWeekReviewDraft> | ((prev: LifeWeekReviewDraft) => Partial<LifeWeekReviewDraft>),
  ) => void;
  completeReview: (reflection: string, video?: LifeWeekReviewVideoCapture) => Promise<void>;
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
  const [dismissCountsByKey, setDismissCountsByKey] = useState<Record<string, number>>(() =>
    userId ? localListLifeWeekReviewDismissCounts(userId) : {},
  );
  const [sessionDismissedKeys, setSessionDismissedKeys] = useState<Set<string>>(() => new Set());
  const [draftsByKey, setDraftsByKey] = useState<Record<string, LifeWeekReviewDraft>>({});

  const getDraft = useCallback(
    (subject: LifeWeekReviewSubject, weekIndex: number): LifeWeekReviewDraft => {
      return draftsByKey[lifeWeekReviewDraftKey(subject, weekIndex)] ?? emptyLifeWeekReviewDraft();
    },
    [draftsByKey],
  );

  const patchDraft = useCallback(
    (
      subject: LifeWeekReviewSubject,
      weekIndex: number,
      patch: Partial<LifeWeekReviewDraft> | ((prev: LifeWeekReviewDraft) => Partial<LifeWeekReviewDraft>),
    ) => {
      const key = lifeWeekReviewDraftKey(subject, weekIndex);
      setDraftsByKey((prev) => {
        const current = { ...emptyLifeWeekReviewDraft(), ...prev[key] };
        const nextPatch = typeof patch === "function" ? patch(current) : patch;
        return { ...prev, [key]: { ...current, ...nextPatch } };
      });
    },
    [],
  );

  const clearDraft = useCallback((subject: LifeWeekReviewSubject, weekIndex: number) => {
    const key = lifeWeekReviewDraftKey(subject, weekIndex);
    setDraftsByKey((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

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
      setDismissCountsByKey({});
      setSessionDismissedKeys(new Set());
      setDraftsByKey({});
      return;
    }
    setDismissCountsByKey(localListLifeWeekReviewDismissCounts(userId));
    setSessionDismissedKeys(new Set());
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
    if (!enabled || reviewPeople.length === 0 || !userId) return [];
    return resolvePendingLifeWeekReviews(reviewPeople, closedWeekIndicesBySubject).filter((review) => {
      const key = lifeWeekReviewDismissKey(review.subject, review.weekIndex);
      const dismissCount = dismissCountsByKey[key] ?? 0;
      if (dismissCount >= LIFE_WEEK_REVIEW_MAX_DISMISSALS) return false;
      if (sessionDismissedKeys.has(key)) return false;
      return true;
    });
  }, [enabled, reviewPeople, closedWeekIndicesBySubject, sessionDismissedKeys, dismissCountsByKey, userId]);

  const pendingReview = pendingReviews[0] ?? null;

  const pendingReviewDismissalsLeft = useMemo(() => {
    if (!userId || !pendingReview) return 0;
    const count = dismissCountsByKey[lifeWeekReviewDismissKey(pendingReview.subject, pendingReview.weekIndex)] ?? 0;
    return Math.max(0, LIFE_WEEK_REVIEW_MAX_DISMISSALS - count);
  }, [userId, pendingReview, dismissCountsByKey]);

  const completeReview = useCallback(
    async (reflection: string, video?: LifeWeekReviewVideoCapture) => {
      if (!userId || !pendingReview) return;
      setSaving(true);
      try {
        const transcriptFromVideo = video
          ? pickBestVideoJournalTranscript(video.result.liveTranscript, video.result.peakLiveTranscript).trim()
          : "";
        const finalReflection = reflection.trim() || transcriptFromVideo || "(Video week reflection)";

        await saveLifeWeekReview(
          userId,
          pendingReview.subject,
          pendingReview.weekIndex,
          pendingReview.weekStart,
          finalReflection,
        );
        const journalResult = await syncLifeWeekReviewToJournal(userId, {
          subject: pendingReview.subject,
          personName: pendingReview.personName,
          weekIndex: pendingReview.weekIndex,
          weekNumber: pendingReview.weekNumber,
          weekRangeLabel: pendingReview.weekRangeLabel,
          weekStart: pendingReview.weekStart,
          reflection: finalReflection,
        }).catch(() => null);

        if (video && journalResult?.entryId) {
          await saveJournalVideoCaptureWithQueue({
            userId,
            entryId: journalResult.entryId,
            result: video.result,
            durationMs: video.durationMs,
            anchorOffset: 0,
          }).catch(() => {});
        }

        setClosedWeekIndicesBySubject((prev) => {
          const next = emptyClosedWeekIndicesBySubject();
          for (const subject of Object.keys(prev) as LifeWeekReviewSubject[]) {
            next[subject] = new Set(prev[subject]);
          }
          next[pendingReview.subject].add(pendingReview.weekIndex);
          return next;
        });
        clearDraft(pendingReview.subject, pendingReview.weekIndex);
      } finally {
        setSaving(false);
      }
    },
    [userId, pendingReview, clearDraft],
  );

  const dismissPendingReview = useCallback(() => {
    if (!userId || !pendingReview) return;
    const key = lifeWeekReviewDismissKey(pendingReview.subject, pendingReview.weekIndex);
    const nextCount = localIncrementLifeWeekReviewDismissCount(
      userId,
      pendingReview.subject,
      pendingReview.weekIndex,
    );
    setDismissCountsByKey((prev) => ({ ...prev, [key]: nextCount }));
    if (nextCount < LIFE_WEEK_REVIEW_MAX_DISMISSALS) {
      setSessionDismissedKeys((prev) => new Set([...prev, key]));
    }
  }, [userId, pendingReview]);

  const value = useMemo(
    () => ({
      loading,
      closedWeekIndicesBySubject,
      closedWeekIndices: closedWeekIndicesBySubject.self,
      pendingReview,
      pendingReviewCount: pendingReviews.length,
      pendingReviewDismissalsLeft,
      getDraft,
      patchDraft,
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
      pendingReviewDismissalsLeft,
      getDraft,
      patchDraft,
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
