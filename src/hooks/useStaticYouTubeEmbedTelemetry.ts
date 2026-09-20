import { isMessageFromYouTubeFrame, sendYouTubeFrameMessage } from "@/lib/youtube/embedMessaging";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { toast } from "@/hooks/use-toast";
import { clearBackgroundPlaybackHandoff, writeBackgroundPlaybackHandoff } from "@/lib/framework/backgroundPlaybackHandoff";
import { embedNeedsResumeSeek } from "@/lib/framework/playbackSeconds";
import { isIosYouTubeBackgroundAudioActive, startIosYouTubeBackgroundAudio, stopIosYouTubeBackgroundAudio } from "@/lib/youtube/iosBackgroundAudio";
import { isIphoneWebKit } from "@/lib/youtube/platform";
import { EMBED_APP_PAUSE_GRACE_MS, shouldAcceptEmbedPlayingTelemetry } from "@/lib/youtube/embedAutoResume";
import { youtubeDocumentPipActiveRef } from "@/lib/youtube/documentPictureInPicture";
import { getStaticYouTubeEmbedIframe, postYouTubeEmbedCommand, type YouTubeEmbedCommand } from "@/lib/youtube/embed";
import { currentTimeFromEmbedInfo, embedStateIsPlaying, parseYouTubeEmbedMessage, YT_EMBED_STATE } from "@/lib/youtube/embedTelemetry";

