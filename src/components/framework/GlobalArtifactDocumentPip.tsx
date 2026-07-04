import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useArtifactPlaybackPersistence } from "@/hooks/useArtifactPlaybackPersistence";
import {
  getGlobalDocumentPipSessionRef,
  registerDocumentPipActivateHandler,
  syncInlineFromDocumentPip,
  useArtifactGlobalDocumentPipStore,
} from "@/lib/framework/artifactGlobalDocumentPipStore";
import { markArtifactInlineVideoResume } from "@/lib/framework/artifactPlaybackProgress";
import { isArtifactDetailPath } from "@/pages/framework/FrameworkLayout";
import { closeYouTubeDocumentPip } from "@/lib/youtube/documentPictureInPicture";

export default function GlobalArtifactDocumentPip() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const session = useArtifactGlobalDocumentPipStore((s) => s.session);
  const active = useArtifactGlobalDocumentPipStore((s) => s.active);
  const clear = useArtifactGlobalDocumentPipStore((s) => s.clear);

  const { persistSeconds } = useArtifactPlaybackPersistence(session?.artifactId);

  const activateToArtifact = useCallback(() => {
    const current = useArtifactGlobalDocumentPipStore.getState().session;
    if (!current) return;
    window.focus();
    const artifactPath = `/framework/artifacts/${current.artifactId}`;
    if (pathname !== artifactPath) {
      navigate(`${artifactPath}#video`);
    } else {
      document.getElementById("video")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [navigate, pathname]);

  useEffect(() => {
    registerDocumentPipActivateHandler(activateToArtifact);
    return () => registerDocumentPipActivateHandler(null);
  }, [activateToArtifact]);

  useEffect(() => {
    if (!active || !session) return;
    const tick = window.setInterval(() => {
      const { seconds } = useArtifactGlobalDocumentPipStore.getState().popoutPlayback;
      if (seconds > 0) persistSeconds(seconds);
    }, 2000);
    return () => window.clearInterval(tick);
  }, [active, persistSeconds, session]);

  const restoreInline = useCallback(() => {
    const state = useArtifactGlobalDocumentPipStore.getState();
    if (!state.session) return;

    const playback = state.popoutPlayback;
    persistSeconds(playback.seconds);
    syncInlineFromDocumentPip(playback.playing, playback);
    markArtifactInlineVideoResume(state.session.artifactId);

    const docSession = getGlobalDocumentPipSessionRef().current;
    closeYouTubeDocumentPip(docSession);
    getGlobalDocumentPipSessionRef().current = null;
    clear();

    navigate(`/framework/artifacts/${state.session.artifactId}#video`);
  }, [clear, navigate, persistSeconds]);

  if (!active || !session || typeof document === "undefined") return null;

  const onDetail = isArtifactDetailPath(pathname);
  const title = session.title?.trim() || "Video";

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[92] flex max-w-[min(100vw-2rem,28rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-black/85 px-4 py-2 text-sm text-white shadow-lg ring-1 ring-white/15"
      role="status"
      aria-live="polite"
    >
      <span className="truncate">
        Desktop PiP · {title}
        {onDetail ? "" : " · tap window to open artifact"}
      </span>
      <button
        type="button"
        className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-medium hover:bg-white/25"
        onClick={restoreInline}
      >
        Restore
      </button>
    </div>
  );
}
