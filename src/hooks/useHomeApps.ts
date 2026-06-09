import { useHomeDashboard } from "@/contexts/HomeDashboardContext";

/** Home launcher apps for the mini phone (requires HomeDashboardProvider). */
export function useHomeApps() {
  const data = useHomeDashboard();
  return {
    apps: data.apps,
    counts: data.counts,
    wallpaper: data.wallpaper,
    wallpaperTint: data.wallpaperTint,
    wallpaperBlur: data.wallpaperBlur,
  };
}
