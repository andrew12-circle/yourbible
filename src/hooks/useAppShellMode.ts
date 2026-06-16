import { useAuth } from "@/contexts/AuthContext";
import { parseHomeMode, type HomeMode } from "@/lib/profile/homeMedia";

export function useAppShellMode() {
  const { profile } = useAuth();
  const homeMode: HomeMode = parseHomeMode(profile?.layout);

  return {
    homeMode,
    /** Hub shell when homeMode is hub (sidebar overview on any viewport). */
    showHubShell: homeMode === "hub",
  };
}
