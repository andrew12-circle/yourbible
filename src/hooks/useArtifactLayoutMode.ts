import * as React from "react";
import { useMiniPhoneEmbed } from "@/contexts/MiniPhoneEmbedContext";
import {
  ARTIFACT_TABLET_MIN_PX,
  ARTIFACT_VIDEO_DESKTOP_MIN_PX,
} from "@/lib/framework/artifactSurfaces";

export type ArtifactLayoutMode = "phone" | "tablet" | "desktop";

function resolveLayoutMode(): ArtifactLayoutMode {
  if (typeof window === "undefined") return "desktop";
  if (window.innerWidth >= ARTIFACT_VIDEO_DESKTOP_MIN_PX) return "desktop";
  if (window.innerWidth >= ARTIFACT_TABLET_MIN_PX) return "tablet";
  return "phone";
}

/** Single layout signal for YouTube artifact detail (phone / tablet / desktop). */
export function useArtifactLayoutMode(): ArtifactLayoutMode {
  const inMiniPhone = useMiniPhoneEmbed();
  const [mode, setMode] = React.useState<ArtifactLayoutMode>(resolveLayoutMode);

  React.useEffect(() => {
    const mqlPhone = window.matchMedia(`(max-width: ${ARTIFACT_TABLET_MIN_PX - 1}px)`);
    const mqlDesktop = window.matchMedia(`(min-width: ${ARTIFACT_VIDEO_DESKTOP_MIN_PX}px)`);
    const sync = () => setMode(resolveLayoutMode());
    mqlPhone.addEventListener("change", sync);
    mqlDesktop.addEventListener("change", sync);
    sync();
    return () => {
      mqlPhone.removeEventListener("change", sync);
      mqlDesktop.removeEventListener("change", sync);
    };
  }, []);

  if (inMiniPhone) return "phone";
  return mode;
}

export function isArtifactLayoutDesktop(mode: ArtifactLayoutMode): boolean {
  return mode === "desktop";
}

/**
 * Phone + tablet: pinned video, bottom dock, and mobile study overview (not legacy collapsible stack).
 */
export function isArtifactStickyVideo(mode: ArtifactLayoutMode, hasYouTube: boolean): boolean {
  return hasYouTube && mode !== "desktop";
}

/** Desktop only: split study pane + floating PiP while scrolling. */
export function isArtifactPipVideo(mode: ArtifactLayoutMode, hasYouTube: boolean): boolean {
  return hasYouTube && mode === "desktop";
}
