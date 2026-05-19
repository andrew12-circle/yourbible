import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, NotebookPen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import FloatingJournalPanel from "@/components/journal/FloatingJournalPanel";
import { floatingJournalPlaybackRef } from "@/lib/journal/floatingJournalPlaybackRef";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";
import { cn } from "@/lib/utils";

function isJournalRoute(pathname: string) {
  return pathname === "/journal" || pathname.startsWith("/journal/");
}

function journalLauncherHidden(pathname: string) {
  return (
    isJournalRoute(pathname) ||
    pathname === "/" ||
    pathname === "/home" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding")
  );
}

export default function GlobalJournalLauncher() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const panelOpen = useFloatingJournalStore((s) => s.panelOpen);
  const togglePanel = useFloatingJournalStore((s) => s.togglePanel);
  const setPanelOpen = useFloatingJournalStore((s) => s.setPanelOpen);
  const launcherTucked = useFloatingJournalStore((s) => s.launcherTucked);
  const setLauncherTucked = useFloatingJournalStore((s) => s.setLauncherTucked);
  const routeArtifact = useFloatingJournalStore((s) => s.routeArtifact);
  const playbackCaptureAvailable = useFloatingJournalStore((s) => s.playbackCaptureAvailable);

  const hidden = !user || journalLauncherHidden(pathname);

  useEffect(() => {
    if (isJournalRoute(pathname) && panelOpen) {
      setPanelOpen(false);
    }
  }, [pathname, panelOpen, setPanelOpen]);

  if (hidden) return null;

  const readerJournal = pathname.startsWith("/read/");

  const getPlaybackSeconds =
    routeArtifact?.kind === "youtube" && playbackCaptureAvailable
      ? () => floatingJournalPlaybackRef.current?.() ?? null
      : undefined;

  const panelKey = routeArtifact?.id ?? "__global__";

  return (
    <>
      <div
        className={cn(
          "fixed right-0 z-[45] flex -translate-y-1/2 flex-col items-stretch transition-[width] duration-200 ease-out",
          "top-1/2 rounded-l-xl border border-r-0 shadow-[-4px_0_14px_-4px_rgba(15,23,42,0.35)]",
          readerJournal
            ? "border-gold/25 bg-navy text-gold-bright"
            : "border-primary/20 bg-primary text-primary-foreground",
          launcherTucked ? "w-1 overflow-hidden" : "w-11",
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {launcherTucked ? (
          <button
            type="button"
            aria-label="Show journal tab"
            title="Show journal tab"
            onClick={() => setLauncherTucked(false)}
            className={cn(
              "flex min-h-[88px] w-full items-center justify-center py-2",
              readerJournal
                ? "text-gold/90 hover:text-gold-bright"
                : "text-primary-foreground/90 hover:text-primary-foreground",
            )}
          >
            <ChevronLeft className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            aria-label={panelOpen ? "Close mini journal" : "Open mini journal"}
            title="Journal"
            onClick={() => togglePanel()}
            className={cn(
              "flex min-h-[88px] w-full flex-col items-center justify-center gap-0.5 py-2",
              readerJournal
                ? "text-gold-bright hover:bg-gold/10 active:bg-gold/15"
                : "text-primary-foreground hover:bg-white/10 active:bg-white/15",
            )}
          >
            <NotebookPen className="h-5 w-5 shrink-0" aria-hidden />
          </button>
        )}
      </div>

      {panelOpen && (
        <FloatingJournalPanel
          key={panelKey}
          userId={user.id}
          artifactId={routeArtifact?.id}
          artifactTitle={routeArtifact?.title}
          artifactKind={routeArtifact?.kind}
          getPlaybackSeconds={getPlaybackSeconds}
          readerTheme={readerJournal}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </>
  );
}
