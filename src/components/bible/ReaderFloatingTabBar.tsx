import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Home, Menu, NotebookPen, Sun } from "lucide-react";
import FloatingTabBar, { type FloatingTabItem } from "@/components/navigation/FloatingTabBar";

/** Default dock height (pill bar + safe area) — synced on `[data-bible-reader]`. */
export const READER_MOBILE_DOCK_H = 96;

type Props = {
  bibleTo: string;
};

export function ReaderFloatingTabBar({ bibleTo }: Props) {
  const navigate = useNavigate();

  const items = useMemo<FloatingTabItem[]>(
    () => [
      { id: "bible", label: "Bible", icon: BookOpen, active: true, onClick: () => navigate(bibleTo) },
      { id: "daily", label: "Daily", icon: Sun, onClick: () => navigate("/framework/daily") },
      { id: "journal", label: "Journal", icon: NotebookPen, onClick: () => navigate("/journal") },
      { id: "more", label: "More", icon: Menu, onClick: () => navigate("/framework") },
      { id: "home", label: "Home", icon: Home, onClick: () => navigate("/home") },
    ],
    [bibleTo, navigate],
  );

  return (
    <FloatingTabBar
      items={items}
      tone="wallpaper"
      layoutRootSelector="[data-bible-reader]"
      layoutHeightVar="--reader-mobile-dock-h"
      layoutHeightFallbackPx={READER_MOBILE_DOCK_H}
    />
  );
}
