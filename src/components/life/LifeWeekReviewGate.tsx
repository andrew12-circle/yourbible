import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { useLifeWeekReview } from "@/contexts/LifeWeekReviewContext";
import { LifeWeekReviewDialog } from "@/components/life/LifeWeekReviewDialog";

const SKIP_PREFIXES = ["/auth", "/onboarding"];

export function LifeWeekReviewGate() {
  const { user, profile, loading: authLoading } = useAuth();
  const { pathname } = useLocation();
  const {
    pendingReview,
    completeReview,
    dismissPendingReview,
    saving,
    loading: reviewLoading,
    pendingReviewCount,
  } = useLifeWeekReview();

  const skipRoute = SKIP_PREFIXES.some((p) => pathname.startsWith(p));
  const open =
    !skipRoute &&
    !authLoading &&
    !reviewLoading &&
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
      onComplete={completeReview}
      onDismiss={dismissPendingReview}
    />
  );
}
