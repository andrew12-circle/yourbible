import { useAuth } from "@/contexts/AuthContext";
import { useMiniPhoneEmbed } from "@/contexts/MiniPhoneEmbedContext";
import { parseHomeMode, type HomeMode } from "@/lib/profile/homeMedia";
import { Capacitor } from "@capacitor/core";

export function shouldShowHubShell(options: {
  homeMode: HomeMode;
  inMiniPhone: boolean;
  nativeApp: boolean;
}): boolean {
  return !options.nativeApp && !options.inMiniPhone && options.homeMode === "hub";
}

export function useAppShellMode() {
  const { profile } = useAuth();
  const inMiniPhone = useMiniPhoneEmbed();
  const homeMode: HomeMode = parseHomeMode(profile?.layout);
  const nativeApp = Capacitor.isNativePlatform();

  return {
    homeMode,
    /** Native phones always use the app launcher and mobile page shells. */
    showHubShell: shouldShowHubShell({ homeMode, inMiniPhone, nativeApp }),
  };
}
