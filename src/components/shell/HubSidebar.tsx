import { Link, useLocation } from "react-router-dom";
import {
  BookOpen, Sun, NotebookPen, Brain, Sprout, Network, FileStack, Share2, Sparkles,
  GraduationCap, Mail, ListTodo, CheckSquare, Moon, Calendar, MessageCircleHeart,
  HeartHandshake, Settings, LayoutGrid, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBibleRoute } from "@/lib/home/homeApps";
import { useHomeDashboard } from "@/contexts/HomeDashboardContext";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const iconColorMap: Record<string, string> = {
  Overview: "text-blue-500",
  Bible: "text-amber-600",
  Daily: "text-orange-500",
  Journal: "text-violet-500",
  Framework: "text-indigo-500",
  Journey: "text-emerald-500",
  Beliefs: "text-sky-500",
  Artifacts: "text-rose-500",
  Graph: "text-cyan-500",
  Tensions: "text-fuchsia-500",
  Study: "text-blue-400",
  Digest: "text-slate-500",
  Tasks: "text-teal-500",
  Habits: "text-green-500",
  Sleep: "text-indigo-400",
  "Life weeks": "text-amber-500",
  "My AI": "text-pink-500",
  Partner: "text-red-400",
  Settings: "text-gray-500",
  "Research later": "text-slate-400",
};

interface SidebarItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  badge?: number;
}

const sidebarGroups: { label: string; items: SidebarItem[] }[] = [
  {
    label: "",
    items: [
      { title: "Overview", icon: LayoutGrid, to: "/home" },
      { title: "Bible", icon: BookOpen, to: "__bible__" },
      { title: "Daily", icon: Sun, to: "/framework/daily" },
      { title: "Journal", icon: NotebookPen, to: "/journal" },
    ],
  },
  {
    label: "Framework",
    items: [
      { title: "Framework", icon: Brain, to: "/framework" },
      { title: "Journey", icon: Sprout, to: "/framework/journey" },
      { title: "Beliefs", icon: Network, to: "/framework/beliefs" },
      { title: "Artifacts", icon: FileStack, to: "/framework/artifacts" },
      { title: "Graph", icon: Share2, to: "/framework/graph" },
      { title: "Tensions", icon: Sparkles, to: "/framework/tensions" },
      { title: "Study", icon: GraduationCap, to: "/framework/study" },
      { title: "Digest", icon: Mail, to: "/framework/digest" },
      { title: "Research later", icon: Clock, to: "/framework/research-later" },
    ],
  },
  {
    label: "Life",
    items: [
      { title: "Tasks", icon: ListTodo, to: "/life/todos" },
      { title: "Habits", icon: CheckSquare, to: "/life/habits" },
      { title: "Sleep", icon: Moon, to: "/sleep" },
      { title: "Life weeks", icon: Calendar, to: "/life-weeks" },
    ],
  },
  {
    label: "More",
    items: [
      { title: "My AI", icon: MessageCircleHeart, to: "/my-ai" },
      { title: "Partner", icon: HeartHandshake, to: "/partner" },
      { title: "Settings", icon: Settings, to: "/settings" },
    ],
  },
];

function NavItem({ item, isActive }: { item: SidebarItem; isActive: boolean }) {
  const Icon = item.icon;
  const color = iconColorMap[item.title] ?? "text-muted-foreground";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link to={item.to}>
          <Icon className={cn("h-4 w-4", color)} />
          <span>{item.title}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function HubSidebar() {
  const { pathname } = useLocation();
  const { counts } = useHomeDashboard();
  const bibleTo = getBibleRoute();
  const promptBadge = !counts.journalToday ? 1 : undefined;

  const badgeMap: Record<string, number | undefined> = {
    Journal: promptBadge,
    Beliefs: counts.beliefs || undefined,
    Artifacts: counts.artifacts || undefined,
    Tensions: counts.tensions || undefined,
    "My AI": counts.chats || undefined,
  };

  return (
    <Sidebar collapsible="offcanvas" variant="floating">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 px-1">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            YB
          </div>
          <div>
            <div className="text-sm font-semibold">Your Bible</div>
            <div className="text-[10px] text-muted-foreground">Command center</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {sidebarGroups.map((group, gi) => (
          <SidebarGroup key={gi}>
            {group.label && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/40">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const to = item.to === "__bible__" ? bibleTo : item.to;
                  const navItem = { ...item, to };
                  const isActive =
                    to === "/home"
                      ? pathname === "/home"
                      : pathname === to || (to !== "/home" && pathname.startsWith(to + "/"));
                  const withBadge = { ...navItem, badge: badgeMap[item.title] };
                  return <NavItem key={item.title} item={withBadge} isActive={isActive} />;
                })}
              </SidebarMenu>
            </SidebarGroupContent>
            {gi < sidebarGroups.length - 1 && <SidebarSeparator className="my-1" />}
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="px-2 pb-3">
        <p className="text-[10px] text-muted-foreground px-2 text-center">
          Desktop command center
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
