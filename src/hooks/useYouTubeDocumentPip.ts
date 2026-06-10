import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "@/hooks/use-toast";
import {
  closeYouTubeDocumentPip,
  findYouTubeStaticShell,
  isArtifactVideoPopoutMessage,
  isDocumentPictureInPictureSupported,
  openYouTubeDocumentPip,
  type DocumentPipSession,
} from "@/lib/youtube/documentPictureInPicture";
import { pipTotalHeightPx, type ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";

export function useYouTubeDocumentPip(options: {
  enabled: boolean;
  youTubeVideoId: string | null;
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
    videoSlotRef,
    pipLayout,
    getIsPlaying,
    getCurrentTime,
    requestCurrentTime,
    onSyncInline,
  } = options;
  const sessionRef = useRef<DocumentPipSession | null>(null);
  const tabHideToastShownRef = useRef(false);
  const popoutPlaybackRef = useRef({ seconds: 0, playing: false });
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

  useEffect(() => {
    if (!supported) return;

    const onMessage = (event: MessageEvent) => {
      if (!isArtifactVideoPopoutMessage(event.data, window.location.origin, event.origin)) {
        return;
      }
      popoutPlaybackRef.current = {
        seconds: Math.max(0, Math.floor(event.data.seconds)),
        playing: event.data.playing,
      };
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [supported]);

  const syncInlineFromPip = useCallback((resume: boolean) => {
    const fromPopout = popoutPlaybackRef.current;
    const hasPopoutTelemetry = fromPopout.seconds > 0 || documentPipActive;
    const seconds = hasPopoutTelemetry
      ? fromPopout.seconds
      : Math.max(0, Math.floor(getCurrentTimeRef.current?.() ?? 0));
    const shouldResume = resume || fromPopout.playing;
    onSyncInlineRef.current?.(seconds, shouldResume);
  }, [documentPipActive]);

  const finishDocumentPip = useCallback((resume: boolean) => {
    if (!sessionRef.current) return;
    syncInlineFromPip(resume);
    closeYouTubeDocumentPip(sessionRef.current);
    sessionRef.current = null;
    setDocumentPipActive(false);
  }, [syncInlineFromPip]);

  const exitDocumentPip = useCallback(() => {
    finishDocumentPip(getIsPlayingRef.current?.() ?? popoutPlaybackRef.current.playing);
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
    popoutPlaybackRef.current = { seconds, playing: wasPlaying };

    const layout = pipLayout;
    const rect = inlineShell.getBoundingClientRect();
    const width = layout?.width ?? (rect.width || 480);
    const height = layout ? pipTotalHeightPx(layout.width) : rect.height || 270;

    const session = await openYouTubeDocumentPip({
      inlineShell,
      videoId: youTubeVideoId,
      startSeconds: seconds,
      autoplay: wasPlaying,
      pageUrl: window.location.href,
      width,
      height,
      onClose: () => {
        finishDocumentPip(popoutPlaybackRef.current.playing);
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
  }, [finishDocumentPip, pipLayout, supported, videoSlotRef, youTubeVideoId]);

  useEffect(() => {
    if (!supported) return;
    return () => {
      finishDocumentPip(popoutPlaybackRef.current.playing);
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
