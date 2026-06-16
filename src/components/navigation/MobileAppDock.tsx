import { BookOpen, FileText, Home, Menu, NotebookPen, type LucideIcon } from "lucide-react";
import { ARTIFACT_MOBILE_DOCK_H } from "@/lib/framework/artifactLayoutCss";
import FloatingTabBar, { type FloatingTabItem } from "@/components/navigation/FloatingTabBar";

type Props = {
  className?: string;
  anchor?: "viewport" | "pane";
  layoutRootSelector?: string;
  /** `minimal` — Study + More only; other views live in the menu sheet. */
  variant?: "full" | "minimal";
  activeTab?: "study" | "transcript" | "notes" | "journal";
  onStudyClick?: () => void;
  onTranscriptClick?: () => void;
  /** Defaults to Transcript / FileText (video). Use Reader / ScrollText for books. */
  secondaryTabLabel?: string;
  secondaryTabIcon?: LucideIcon;
  journalActive?: boolean;
  onJournalClick?: () => void;
  onMenuClick?: () => void;
  onHomeClick?: () => void;
};

export default function MobileAppDock({
  className,
  anchor = "viewport",
  layoutRootSelector = "[data-artifact-youtube-mobile]",
  variant = "full",
  activeTab = "study",
  onStudyClick,
  onTranscriptClick,
  secondaryTabLabel = "Transcript",
  secondaryTabIcon: SecondaryTabIcon = FileText,
  journalActive = false,
  onJournalClick,
  onMenuClick,
  onHomeClick,
}: Props) {
  const items: FloatingTabItem[] =
    variant === "minimal"
      ? [
          { id: "study", label: "Study", icon: BookOpen, active: activeTab === "study", onClick: onStudyClick },
          { id: "more", label: "More", icon: Menu, onClick: onMenuClick },
        ]
      : [
          { id: "study", label: "Study", icon: BookOpen, active: activeTab === "study", onClick: onStudyClick },
          {
            id: "transcript",
            label: secondaryTabLabel,
            icon: SecondaryTabIcon,
            active: activeTab === "transcript",
            onClick: onTranscriptClick,
          },
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
      anchor={anchor}
      className={className}
      layoutRootSelector={layoutRootSelector}
      layoutHeightVar="--artifact-mobile-dock-h"
      layoutHeightFallbackPx={ARTIFACT_MOBILE_DOCK_H}
    />
  );
}
