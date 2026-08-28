import { useCallback, useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { ChevronDown, Film, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  listPendingNativeJournalVideoCaptures,
  NATIVE_JOURNAL_VIDEO_PENDING_CHANGED_EVENT,
  nativeJournalVideoCaptureSupported,
  nativeJournalVideoRecoveryHref,
  type NativeJournalVideoCaptureSnapshot,
} from "@/lib/native/journalVideoNative";

function updatedAt(capture: NativeJournalVideoCaptureSnapshot): number {
  const parsed = Date.parse(capture.updatedAt ?? capture.createdAt ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Persistent, non-destructive entry point for recordings retained by AVFoundation. */
export function NativeJournalVideoRecoveryBanner() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [capture, setCapture] = useState<NativeJournalVideoCaptureSnapshot | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [tucked, setTucked] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id || !nativeJournalVideoCaptureSupported()) {
      setCapture(null);
      setPendingCount(0);
      return;
    }
    try {
      const owned = (await listPendingNativeJournalVideoCaptures())
        .filter((item) => item.userId === user.id && !item.isActiveSession)
        .sort((a, b) => updatedAt(b) - updatedAt(a));
      setCapture(
        owned.find((item) => nativeJournalVideoRecoveryHref(item, user.id) != null) ?? null,
      );
      setPendingCount(owned.length);
    } catch (error) {
      console.warn("[journal-video] could not inspect native recovery drafts", error);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const onChanged = () => void refresh();
    window.addEventListener(NATIVE_JOURNAL_VIDEO_PENDING_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(NATIVE_JOURNAL_VIDEO_PENDING_CHANGED_EVENT, onChanged);
  }, [refresh]);

  useEffect(() => {
    setTucked(false);
  }, [capture?.sessionId]);

  useEffect(() => {
    if (!nativeJournalVideoCaptureSupported()) return;
    let handle: PluginListenerHandle | undefined;
    let disposed = false;
    void CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void refresh();
    }).then((registered) => {
      if (disposed) {
        void registered.remove();
        return;
      }
      handle = registered;
    });
    return () => {
      disposed = true;
      void handle?.remove();
    };
  }, [refresh]);

  if (!capture || !user?.id) return null;
  const recoveryHref = nativeJournalVideoRecoveryHref(capture, user.id);
  const readyToReview = capture.state === "pendingHandoff";

  if (tucked) {
    return (
      <button
        type="button"
        className="fixed bottom-[calc(var(--safe-area-inset-bottom)+5.5rem)] right-[max(0.75rem,env(safe-area-inset-right))] z-[47] flex h-11 min-w-11 items-center justify-center rounded-full border border-amber-200/80 bg-background/95 px-3 text-amber-700 shadow-lg backdrop-blur-xl dark:text-amber-200"
        onClick={() => setTucked(false)}
        aria-label={`Open ${pendingCount === 1 ? "saved recording" : `${pendingCount} saved recordings`}`}
      >
        <Film className="h-5 w-5" aria-hidden />
        {pendingCount > 1 ? <span className="ml-1 text-xs font-bold">{pendingCount}</span> : null}
      </button>
    );
  }

  return (
    <aside className="fixed left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] top-[calc(var(--safe-area-inset-top)+0.5rem)] z-[47] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-amber-200/80 bg-background/95 p-3 shadow-xl backdrop-blur-xl">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/45 dark:text-amber-200">
        {readyToReview ? <ShieldCheck className="h-5 w-5" /> : <Film className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {readyToReview ? "Your video is safe" : "Resume your saved recording"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {pendingCount > 1 ? `${pendingCount} recordings saved on this iPhone` : "Saved on this iPhone"}
        </p>
      </div>
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        onClick={() => setTucked(true)}
        aria-label="Keep recording safe and tuck this reminder"
      >
        <ChevronDown className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        className="h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
        onClick={() => navigate(recoveryHref ?? "/journal")}
      >
        {readyToReview && recoveryHref ? "Review" : "Open"}
      </button>
    </aside>
  );
}
