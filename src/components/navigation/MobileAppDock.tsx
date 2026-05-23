import { useLayoutEffect, useRef } from "react";
import { BookOpen, FileText, Menu, NotebookPen } from "lucide-react";
import { ARTIFACT_MOBILE_DOCK_H } from "@/lib/framework/artifactLayoutCss";
import { cn } from "@/lib/utils";

type DockItemProps = {
  label: string;
  icon: typeof BookOpen;
  active?: boolean;
  onClick?: () => void;
};

type Props = {
  className?: string;
  layoutRootSelector?: string;
  activeTab?: "study" | "transcript" | "notes";
  onStudyClick?: () => void;
  onTranscriptClick?: () => void;
  journalActive?: boolean;
  onJournalClick?: () => void;
  onMenuClick?: () => void;
};

function DockItem({ label, icon: Icon, active = false, onClick }: DockItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-1.5 text-[10px] font-medium transition",
        active
          ? "bg-muted text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function MobileAppDock({
  className,
  layoutRootSelector = "[data-artifact-youtube-mobile]",
  activeTab = "study",
  onStudyClick,
  onTranscriptClick,
  journalActive = false,
  onJournalClick,
  onMenuClick,
}: Props) {
  const dockRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const dock = dockRef.current;
    const root = dock?.closest(layoutRootSelector) as HTMLElement | null;
    if (!dock || !root) return;
    const sync = () => {
      const h = dock.getBoundingClientRect().height;
      root.style.setProperty("--artifact-mobile-dock-h", `${Math.max(0, Math.ceil(h))}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(dock);
    root.style.setProperty("--artifact-mobile-dock-h", ARTIFACT_MOBILE_DOCK_H);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--artifact-mobile-dock-h");
    };
  }, [layoutRootSelector]);

  return (
    <nav
      ref={dockRef}
      aria-label="App"
      className={cn(
        "fixed inset-x-0 bottom-0 z-[45] flex justify-center px-4",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-md items-center justify-between gap-0.5",
          "rounded-full border border-border/50 bg-background/95 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
          "backdrop-blur-md supports-[backdrop-filter]:bg-background/85",
        )}
      >
        <DockItem label="Study" icon={BookOpen} active={activeTab === "study"} onClick={onStudyClick} />
        <DockItem label="Transcript" icon={FileText} active={activeTab === "transcript"} onClick={onTranscriptClick} />
        <DockItem
          label="Journal"
          icon={NotebookPen}
          active={journalActive}
          onClick={onJournalClick}
        />
        <DockItem label="More" icon={Menu} onClick={onMenuClick} />
      </div>
    </nav>
  );
}
