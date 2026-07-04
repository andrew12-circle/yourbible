import { useCallback, useEffect, useRef, type RefObject } from "react";
import { toast } from "@/hooks/use-toast";
import {
  getGlobalDocumentPipSessionRef,
  registerDocumentPipSyncInline,
  syncInlineFromDocumentPip,
  triggerDocumentPipActivate,
  useArtifactGlobalDocumentPipStore,
} from "@/lib/framework/artifactGlobalDocumentPipStore";
import { useArtifactGlobalVideoPipStore } from "@/lib/framework/artifactGlobalVideoPipStore";
import { pipTotalHeightPx, type ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";
import {
  closeYouTubeDocumentPip,
  findYouTubeStaticShell,
  hideInlineShellForDocumentPip,
  isArtifactVideoPopoutMessage,
  isDocumentPictureInPictureSupported,
  openYouTubeDocumentPip,
} from "@/lib/youtube/documentPictureInPicture";

export function useYouTubeDocumentPip(options: {
  enabled: boolean;
  artifactId: string | undefined;
  youTubeVideoId: string | null;
  title?: string | null;
  videoSlotRef: RefObject<HTMLElement | null>;
  pipLayout?: ArtifactPipLayout;
  getIsPlaying?: () => boolean;
  getCurrentTime?: () => number;
  requestCurrentTime?: () => void;
  onSyncInline?: (seconds: number, resume: boolean) => void;
}) {
  const {
    enabled,
    artifactId,
    youTubeVideoId,
    title = null,
    videoSlotRef,
    pipLayout,
    getIsPlaying,
    getCurrentTime,
    requestCurrentTime,
    onSyncInline,
  } = options;

  const tabHideToastShownRef = useRef(false);
  const getIsPlayingRef = useRef(getIsPlaying);
  const getCurrentTimeRef = useRef(getCurrentTime);
  const requestCurrentTimeRef = useRef(requestCurrentTime);
  const onSyncInlineRef = useRef(onSyncInline);
  getIsPlayingRef.current = getIsPlaying;
  getCurrentTimeRef.current = getCurrentTime;
  requestCurrentTimeRef.current = requestCurrentTime;
  onSyncInlineRef.current = onSyncInline;

  const documentPipActive = useArtifactGlobalDocumentPipStore((s) => s.active);
  const globalSession = useArtifactGlobalDocumentPipStore((s) => s.session);

  const supported = enabled && isDocumentPictureInPictureSupported();

  useEffect(() => {
    registerDocumentPipSyncInline((seconds, resume) => {
      onSyncInlineRef.current?.(seconds, resume);
    });
    return () => registerDocumentPipSyncInline(null);
  }, []);

  useEffect(() => {
    if (!supported || !documentPipActive || !artifactId) return;
    if (globalSession?.artifactId !== artifactId) return;

    const shell =
      findYouTubeStaticShell(videoSlotRef.current) ?? findYouTubeStaticShell(document.body);
    if (shell) hideInlineShellForDocumentPip(shell);
  }, [artifactId, documentPipActive, globalSession?.artifactId, supported, videoSlotRef]);

  useEffect(() => {
    if (!supported) return;

    const onMessage = (event: MessageEvent) => {
      if (!isArtifactVideoPopoutMessage(event.data, window.location.origin, event.origin)) {
        return;
      }
      if (event.data.action === "activate") return;
      useArtifactGlobalDocumentPipStore.getState().setPopoutPlayback({
        seconds: Math.max(0, Math.floor(event.data.seconds)),
        playing: event.data.playing,
      });
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [supported]);

  const finishDocumentPip = useCallback((resume: boolean) => {
    const sessionRef = getGlobalDocumentPipSessionRef();
    if (!sessionRef.current) return;

    const popoutPlayback = useArtifactGlobalDocumentPipStore.getState().popoutPlayback;
    const hasPopoutTelemetry = popoutPlayback.seconds > 0 || documentPipActive;
    const seconds = hasPopoutTelemetry
      ? popoutPlayback.seconds
      : Math.max(0, Math.floor(getCurrentTimeRef.current?.() ?? 0));
    const shouldResume = resume || popoutPlayback.playing;
    syncInlineFromDocumentPip(shouldResume, { seconds, playing: popoutPlayback.playing });

    closeYouTubeDocumentPip(sessionRef.current);
    sessionRef.current = null;
    useArtifactGlobalDocumentPipStore.getState().clear();
  }, [documentPipActive]);

  const exitDocumentPip = useCallback(() => {
    finishDocumentPip(getIsPlayingRef.current?.() ?? useArtifactGlobalDocumentPipStore.getState().popoutPlayback.playing);
  }, [finishDocumentPip]);

  const enterDocumentPip = useCallback(async () => {
    if (!supported || !artifactId || !youTubeVideoId) return false;
    if (getGlobalDocumentPipSessionRef().current) return false;

    const inlineShell =
      findYouTubeStaticShell(videoSlotRef.current) ?? findYouTubeStaticShell(document.body);

    requestCurrentTimeRef.current?.();
    const wasPlaying = getIsPlayingRef.current?.() ?? false;
    const seconds = Math.max(0, Math.floor(getCurrentTimeRef.current?.() ?? 0));
    useArtifactGlobalDocumentPipStore.getState().setPopoutPlayback({ seconds, playing: wasPlaying });

    const layout = pipLayout;
    const rect = inlineShell?.getBoundingClientRect();
    const width = layout?.width ?? (rect?.width || 480);
    const height = layout ? pipTotalHeightPx(layout.width) : rect?.height || 270;

    useArtifactGlobalVideoPipStore.getState().dismiss();

    const session = await openYouTubeDocumentPip({
      inlineShell,
      artifactId,
      videoId: youTubeVideoId,
      startSeconds: seconds,
      autoplay: wasPlaying,
      pageUrl: window.location.href,
      width,
      height,
      onClose: () => {
        finishDocumentPip(useArtifactGlobalDocumentPipStore.getState().popoutPlayback.playing);
      },
      onActivate: () => {
        triggerDocumentPipActivate();
      },
      onPopoutMessage: (data) => {
        useArtifactGlobalDocumentPipStore.getState().setPopoutPlayback({
          seconds: Math.max(0, Math.floor(data.seconds)),
          playing: data.playing,
        });
      },
    });

    if (!session) {
      toast({
        title: "Desktop PiP unavailable",
        description: "Could not open the floating player. Try again from the video controls.",
      });
      return false;
    }

    getGlobalDocumentPipSessionRef().current = session;
    useArtifactGlobalDocumentPipStore.getState().setSession({
      artifactId,
      youTubeVideoId,
      title,
    });
    useArtifactGlobalDocumentPipStore.getState().setActive(true);
    tabHideToastShownRef.current = false;
    return true;
  }, [artifactId, finishDocumentPip, pipLayout, supported, title, videoSlotRef, youTubeVideoId]);

  useEffect(() => {
    if (!supported || documentPipActive) return;

    const onVisibility = () => {
      if (!document.hidden || tabHideToastShownRef.current || documentPipActive) return;
      if (!getIsPlayingRef.current?.()) return;
      tabHideToastShownRef.current = true;
      toast({
        title: "Keep watching while you work",
        description: "Use Desktop PiP on the video player before minimizing to keep playback going.",
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
