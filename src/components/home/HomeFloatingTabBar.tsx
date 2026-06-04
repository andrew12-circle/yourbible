import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Home, Menu, NotebookPen, Sun } from "lucide-react";
import FloatingTabBar, { type FloatingTabItem } from "@/components/navigation/FloatingTabBar";

type Props = {
  bibleTo: string;
  onHome?: () => void;
};

export function HomeFloatingTabBar({ bibleTo, onHome }: Props) {
  const navigate = useNavigate();

  const items = useMemo<FloatingTabItem[]>(
    () => [
      { id: "bible", label: "Bible", icon: BookOpen, onClick: () => navigate(bibleTo) },
      { id: "daily", label: "Daily", icon: Sun, onClick: () => navigate("/framework/daily") },
      { id: "journal", label: "Journal", icon: NotebookPen, onClick: () => navigate("/journal") },
      { id: "more", label: "More", icon: Menu, onClick: () => navigate("/framework") },
      { id: "home", label: "Home", icon: Home, active: true, onClick: onHome },
    ],
    [bibleTo, navigate, onHome],
  );

  return <FloatingTabBar items={items} tone="wallpaper" />;
}
