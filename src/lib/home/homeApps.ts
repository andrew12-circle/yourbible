import {
  BookOpen, ListTodo, CheckSquare, MessageCircleHeart,
  Sun, GraduationCap, Sparkles, Mail, Moon, Settings, NotebookPen, Brain,
  Youtube, HeartHandshake, Sprout, ClipboardList, FileStack, Clock, Share2, Network, Users, CircleHelp,
  type LucideIcon,
} from "lucide-react";
import { IOS_APP_BG } from "@/lib/home/iosAppPalette";
import { openYouTubeAppOrWeb } from "@/lib/home/openYouTubeAppOrWeb";

export const LAST_READ_KEY = "yb_last_read";

export type HomeAppIcon = {
  label: string;
  to?: string;
  onOpen?: () => void;
  icon?: LucideIcon;
  imageSrc?: string;
  color: string;
  iconColor?: string;
  badge?: string | number;
  ariaLabel?: string;
};

export type HomeDashboardCounts = {
  beliefs: number;
  tensions: number;
  chats: number;
  artifacts: number;
  journalToday: number;
};

export function getBibleRoute(): string {
  const lastRead = typeof window !== "undefined" ? localStorage.getItem(LAST_READ_KEY) : null;
  return lastRead ? `/read/${lastRead}` : "/read/Jhn/1";
}

export function buildHomeApps(counts: HomeDashboardCounts): HomeAppIcon[] {
  const bibleTo = getBibleRoute();
  const lastRead = typeof window !== "undefined" ? localStorage.getItem(LAST_READ_KEY) : null;
  const promptBadge = !counts.journalToday ? 1 : undefined;

  return [
    { label: "Bible", to: bibleTo, icon: BookOpen, color: IOS_APP_BG.bible, badge: lastRead?.replace("/", " ") },
    { label: "Daily", to: "/framework/daily", icon: Sun, color: IOS_APP_BG.daily },
    { label: "Framework", to: "/framework", icon: Brain, color: IOS_APP_BG.framework },
    { label: "Journey", to: "/framework/journey", icon: Sprout, color: IOS_APP_BG.journey },
    { label: "Playbook", to: "/framework/playbook", icon: ClipboardList, color: IOS_APP_BG.playbook },
    { label: "Artifacts", to: "/framework/artifacts", icon: FileStack, color: IOS_APP_BG.artifacts, badge: counts.artifacts || undefined },
    { label: "Research later", to: "/framework/research-later", icon: Clock, color: IOS_APP_BG.research, ariaLabel: "Research later" },
    { label: "Hard questions", to: "/framework/hard-questions", icon: CircleHelp, color: IOS_APP_BG.study, ariaLabel: "Hard questions research" },
    { label: "Graph", to: "/framework/graph", icon: Share2, color: IOS_APP_BG.graph },
    { label: "Beliefs", to: "/framework/beliefs", icon: Network, color: IOS_APP_BG.beliefs, badge: counts.beliefs || undefined },
    { label: "Influences", to: "/framework/influences", icon: Users, color: IOS_APP_BG.influences },
    { label: "Journal", to: "/journal", icon: NotebookPen, color: IOS_APP_BG.journal, badge: promptBadge },
    {
      label: "Walking together",
      to: "/partner",
      icon: HeartHandshake,
      color: IOS_APP_BG.partner,
      ariaLabel: "Walking together with a partner",
    },
    { label: "Tensions", to: "/framework/tensions", icon: Sparkles, color: IOS_APP_BG.tensions, badge: counts.tensions || undefined },
    { label: "Study", to: "/framework/study", icon: GraduationCap, color: IOS_APP_BG.study },
    { label: "Digest", to: "/framework/digest", icon: Mail, color: IOS_APP_BG.digest },
    { label: "Tasks", to: "/life/todos", icon: ListTodo, color: IOS_APP_BG.tasks },
    { label: "Habits", to: "/life/habits", icon: CheckSquare, color: IOS_APP_BG.habits },
    { label: "Sleep", to: "/sleep", icon: Moon, color: IOS_APP_BG.sleep },
    { label: "YouTube", onOpen: openYouTubeAppOrWeb, icon: Youtube, color: IOS_APP_BG.youtube, ariaLabel: "Open YouTube" },
    {
      label: "My AI",
      to: "/my-ai",
      icon: MessageCircleHeart,
      color: IOS_APP_BG.myAi,
      ariaLabel: "Open My AI — framework-grounded chat",
      badge: counts.chats || undefined,
    },
    { label: "Settings", to: "/settings", icon: Settings, color: IOS_APP_BG.settings },
  ];
}
