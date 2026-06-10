import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "@/hooks/use-toast";
import {
  closeYouTubeDocumentPip,
  findYouTubeStaticShell,
  isDocumentPictureInPictureSupported,
  openYouTubeDocumentPip,
  type DocumentPipSession,
} from "@/lib/youtube/documentPictureInPicture";
import { pipTotalHeightPx, type ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";

export function useYouTubeDocumentPip(options: {
  enabled: boolean;
  videoSlotRef: RefObject<HTMLElement | null>;
  pipLayout?: ArtifactPipLayout;
  getIsPlaying?: () => boolean;
}) {
  const { enabled, videoSlotRef, pipLayout, getIsPlaying } = options;
  const sessionRef = useRef<DocumentPipSession | null>(null);
  const tabHideToastShownRef = useRef(false);
  const getIsPlayingRef = useRef(getIsPlaying);
  getIsPlayingRef.current = getIsPlaying;
  const [documentPipActive, setDocumentPipActive] = useState(false);

  const supported = enabled && isDocumentPictureInPictureSupported();

  const exitDocumentPip = useCallback(() => {
    closeYouTubeDocumentPip(sessionRef.current);
    sessionRef.current = null;
    setDocumentPipActive(false);
  }, []);

  const enterDocumentPip = useCallback(async () => {
    if (!supported || sessionRef.current) return false;

    const shell =
      findYouTubeStaticShell(videoSlotRef.current) ??
      findYouTubeStaticShell(document.body);
    if (!shell) return false;

    const layout = pipLayout;
    const rect = shell.getBoundingClientRect();
    const width = layout?.width ?? (rect.width || 480);
    const height = layout ? pipTotalHeightPx(layout.width) : rect.height || 270;

    const session = await openYouTubeDocumentPip({
      shell,
      width,
      height,
      onClose: () => {
        sessionRef.current = null;
        setDocumentPipActive(false);
      },
    });

    if (!session) {
      toast({
        title: "Pop-out unavailable",
        description: "Could not open the floating player. Try again from the video controls.",
      });
      return false;
    }

    sessionRef.current = session;
    setDocumentPipActive(true);
    tabHideToastShownRef.current = false;
    return true;
  }, [pipLayout, supported, videoSlotRef]);

  useEffect(() => {
    if (!supported) return;
    return () => {
      exitDocumentPip();
    };
  }, [exitDocumentPip, supported]);

  /** One-time hint when tab hides while playing without OS PiP. */
  useEffect(() => {
    if (!supported || documentPipActive) return;

    const onVisibility = () => {
      if (!document.hidden || tabHideToastShownRef.current || documentPipActive) return;
      if (!getIsPlayingRef.current?.()) return;
      tabHideToastShownRef.current = true;
      toast({
        title: "Keep watching in other tabs",
        description: "Use Pop out on the video player before switching tabs to keep playback going.",
      });
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [documentPipActive, supported]);

  return {
    documentPipSupported: supported,
    documentPipActive,
    enterDocumentPip,
    exitDocumentPip,
  };
}
