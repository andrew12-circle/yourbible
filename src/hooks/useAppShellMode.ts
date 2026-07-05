import { useAuth } from "@/contexts/AuthContext";
import { useMiniPhoneEmbed } from "@/contexts/MiniPhoneEmbedContext";
import { parseHomeMode, type HomeMode } from "@/lib/profile/homeMedia";

export function useAppShellMode() {
  const { profile } = useAuth();
  const inMiniPhone = useMiniPhoneEmbed();
  const homeMode: HomeMode = parseHomeMode(profile?.layout);

  return {
    homeMode,
    /** Hub shell when homeMode is hub (sidebar overview on any viewport). Never inside mini phone — apps render as mobile there. */
    showHubShell: !inMiniPhone && homeMode === "hub",
  };
}
