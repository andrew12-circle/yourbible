import { useLocation } from "react-router-dom";
import { ChevronRight, NotebookPen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import FloatingJournalPanel from "@/components/journal/FloatingJournalPanel";
import { floatingJournalPlaybackRef } from "@/lib/journal/floatingJournalPlaybackRef";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";
import { cn } from "@/lib/utils";

function journalLauncherHidden(pathname: string) {
  return (
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
  if (hidden) return null;

  const getPlaybackSeconds =
    routeArtifact?.kind === "youtube" && playbackCaptureAvailable
      ? () => floatingJournalPlaybackRef.current?.() ?? null
      : undefined;

  const panelKey = routeArtifact?.id ?? "__global__";

  return (
    <>
      <div
        className={cn(
          "fixed left-0 z-[45] flex -translate-y-1/2 flex-col items-stretch shadow-md transition-[width] duration-200 ease-out",
          "top-[40vh] rounded-r-lg border border-l-0 border-primary/25 bg-primary text-primary-foreground",
          launcherTucked ? "w-1 overflow-hidden" : "w-[10px] hover:w-9 group/journaltab",
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {launcherTucked ? (
          <button
            type="button"
            aria-label="Show journal tab"
            title="Show journal tab"
            onClick={() => setLauncherTucked(false)}
            className="flex min-h-[88px] w-full items-center justify-center py-2 text-primary-foreground/90 hover:text-primary-foreground"
          >
            <ChevronRight className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            aria-label={panelOpen ? "Close mini journal" : "Open mini journal"}
            title="Journal"
            onClick={() => togglePanel()}
            className={cn(
              "flex min-h-[88px] w-full flex-col items-center justify-center gap-0.5 py-2",
              "text-primary-foreground hover:bg-white/10",
            )}
          >
            <NotebookPen
              className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover/journaltab:scale-110"
              aria-hidden
            />
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
          onClose={() => setPanelOpen(false)}
        />
      )}
    </>
  );
}
