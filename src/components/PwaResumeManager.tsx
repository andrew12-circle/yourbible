import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  buildPwaResumeUrl,
  createPwaResumeSnapshot,
  isPwaResumeLaunchUrl,
  isStandalonePwa,
  readPwaResumeSnapshot,
  savePwaResumeSnapshot,
  type PwaResumeSnapshot,
} from "@/lib/pwaResume";

const RESTORE_SCROLL_ATTEMPTS = 12;

export function PwaResumeManager() {
  const location = useLocation();
  const navigate = useNavigate();
  const didCheckInitialResumeRef = useRef(false);
  const pendingScrollRestoreRef = useRef<PwaResumeSnapshot | null>(null);
  const locationUrl = useMemo(
    () => buildPwaResumeUrl(location.pathname, location.search, location.hash),
    [location.hash, location.pathname, location.search],
  );

  const persistCurrentSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !isStandalonePwa(window)) return;
    const storage = getPwaResumeStorage();
    if (!storage) return;

    savePwaResumeSnapshot(
      storage,
      createPwaResumeSnapshot(locationUrl, window.scrollX, window.scrollY),
    );
  }, [locationUrl]);

  useEffect(() => {
    if (didCheckInitialResumeRef.current) return;
    didCheckInitialResumeRef.current = true;
    if (typeof window === "undefined" || !isStandalonePwa(window)) return;
    if (!isPwaResumeLaunchUrl(location.pathname, location.search, location.hash)) return;

    const storage = getPwaResumeStorage();
    if (!storage) return;

    const snapshot = readPwaResumeSnapshot(storage);
    if (!snapshot || snapshot.url === locationUrl) return;

    pendingScrollRestoreRef.current = snapshot;
    navigate(snapshot.url, { replace: true });
  }, [location.hash, location.pathname, location.search, locationUrl, navigate]);

  useEffect(() => {
    const pendingSnapshot = pendingScrollRestoreRef.current;
    if (!pendingSnapshot || pendingSnapshot.url !== locationUrl || typeof window === "undefined") return;

    let attempts = 0;
    let frameId = 0;

    const restoreScroll = () => {
      attempts += 1;
      window.scrollTo(pendingSnapshot.scrollX, pendingSnapshot.scrollY);

      if (attempts >= RESTORE_SCROLL_ATTEMPTS) {
        pendingScrollRestoreRef.current = null;
        persistCurrentSnapshot();
        return;
      }

      frameId = window.requestAnimationFrame(restoreScroll);
    };

    frameId = window.requestAnimationFrame(restoreScroll);
    return () => window.cancelAnimationFrame(frameId);
  }, [locationUrl, persistCurrentSnapshot]);

  useEffect(() => {
    if (typeof window === "undefined" || !isStandalonePwa(window)) return;
    if (pendingScrollRestoreRef.current?.url === locationUrl) return;

    persistCurrentSnapshot();

    let frameId: number | null = null;
    const flushSnapshot = () => {
      if (frameId != null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      persistCurrentSnapshot();
    };
    const scheduleSnapshot = () => {
      if (frameId != null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        persistCurrentSnapshot();
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushSnapshot();
    };

    window.addEventListener("scroll", scheduleSnapshot, { passive: true });
    window.addEventListener("pagehide", flushSnapshot);
    window.addEventListener("beforeunload", flushSnapshot);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (frameId != null) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", scheduleSnapshot);
      window.removeEventListener("pagehide", flushSnapshot);
      window.removeEventListener("beforeunload", flushSnapshot);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [locationUrl, persistCurrentSnapshot]);

  return null;
}

function getPwaResumeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
