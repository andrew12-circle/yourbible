import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ArtifactYoutubePipOverlay from "@/components/framework/ArtifactYoutubePipOverlay";
import { useArtifactPlaybackPersistence } from "@/hooks/useArtifactPlaybackPersistence";
import { useArtifactPipLayoutGestures } from "@/hooks/useArtifactPipLayoutGestures";
import { useStaticYouTubeEmbedTelemetry } from "@/hooks/useStaticYouTubeEmbedTelemetry";
import { useArtifactGlobalVideoPipStore } from "@/lib/framework/artifactGlobalVideoPipStore";
import { artifactVideoRadius } from "@/lib/framework/artifactSurfaces";
import { isArtifactDetailPath } from "@/pages/framework/FrameworkLayout";
import { pipTotalHeightPx } from "@/lib/framework/artifactYoutubePip";
import { floatingJournalPlaybackRef } from "@/lib/journal/floatingJournalPlaybackRef";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";
import { markArtifactInlineVideoResume } from "@/lib/framework/artifactPlaybackProgress";
import { buildYouTubeEmbedSrc } from "@/lib/youtube/embed";
import { cn } from "@/lib/utils";

export default function GlobalArtifactVideoPip() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const session = useArtifactGlobalVideoPipStore((s) => s.session);
  const dismiss = useArtifactGlobalVideoPipStore((s) => s.dismiss);

  const videoSlotRef = useRef<HTMLDivElement | null>(null);
  const resumeOnLoadRef = useRef(false);
  const playbackFallbackRef = useRef(0);

  const { resolvedSeconds: savedStart, persistSeconds } = useArtifactPlaybackPersistence(
    session?.artifactId,
  );

  const startSeconds = useMemo(() => {
    if (!session) return 0;
    const handoff = session.startSeconds;
    if (handoff > 0) return handoff;
    return savedStart;
  }, [savedStart, session]);

  useEffect(() => {
    playbackFallbackRef.current = startSeconds;
  }, [session?.artifactId, session?.youTubeVideoId, startSeconds]);

  const {
    pipOverlayLayout,
    onPipDragHeaderPointerDown,
    onPipDragHeaderPointerMove,
    onPipDragHeaderPointerUp,
    onPipResizePointerDown,
    onPipResizePointerMove,
    onPipResizePointerUp,
  } = useArtifactPipLayoutGestures(session?.artifactId, session?.layout);

  const staticTelemetry = useStaticYouTubeEmbedTelemetry({
    videoSlotRef,
    enabled: Boolean(session),
    initialSeconds: startSeconds,
    syncBackgroundPlayback: true,
    getSavedPlaybackSeconds: () => playbackFallbackRef.current,
    onPersistPlaybackSeconds: (seconds) => {
      playbackFallbackRef.current = seconds;
      persistSeconds(seconds);
    },
    iosAudioHandoff: session
      ? { videoId: session.youTubeVideoId, title: session.title }
      : undefined,
  });

  const staticEmbedSrc = useMemo(() => {
    if (!session) return null;
    return buildYouTubeEmbedSrc(session.youTubeVideoId, startSeconds, {
      autoplay: session.resumePlayback,
    });
  }, [session, startSeconds]);

  useEffect(() => {
    resumeOnLoadRef.current = Boolean(session?.resumePlayback);
  }, [session?.artifactId, session?.resumePlayback, session?.youTubeVideoId]);

  const onStaticEmbedLoad = useCallback(() => {
    if (startSeconds > 0) staticTelemetry.seekTo(startSeconds, true);
    if (resumeOnLoadRef.current) staticTelemetry.resumeAfterLayoutReposition();
    resumeOnLoadRef.current = false;
  }, [startSeconds, staticTelemetry]);

  useEffect(() => {
    if (!session) return;
    const tick = window.setInterval(() => {
      const t = staticTelemetry.getCurrentTime();
      playbackFallbackRef.current = t;
      persistSeconds(t);
    }, 2000);
    return () => window.clearInterval(tick);
  }, [persistSeconds, session, staticTelemetry]);

  useEffect(() => {
    if (!session) {
      floatingJournalPlaybackRef.current = null;
      useFloatingJournalStore.getState().setPlaybackCaptureAvailable(false);
      return;
    }

    floatingJournalPlaybackRef.current = () => staticTelemetry.getCurrentTime();
    useFloatingJournalStore.getState().setPlaybackCaptureAvailable(true);
    useFloatingJournalStore.getState().setRouteArtifact({
      id: session.artifactId,
      title: session.title ?? "Untitled artifact",
      kind: "youtube",
      youTubeVideoId: session.youTubeVideoId,
    });

    return () => {
      floatingJournalPlaybackRef.current = null;
      useFloatingJournalStore.getState().setPlaybackCaptureAvailable(false);
      const onDetail = isArtifactDetailPath(pathname);
      if (!onDetail) {
        useFloatingJournalStore.getState().setRouteArtifact(null);
      }
    };
  }, [pathname, session, staticTelemetry]);

  const restoreToArtifact = useCallback(() => {
    if (!session) return;
    const seconds = staticTelemetry.getCurrentTime();
    playbackFallbackRef.current = seconds;
    persistSeconds(seconds);
    markArtifactInlineVideoResume(session.artifactId);
    dismiss();
    navigate(`/framework/artifacts/${session.artifactId}#video`);
  }, [dismiss, navigate, persistSeconds, session, staticTelemetry]);

  if (!session || typeof document === "undefined") return null;
  if (isArtifactDetailPath(pathname)) return null;
  if (!staticEmbedSrc) return null;

  const pipHeight = pipTotalHeightPx(pipOverlayLayout.width);

  return (
    <>
      <div
        ref={videoSlotRef}
        className={cn(
          "fixed z-[90] overflow-hidden bg-black",
          artifactVideoRadius,
          "shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/15",
        )}
        style={{
          left: pipOverlayLayout.left,
          top: pipOverlayLayout.top,
          width: pipOverlayLayout.width,
          height: pipHeight,
        }}
        role="region"
        aria-label={session.title ? `Playing: ${session.title}` : "Artifact video"}
      >
        <iframe
          data-youtube-static-embed
          key={`${session.youTubeVideoId}:${startSeconds}:${session.resumePlayback ? 1 : 0}`}
          src={staticEmbedSrc}
          title={session.title ?? "YouTube video"}
          className="h-full w-full border-0 bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          onLoad={onStaticEmbedLoad}
        />
      </div>

      <ArtifactYoutubePipOverlay
        active
        layout={pipOverlayLayout}
        isPlaying={staticTelemetry.isPlaying}
        onTogglePlay={staticTelemetry.togglePlayback}
        onScrollVideoIntoView={restoreToArtifact}
        onDragHeaderPointerDown={onPipDragHeaderPointerDown}
        onDragHeaderPointerMove={onPipDragHeaderPointerMove}
        onDragHeaderPointerUp={onPipDragHeaderPointerUp}
        onResizePointerDown={onPipResizePointerDown}
        onResizePointerMove={onPipResizePointerMove}
        onResizePointerUp={onPipResizePointerUp}
      />
    </>
  );
}