/** Stable command handles; actual playback state is acknowledged by the owned iframe. */
export function useStaticYouTubeEmbedTelemetry(options: {
  videoSlotRef: RefObject<HTMLDivElement | null>; enabled: boolean; artifactId?: string | null;
  initialSeconds?: number; syncBackgroundPlayback?: boolean; getSavedPlaybackSeconds?: () => number;
  onPersistPlaybackSeconds?: (seconds: number) => void;
  iosAudioHandoff?: { videoId: string | null; title?: string | null };
}) {
  const { videoSlotRef, enabled, artifactId = null, initialSeconds = 0, syncBackgroundPlayback = false } = options;
  const optionsRef = useRef(options); optionsRef.current = options;
  const currentTimeRef = useRef(Math.max(0, initialSeconds));
  const lastTelemetryAtRef = useRef(0);
  const isPlayingRef = useRef(false);
  const intendedPlayingRef = useRef(false);
  const lastAppPauseAtRef = useRef(0);
  const resumeOnVisibleRef = useRef(false);
  const generation = useRef(0);
  const timers = useRef<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const clearRecovery = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  }, []);
  const runCommand = useCallback((func: YouTubeEmbedCommand, args: number[] = []) => {
    postYouTubeEmbedCommand(getStaticYouTubeEmbedIframe(videoSlotRef.current), func, args);
  }, [videoSlotRef]);
  const requestCurrentTime = useCallback(() => {
    const frame = getStaticYouTubeEmbedIframe(videoSlotRef.current);
    if (!frame?.contentWindow) return;
    sendYouTubeFrameMessage(frame, { event: "command", func: "getCurrentTime", args: [] });
  }, [videoSlotRef]);
  const isTelemetryFresh = useCallback((maxAgeMs = 2500) => lastTelemetryAtRef.current > 0 && Date.now() - lastTelemetryAtRef.current <= maxAgeMs, []);
  const playVideo = useCallback(() => {
    intendedPlayingRef.current = true;
    lastAppPauseAtRef.current = 0;
    runCommand("playVideo");
  }, [runCommand]);
  const pauseVideo = useCallback((opts?: { clearIntent?: boolean }) => {
    lastAppPauseAtRef.current = Date.now();
    if (opts?.clearIntent !== false) {
      intendedPlayingRef.current = false;
      resumeOnVisibleRef.current = false;
    }
    clearRecovery();
    isPlayingRef.current = false; setIsPlaying(false);
    runCommand("pauseVideo");
  }, [clearRecovery, runCommand]);
  const togglePlayback = useCallback(() => {
    if (isPlayingRef.current || intendedPlayingRef.current) pauseVideo(); else playVideo();
  }, [pauseVideo, playVideo]);
  const muteVideo = useCallback(() => runCommand("mute"), [runCommand]);
  const unMuteVideo = useCallback(() => runCommand("unMute"), [runCommand]);
  const seekTo = useCallback((seconds: number, allowSeekAhead = true) => {
    if (!Number.isFinite(seconds)) return;
    currentTimeRef.current = Math.max(0, seconds);
    // A requested seek is not fresh telemetry. Resume logic retains its explicit target.
    lastTelemetryAtRef.current = 0;
    runCommand("seekTo", [Math.round(currentTimeRef.current), allowSeekAhead ? 1 : 0]);
  }, [runCommand]);
  const resumeAfterLayoutReposition = useCallback(() => {
    clearRecovery();
    const attempt = () => {
      if (!document.hidden && intendedPlayingRef.current && !isPlayingRef.current) runCommand("playVideo");
    };
    attempt();
    for (const delay of [150, 400, 800, 1500]) timers.current.push(window.setTimeout(attempt, delay));
  }, [clearRecovery, runCommand]);
  // Kept for callers on older routes; never play/pause just to manufacture a poster frame.
  const primeToPausedFrame = useCallback((seconds: number) => seekTo(seconds, true), [seekTo]);

  useEffect(() => {
    generation.current++;
    clearRecovery();
    currentTimeRef.current = Math.max(0, initialSeconds);
    lastTelemetryAtRef.current = 0;
    intendedPlayingRef.current = false; resumeOnVisibleRef.current = false;
    isPlayingRef.current = false; setIsPlaying(false);
    return () => { generation.current++; clearRecovery(); };
  }, [artifactId, initialSeconds, clearRecovery]);

  useEffect(() => {
    if (!enabled) return;
    const onMessage = (event: MessageEvent) => {
      const frame = getStaticYouTubeEmbedIframe(videoSlotRef.current);
      if (!isMessageFromYouTubeFrame(event, frame)) return;
      const msg = parseYouTubeEmbedMessage(event.data);
      if (!msg?.event) return;
      if (msg.event === "onAutoplayBlocked" || msg.event === "onError") {
        clearRecovery(); intendedPlayingRef.current = false;
        isPlayingRef.current = false; setIsPlaying(false); return;
      }
      let state: number | undefined;
      if (msg.event === "onStateChange" && typeof msg.info === "number") state = msg.info;
      if (msg.event === "infoDelivery" && msg.info && typeof msg.info === "object") {
        const seconds = currentTimeFromEmbedInfo(msg.info);
        if (typeof seconds === "number" && Number.isFinite(seconds)) {
          currentTimeRef.current = Math.max(0, seconds); lastTelemetryAtRef.current = Date.now();
        }
        if (typeof msg.info.playerState === "number") state = msg.info.playerState;
      }
      if (state == null) return;
      const playing = embedStateIsPlaying(state);
      const sincePause = Date.now() - lastAppPauseAtRef.current;
      if (playing && !shouldAcceptEmbedPlayingTelemetry(sincePause)) return;
      isPlayingRef.current = playing; setIsPlaying(playing);
      if (state === YT_EMBED_STATE.PLAYING) intendedPlayingRef.current = true;
      if (state === YT_EMBED_STATE.ENDED || (state === YT_EMBED_STATE.PAUSED && sincePause >= EMBED_APP_PAUSE_GRACE_MS)) {
        intendedPlayingRef.current = false; resumeOnVisibleRef.current = false; clearRecovery();
      }
    };
    const listen = () => {
      const frame = getStaticYouTubeEmbedIframe(videoSlotRef.current);
      if (frame?.contentWindow) sendYouTubeFrameMessage(frame, { event: "listening", id: 1, channel: "widget" });
    };
    window.addEventListener("message", onMessage);
    listen(); requestCurrentTime();
    const listener = window.setInterval(listen, 2000);
    const poll = window.setInterval(() => { if (!document.hidden) requestCurrentTime(); }, 250);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(listener); window.clearInterval(poll); clearRecovery();
    };
  }, [enabled, videoSlotRef, requestCurrentTime, clearRecovery]);

  useEffect(() => {
    if (!enabled || !syncBackgroundPlayback) return;
    let disposed = false;
    const resume = (wanted: boolean, confirmedAudioSeconds?: number) => {
      if (youtubeDocumentPipActiveRef.current) return;
      const ownGeneration = generation.current;
      requestCurrentTime();
      timers.current.push(window.setTimeout(() => {
        if (disposed || generation.current !== ownGeneration || document.hidden) return;
        const live = currentTimeRef.current;
        const fresh = isTelemetryFresh(800);
        const saved = optionsRef.current.getSavedPlaybackSeconds?.() ?? live;
        const seconds = Math.max(0, confirmedAudioSeconds ?? (fresh ? live : saved));
        currentTimeRef.current = seconds;
        optionsRef.current.onPersistPlaybackSeconds?.(seconds);
        if (embedNeedsResumeSeek(live, seconds, fresh, wanted)) seekTo(seconds, true);
        if (wanted && intendedPlayingRef.current && !isPlayingRef.current) playVideo();
        if (artifactId) clearBackgroundPlaybackHandoff(artifactId);
      }, 250));
    };
    const visible = () => {
      if (youtubeDocumentPipActiveRef.current) return;
      if (document.hidden) {
        clearRecovery();
        resumeOnVisibleRef.current = isPlayingRef.current;
        const seconds = currentTimeRef.current;
        optionsRef.current.onPersistPlaybackSeconds?.(seconds);
        if (artifactId) writeBackgroundPlaybackHandoff(artifactId, { hiddenAtMs: Date.now(), secondsAtHide: seconds, wasPlaying: isPlayingRef.current });
        const handoff = optionsRef.current.iosAudioHandoff;
        if (isIphoneWebKit() && handoff?.videoId && isPlayingRef.current) {
          const ownGeneration = generation.current;
          pauseVideo({ clearIntent: false });
          void startIosYouTubeBackgroundAudio({ videoId: handoff.videoId, title: handoff.title, startSeconds: seconds }).then(ok => {
            if (disposed || generation.current !== ownGeneration) return;
            if (!document.hidden) {
              if (ok) { const audio = stopIosYouTubeBackgroundAudio(); resume(audio.wasPlaying, audio.seconds); }
              return;
            }
            if (!ok) {
              resumeOnVisibleRef.current = false; intendedPlayingRef.current = false;
              toast({ title: "Background audio unavailable", description: "Playback paused. Tap play to continue from your saved position." });
            }
          }).catch(() => { if (!disposed) resumeOnVisibleRef.current = false; });
        }
      } else {
        if (isIosYouTubeBackgroundAudioActive()) {
          const audio = stopIosYouTubeBackgroundAudio(); resume(audio.wasPlaying, audio.seconds);
        } else resume(resumeOnVisibleRef.current);
        resumeOnVisibleRef.current = false;
      }
    };
    const pageShow = (event: PageTransitionEvent) => { if (event.persisted) visible(); };
    document.addEventListener("visibilitychange", visible); window.addEventListener("pageshow", pageShow);
    return () => {
      disposed = true; clearRecovery();
      document.removeEventListener("visibilitychange", visible); window.removeEventListener("pageshow", pageShow);
    };
  }, [artifactId, enabled, syncBackgroundPlayback, clearRecovery, requestCurrentTime, isTelemetryFresh, seekTo, playVideo, pauseVideo]);

  const getCurrentTime = useCallback(() => currentTimeRef.current, []);
  const getIsPlaying = useCallback(() => isPlayingRef.current, []);
  const getWantsContinuousPlayback = useCallback(() => isPlayingRef.current || intendedPlayingRef.current, []);
  return useMemo(() => ({ getCurrentTime, getIsPlaying, getWantsContinuousPlayback, isPlaying,
    playVideo, pauseVideo, togglePlayback, muteVideo, unMuteVideo, seekTo, primeToPausedFrame,
    requestCurrentTime, isTelemetryFresh, resumeAfterLayoutReposition, currentTimeRef, isPlayingRef, intendedPlayingRef }),
  [getCurrentTime, getIsPlaying, getWantsContinuousPlayback, isPlaying, playVideo, pauseVideo, togglePlayback,
    muteVideo, unMuteVideo, seekTo, primeToPausedFrame, requestCurrentTime, isTelemetryFresh, resumeAfterLayoutReposition]);
}
