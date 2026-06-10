import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "@/hooks/use-toast";
import {
  closeYouTubeDocumentPip,
  findYouTubeStaticShell,
  isDocumentPictureInPictureSupported,
  openYouTubeDocumentPip,
  type DocumentPipSession,
} from "@/lib/youtube/documentPictureInPicture";
import { buildYouTubeEmbedSrc } from "@/lib/youtube/embed";
import { pipTotalHeightPx, type ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";

export function useYouTubeDocumentPip(options: {
  enabled: boolean;
  youTubeVideoId: string | null;
  videoTitle?: string | null;
  videoSlotRef: RefObject<HTMLElement | null>;
  pipLayout?: ArtifactPipLayout;
  getIsPlaying?: () => boolean;
  getCurrentTime?: () => number;
  requestCurrentTime?: () => void;
  onSyncInline?: (seconds: number, resume: boolean) => void;
}) {
  const {
    enabled,
    youTubeVideoId,
    videoTitle = null,
    videoSlotRef,
    pipLayout,
    getIsPlaying,
    getCurrentTime,
    requestCurrentTime,
    onSyncInline,
  } = options;
  const sessionRef = useRef<DocumentPipSession | null>(null);
  const tabHideToastShownRef = useRef(false);
  const getIsPlayingRef = useRef(getIsPlaying);
  const getCurrentTimeRef = useRef(getCurrentTime);
  const requestCurrentTimeRef = useRef(requestCurrentTime);
  const onSyncInlineRef = useRef(onSyncInline);
  getIsPlayingRef.current = getIsPlaying;
  getCurrentTimeRef.current = getCurrentTime;
  requestCurrentTimeRef.current = requestCurrentTime;
  onSyncInlineRef.current = onSyncInline;
  const [documentPipActive, setDocumentPipActive] = useState(false);

  const supported = enabled && isDocumentPictureInPictureSupported();

  const syncInlineFromPip = useCallback((resume: boolean) => {
    requestCurrentTimeRef.current?.();
    const seconds = Math.max(0, Math.floor(getCurrentTimeRef.current?.() ?? 0));
    onSyncInlineRef.current?.(seconds, resume);
  }, []);

  const finishDocumentPip = useCallback((resume: boolean) => {
    if (!sessionRef.current) return;
    syncInlineFromPip(resume);
    closeYouTubeDocumentPip(sessionRef.current);
    sessionRef.current = null;
    setDocumentPipActive(false);
  }, [syncInlineFromPip]);

  const exitDocumentPip = useCallback(() => {
    finishDocumentPip(getIsPlayingRef.current?.() ?? false);
  }, [finishDocumentPip]);

  const enterDocumentPip = useCallback(async () => {
    if (!supported || sessionRef.current || !youTubeVideoId) return false;

    const inlineShell =
      findYouTubeStaticShell(videoSlotRef.current) ??
      findYouTubeStaticShell(document.body);
    if (!inlineShell) return false;

    requestCurrentTimeRef.current?.();
    const wasPlaying = getIsPlayingRef.current?.() ?? false;
    const seconds = Math.max(0, Math.floor(getCurrentTimeRef.current?.() ?? 0));
    const embedSrc = buildYouTubeEmbedSrc(youTubeVideoId, seconds, {
      autoplay: wasPlaying,
      origin: window.location.origin,
    });

    const layout = pipLayout;
    const rect = inlineShell.getBoundingClientRect();
    const width = layout?.width ?? (rect.width || 480);
    const height = layout ? pipTotalHeightPx(layout.width) : rect.height || 270;

    const session = await openYouTubeDocumentPip({
      inlineShell,
      embedSrc,
      pageUrl: window.location.href,
      width,
      height,
      title: videoTitle ?? undefined,
      onClose: () => {
        finishDocumentPip(getIsPlayingRef.current?.() ?? false);
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
  }, [finishDocumentPip, pipLayout, supported, videoSlotRef, videoTitle, youTubeVideoId]);

  useEffect(() => {
    if (!supported) return;
    return () => {
      finishDocumentPip(getIsPlayingRef.current?.() ?? false);
    };
  }, [finishDocumentPip, supported]);

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
