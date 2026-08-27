import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { useLifeWeekReview } from "@/contexts/LifeWeekReviewContext";
import { LifeWeekReviewDialog } from "@/components/life/LifeWeekReviewDialog";

const SKIP_PREFIXES = ["/auth", "/onboarding"];

export function LifeWeekReviewGate() {
  const { user, profile, loading: authLoading } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const {
    pendingReview,
    completeReview,
    dismissPendingReview,
    saving,
    pendingReviewCount,
    pendingReviewDismissalsLeft,
    openNativeVideoReview,
    nativeVideoReviewOwnerId,
  } = useLifeWeekReview();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const ownerId = params.get("resumeLifeWeekVideo");
    if (!ownerId || !openNativeVideoReview(ownerId)) return;
    params.delete("resumeLifeWeekVideo");
    const next = params.toString();
    navigate({ pathname, search: next ? `?${next}` : "" }, { replace: true });
  }, [navigate, openNativeVideoReview, pathname, search]);

  const skipRoute = SKIP_PREFIXES.some((p) => pathname.startsWith(p));
  const open =
    !skipRoute &&
    !authLoading &&
    Boolean(user) &&
    !needsOnboarding(profile) &&
    pendingReview != null;

  if (!open || !pendingReview) return null;

  return (
    <LifeWeekReviewDialog
      key={`${pendingReview.subject}-${pendingReview.weekIndex}`}
      open={open}
      pending={pendingReview}
      saving={saving}
      remainingCount={pendingReviewCount}
      dismissalsLeft={pendingReviewDismissalsLeft}
      onComplete={completeReview}
      onDismiss={dismissPendingReview}
      resumeNativeVideoOwner={nativeVideoReviewOwnerId}
    />
  );
}
