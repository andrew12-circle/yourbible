import { useAuth } from "@/contexts/AuthContext";
import { parseHomeMode, type HomeMode } from "@/lib/profile/homeMedia";
import { useIsMobile } from "@/hooks/use-mobile";

export function useAppShellMode() {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const homeMode: HomeMode = parseHomeMode(profile?.layout);

  return {
    homeMode,
    /** Hub shell is desktop-only; never mount until viewport is known non-mobile. */
    showHubShell: homeMode === "hub" && isMobile === false,
  };
}
