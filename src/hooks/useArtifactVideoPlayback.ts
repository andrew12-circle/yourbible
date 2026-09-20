import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { isArtifactPipVideo, useArtifactLayoutMode } from "@/hooks/useArtifactLayoutMode";
import { useArtifactPlaybackPersistence } from "@/hooks/useArtifactPlaybackPersistence";
import { useArtifactYoutubePip } from "@/hooks/useArtifactYoutubePip";
import { useStaticYouTubeEmbedTelemetry } from "@/hooks/useStaticYouTubeEmbedTelemetry";
import { useYouTubeDocumentPip } from "@/hooks/useYouTubeDocumentPip";
import { useYouTubeEmbedPlayer } from "@/hooks/useYouTubeEmbedPlayer";
import { consumeArtifactInlineVideoResume } from "@/lib/framework/artifactPlaybackProgress";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import { useArtifactGlobalDocumentPipStore } from "@/lib/framework/artifactGlobalDocumentPipStore";
import { youtubeNeedsHostedPlayer } from "@/lib/youtube/hostOrigin";
import { buildYouTubeEmbedSrc } from "@/lib/youtube/embed";

export function useArtifactVideoPlayback(options: {
  artifactId: string | undefined; youTubeVideoId: string | null; videoTitle?: string | null;
  mainScrollRef: RefObject<HTMLDivElement | null>; transcriptSegments: TranscriptSegment[];
  transcriptRefs: RefObject<Record<string, HTMLDivElement | null>>; isLiveBroadcast?: boolean;
}) {
  const { artifactId, youTubeVideoId, videoTitle = null, mainScrollRef, transcriptSegments,
    transcriptRefs, isLiveBroadcast = false } = options;
  const persistence = useArtifactPlaybackPersistence(artifactId);
  const { persistSeconds, localStart, ownerKey, resolvedSeconds, remoteFetchDone } = persistence;
  const sourceKey = `${ownerKey}:${youTubeVideoId ?? ""}:${isLiveBroadcast}`;
  const sourceKeyRef = useRef(sourceKey);
  sourceKeyRef.current = sourceKey;
  const playbackFallbackRef = useRef(isLiveBroadcast ? 0 : localStart);
  const interactedRef = useRef(false);
  const accountSyncedRef = useRef(false);
  const playWhenReadyRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const embedVisibleRef = useRef(false);
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [apiPlayerWanted, setApiPlayerWanted] = useState(false);
  const [staticEmbedStart, setStaticEmbedStart] = useState(isLiveBroadcast ? 0 : localStart);
  const [apiStartSeconds, setApiStartSeconds] = useState(isLiveBroadcast ? 0 : localStart);
  const layout = useArtifactLayoutMode();
  const pipEnabled = isArtifactPipVideo(layout, Boolean(youTubeVideoId));
  const youtubePip = useArtifactYoutubePip({ artifactId, enabled: pipEnabled, mainScrollRef, embedVisibleRef });
  const telemetry = useStaticYouTubeEmbedTelemetry({
    videoSlotRef: youtubePip.videoSlotRef, enabled: Boolean(youTubeVideoId) && !apiPlayerWanted,
    artifactId: artifactId ?? null, initialSeconds: staticEmbedStart,
    // Visibility recovery below uses verified playhead data, never elapsed wall time or a second audio stream.
    syncBackgroundPlayback: false,
  });
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;
  // Stable command identities prevent unrelated renders from restarting intervals or playback recovery.
  const controls = useMemo(() => ({
    getCurrentTime: () => telemetryRef.current.getCurrentTime(),
    getIsPlaying: () => telemetryRef.current.getIsPlaying(),
    getWantsContinuousPlayback: () => telemetryRef.current.getWantsContinuousPlayback(),
    requestCurrentTime: () => telemetryRef.current.requestCurrentTime(),
    isTelemetryFresh: () => telemetryRef.current.isTelemetryFresh(2500),
    seekTo: (seconds: number) => telemetryRef.current.seekTo(seconds, true),
    playVideo: () => telemetryRef.current.playVideo(),
    pauseVideo: () => telemetryRef.current.pauseVideo(),
    togglePlayback: () => telemetryRef.current.togglePlayback(),
    resumeAfterLayoutReposition: () => telemetryRef.current.resumeAfterLayoutReposition(),
  }), []);
  const documentPip = useYouTubeDocumentPip({
    enabled: pipEnabled && !apiPlayerWanted, artifactId, youTubeVideoId, title: videoTitle,
    videoSlotRef: youtubePip.videoSlotRef, pipLayout: youtubePip.pipOverlayLayout,
    getIsPlaying: controls.getIsPlaying, getCurrentTime: controls.getCurrentTime, requestCurrentTime: controls.requestCurrentTime,
    onSyncInline: (seconds, resume) => {
      interactedRef.current = true;
      playbackFallbackRef.current = seconds;
      persistSeconds(seconds);
      controls.seekTo(seconds);
      if (resume) controls.playVideo();
    },
  });
  const youtubePlayer = useYouTubeEmbedPlayer({
    videoId: youTubeVideoId, enabled: Boolean(youTubeVideoId) && apiPlayerWanted,
    startSeconds: apiStartSeconds, artifactId: artifactId ?? null,
    getSavedPlaybackSeconds: () => playbackFallbackRef.current, onPersistPlaybackSeconds: persistSeconds,
    layoutKey: youtubePip.pipMode ? "pip" : "inline",
  });

  useEffect(() => {
    interactedRef.current = false; accountSyncedRef.current = false; playWhenReadyRef.current = false;
    pendingSeekRef.current = null; embedVisibleRef.current = false;
    controls.pauseVideo();
    setEmbedLoaded(false); setApiPlayerWanted(false);
    const start = isLiveBroadcast ? 0 : localStart;
    playbackFallbackRef.current = start; setStaticEmbedStart(start); setApiStartSeconds(start);
    const globalPip = useArtifactGlobalDocumentPipStore.getState();
    if (globalPip.active && (globalPip.session?.artifactId !== artifactId || globalPip.session?.youTubeVideoId !== youTubeVideoId)) {
      documentPip.exitDocumentPip();
    }
  }, [artifactId, controls, documentPip.exitDocumentPip, isLiveBroadcast, localStart, ownerKey, youTubeVideoId]);
  useEffect(() => { if (apiPlayerWanted) documentPip.exitDocumentPip(); }, [apiPlayerWanted, documentPip.exitDocumentPip]);
  useEffect(() => {
    if (!apiPlayerWanted || !youtubePlayer.playerReady) return;
    if (pendingSeekRef.current != null) {
      youtubePlayer.seekTo(pendingSeekRef.current, { play: playWhenReadyRef.current });
      pendingSeekRef.current = null;
    } else if (playWhenReadyRef.current) youtubePlayer.playVideo();
    playWhenReadyRef.current = false;
  }, [apiPlayerWanted, youtubePlayer.playerReady, youtubePlayer.playVideo, youtubePlayer.seekTo]);
  useEffect(() => {
    if (!apiPlayerWanted && telemetry.isPlaying) telemetry.intendedPlayingRef.current = true;
  }, [apiPlayerWanted, telemetry.isPlaying, telemetry.intendedPlayingRef]);

  const previousLayout = useRef(youtubePip.pipMode);
  useEffect(() => {
    const changed = previousLayout.current !== youtubePip.pipMode;
    previousLayout.current = youtubePip.pipMode;
    if (!changed || apiPlayerWanted || !pipEnabled || document.hidden || documentPip.documentPipActive) return;
    if (controls.getWantsContinuousPlayback()) controls.resumeAfterLayoutReposition();
  }, [apiPlayerWanted, controls, documentPip.documentPipActive, pipEnabled, youtubePip.pipMode]);

  useEffect(() => {
    if (isLiveBroadcast || !remoteFetchDone || accountSyncedRef.current || !embedLoaded) return;
    accountSyncedRef.current = true;
    // A late cloud response must not override a user who already played or sought locally.
    if (interactedRef.current || controls.getIsPlaying() || Math.abs(controls.getCurrentTime() - localStart) > 3) return;
    const target = Math.max(0, Math.floor(resolvedSeconds));
    playbackFallbackRef.current = target; setApiStartSeconds(target);
    controls.seekTo(target);
  }, [controls, embedLoaded, isLiveBroadcast, localStart, remoteFetchDone, resolvedSeconds]);

  const getPlaybackSeconds = useCallback(() => {
    if (apiPlayerWanted && youtubePlayer.playerReady) return youtubePlayer.getCurrentTime();
    const seconds = controls.getCurrentTime();
    return controls.isTelemetryFresh() && Number.isFinite(seconds) ? Math.max(0, seconds) : playbackFallbackRef.current;
  }, [apiPlayerWanted, controls, youtubePlayer.getCurrentTime, youtubePlayer.playerReady]);
  const getIsPlaying = useCallback(() => apiPlayerWanted ? youtubePlayer.getIsPlaying() : controls.getIsPlaying(),
    [apiPlayerWanted, controls, youtubePlayer.getIsPlaying]);
  useEffect(() => {
    if (!artifactId || isLiveBroadcast || documentPip.documentPipActive) return;
    const tick = setInterval(() => {
      if (!getIsPlaying() && !interactedRef.current) return;
      const seconds = getPlaybackSeconds();
      playbackFallbackRef.current = seconds; persistSeconds(seconds);
    }, 5000);
    return () => clearInterval(tick);
  }, [artifactId, documentPip.documentPipActive, getIsPlaying, getPlaybackSeconds, isLiveBroadcast, persistSeconds]);

  useEffect(() => {
    if (!youTubeVideoId || apiPlayerWanted || isLiveBroadcast) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wasPlaying = false;
    let secondsAtHide = playbackFallbackRef.current;
    const onVisibility = () => {
      if (documentPip.documentPipActive) return;
      if (document.hidden) {
        wasPlaying = controls.getIsPlaying();
        secondsAtHide = getPlaybackSeconds();
        if (wasPlaying || interactedRef.current) persistSeconds(secondsAtHide);
        return;
      }
      controls.requestCurrentTime();
      const key = sourceKey;
      timer = setTimeout(() => {
        if (key !== sourceKeyRef.current) return;
        const stillIntended = telemetryRef.current.intendedPlayingRef.current;
        const fresh = controls.isTelemetryFresh();
        const actual = controls.getCurrentTime();
        // Restore a suspended/reset player to its last known position; never advance by time spent away.
        if (wasPlaying && stillIntended && (!fresh || (actual < 1 && secondsAtHide > 5))) controls.seekTo(secondsAtHide);
        playbackFallbackRef.current = fresh && actual >= 1 ? actual : secondsAtHide;
        if (wasPlaying && stillIntended && !controls.getIsPlaying()) controls.playVideo();
        wasPlaying = false;
      }, 250);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { document.removeEventListener("visibilitychange", onVisibility); if (timer) clearTimeout(timer); };
  }, [apiPlayerWanted, controls, documentPip.documentPipActive, getPlaybackSeconds, isLiveBroadcast, persistSeconds, sourceKey, youTubeVideoId]);

  const scrollTranscriptToSeconds = useCallback((seconds: number) => {
    let source: TranscriptSegment | undefined;
    for (const segment of transcriptSegments) if (!segment.isParagraphBreak && segment.startSeconds != null && segment.startSeconds <= seconds &&
      (!source || segment.startSeconds >= (source.startSeconds ?? -1))) source = segment;
    if (source) transcriptRefs.current[source.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [transcriptRefs, transcriptSegments]);
  const seekVideoToSeconds = useCallback((seconds: number, opts?: { play?: boolean; scrollTranscript?: boolean }) => {
    if (!Number.isFinite(seconds)) return;
    const target = Math.max(0, Math.floor(seconds));
    interactedRef.current = true; playbackFallbackRef.current = target; persistSeconds(target);
    if (apiPlayerWanted) {
      if (youtubePlayer.playerReady) youtubePlayer.seekTo(target, { play: opts?.play });
      else { pendingSeekRef.current = target; playWhenReadyRef.current = Boolean(opts?.play); setApiStartSeconds(target); }
    } else { controls.seekTo(target); if (opts?.play) controls.playVideo(); }
    if (opts?.scrollTranscript !== false) scrollTranscriptToSeconds(target);
  }, [apiPlayerWanted, controls, persistSeconds, scrollTranscriptToSeconds, youtubePlayer.playerReady, youtubePlayer.seekTo]);
  const activatePlayer = useCallback((opts?: { autoplay?: boolean }) => {
    interactedRef.current = true;
    if (youtubeNeedsHostedPlayer()) { if (opts?.autoplay) controls.playVideo(); return; }
    setApiStartSeconds(getPlaybackSeconds()); setApiPlayerWanted(true);
    playWhenReadyRef.current = Boolean(opts?.autoplay);
    if (apiPlayerWanted && youtubePlayer.playerReady && opts?.autoplay) youtubePlayer.playVideo();
  }, [apiPlayerWanted, controls, getPlaybackSeconds, youtubePlayer.playVideo, youtubePlayer.playerReady]);
  const playVideo = useCallback(() => {
    interactedRef.current = true;
    if (apiPlayerWanted) { if (youtubePlayer.playerReady) youtubePlayer.playVideo(); else playWhenReadyRef.current = true; }
    else controls.playVideo();
  }, [apiPlayerWanted, controls, youtubePlayer.playVideo, youtubePlayer.playerReady]);
  const pauseVideo = useCallback(() => {
    interactedRef.current = true; playWhenReadyRef.current = false;
    if (apiPlayerWanted) youtubePlayer.pauseVideo(); else controls.pauseVideo();
  }, [apiPlayerWanted, controls, youtubePlayer.pauseVideo]);
  const togglePlayback = useCallback(() => { if (getIsPlaying()) pauseVideo(); else playVideo(); }, [getIsPlaying, pauseVideo, playVideo]);
  const getWantsContinuousPlayback = useCallback(() => apiPlayerWanted ? youtubePlayer.getWantsContinuousPlayback() : controls.getWantsContinuousPlayback(),
    [apiPlayerWanted, controls, youtubePlayer.getWantsContinuousPlayback]);
  const onStaticEmbedLoad = useCallback(() => {
    embedVisibleRef.current = true; setEmbedLoaded(true); controls.requestCurrentTime();
    if (!isLiveBroadcast && artifactId && consumeArtifactInlineVideoResume(artifactId)) {
      controls.seekTo(playbackFallbackRef.current); controls.playVideo();
    }
  }, [artifactId, controls, isLiveBroadcast]);
  const resyncPlaybackPosition = useCallback(() => { controls.requestCurrentTime(); playbackFallbackRef.current = getPlaybackSeconds(); }, [controls, getPlaybackSeconds]);
  const handleRestoreFromDocumentPip = useCallback(() => {
    documentPip.exitDocumentPip(); youtubePip.scrollVideoIntoView();
  }, [documentPip.exitDocumentPip, youtubePip.scrollVideoIntoView]);
  const staticEmbedSrc = useMemo(() => youTubeVideoId ? buildYouTubeEmbedSrc(youTubeVideoId, staticEmbedStart, { liveEdge: isLiveBroadcast }) : null,
    [isLiveBroadcast, staticEmbedStart, youTubeVideoId]);
  return { pipEnabled, youtubePip, youtubePlayer, documentPip, handleRestoreFromDocumentPip,
    persistSeconds, playbackFallbackRef, seekVideoToSeconds, scrollTranscriptToSeconds, getPlaybackSeconds,
    activatePlayer, activateAndPlay: playVideo, togglePlayback,
    isPlaying: apiPlayerWanted ? youtubePlayer.isPlaying : telemetry.isPlaying,
    getIsPlaying, getWantsContinuousPlayback, pauseVideo, playVideo, resyncPlaybackPosition,
    staticEmbedSrc, onStaticEmbedLoad, showApiPlayer: apiPlayerWanted,
    useStaticPip: pipEnabled && !apiPlayerWanted, playerReady: apiPlayerWanted ? youtubePlayer.playerReady : embedLoaded };
}
