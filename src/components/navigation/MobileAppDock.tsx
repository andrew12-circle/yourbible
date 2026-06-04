import { BookOpen, FileText, Home, Menu, NotebookPen } from "lucide-react";
import { ARTIFACT_MOBILE_DOCK_H } from "@/lib/framework/artifactLayoutCss";
import FloatingTabBar, { type FloatingTabItem } from "@/components/navigation/FloatingTabBar";

type Props = {
  className?: string;
  layoutRootSelector?: string;
  activeTab?: "study" | "transcript" | "notes" | "journal";
  onStudyClick?: () => void;
  onTranscriptClick?: () => void;
  journalActive?: boolean;
  onJournalClick?: () => void;
  onMenuClick?: () => void;
  onHomeClick?: () => void;
};

export default function MobileAppDock({
  className,
  layoutRootSelector = "[data-artifact-youtube-mobile]",
  activeTab = "study",
  onStudyClick,
  onTranscriptClick,
  journalActive = false,
  onJournalClick,
  onMenuClick,
  onHomeClick,
}: Props) {
  const items: FloatingTabItem[] = [
    { id: "study", label: "Study", icon: BookOpen, active: activeTab === "study", onClick: onStudyClick },
    { id: "transcript", label: "Transcript", icon: FileText, active: activeTab === "transcript", onClick: onTranscriptClick },
    {
      id: "journal",
      label: "Journal",
      icon: NotebookPen,
      active: journalActive ?? activeTab === "journal",
      onClick: onJournalClick,
    },
    { id: "more", label: "More", icon: Menu, onClick: onMenuClick },
    { id: "home", label: "Home", icon: Home, onClick: onHomeClick },
  ];

  return (
    <FloatingTabBar
      items={items}
      tone="surface"
      className={className}
      layoutRootSelector={layoutRootSelector}
      layoutHeightVar="--artifact-mobile-dock-h"
      layoutHeightFallbackPx={ARTIFACT_MOBILE_DOCK_H}
    />
  );
}
