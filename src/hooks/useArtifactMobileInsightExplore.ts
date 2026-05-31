import { useCallback, useEffect, useState } from "react";
import type { ArtifactMobileTab } from "@/hooks/useArtifactDetailMobileTabs";

export function useArtifactMobileInsightExplore(mobileTab: ArtifactMobileTab, onClose?: () => void) {
  const [claimId, setClaimId] = useState<string | null>(null);

  useEffect(() => {
    if (mobileTab !== "study") setClaimId(null);
  }, [mobileTab]);

  const closeMobileInsightExplore = useCallback(() => {
    setClaimId(null);
    onClose?.();
  }, [onClose]);

  return { mobileInsightExploreClaimId: claimId, setMobileInsightExploreClaimId: setClaimId, closeMobileInsightExplore };
}
