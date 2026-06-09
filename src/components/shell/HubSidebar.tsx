import { Link, useLocation } from "react-router-dom";
import {
  BookOpen, Sun, NotebookPen, Brain, Sprout, Network, FileStack, Share2, Sparkles,
  GraduationCap, Mail, ListTodo, CheckSquare, Moon, Calendar, MessageCircleHeart,
  HeartHandshake, Settings, LayoutGrid, Clock, CircleHelp, ClipboardList, Layers, Users, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBibleRoute } from "@/lib/home/homeApps";
import { useAuth } from "@/contexts/AuthContext";
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
  "Hard questions": "text-amber-500",
  Playbook: "text-violet-400",
  "Library standing": "text-teal-500",
  Influences: "text-orange-400",
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
      { title: "Life weeks", icon: Calendar, to: "/life-weeks" },
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
      { title: "Playbook", icon: ClipboardList, to: "/framework/playbook" },
      { title: "Beliefs", icon: Network, to: "/framework/beliefs" },
      { title: "Influences", icon: Users, to: "/framework/influences" },
      { title: "Artifacts", icon: FileStack, to: "/framework/artifacts" },
      { title: "Library standing", icon: Layers, to: "/framework/library-standing" },
      { title: "Graph", icon: Share2, to: "/framework/graph" },
      { title: "Tensions", icon: Sparkles, to: "/framework/tensions" },
      { title: "Study", icon: GraduationCap, to: "/framework/study" },
      { title: "Digest", icon: Mail, to: "/framework/digest" },
      { title: "Research later", icon: Clock, to: "/framework/research-later" },
      { title: "Hard questions", icon: CircleHelp, to: "/framework/hard-questions" },
    ],
  },
  {
    label: "Life",
    items: [
      { title: "Tasks", icon: ListTodo, to: "/life/todos" },
      { title: "Habits", icon: CheckSquare, to: "/life/habits" },
      { title: "Sleep", icon: Moon, to: "/sleep" },
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

function HubSidebarProfile() {
  const { user } = useAuth();
  const { profilePhoto, displayName } = useHomeDashboard();
  const profileInitial = (displayName || user?.email || "U").trim()[0]?.toUpperCase() ?? "U";
  const profileLabel = displayName?.trim() || user?.email?.split("@")[0] || "Profile";

  return (
    <Link
      to="/settings"
      className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-muted/25 px-2.5 py-2 transition-colors hover:border-border/60 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Open settings and profile"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/50 bg-muted text-sm font-semibold text-foreground">
        {profilePhoto ? (
          <img src={profilePhoto} alt="" className="h-full w-full object-cover" />
        ) : profileInitial ? (
          profileInitial
        ) : (
          <User className="h-4 w-4" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight text-foreground">{profileLabel}</span>
        <span className="block truncate text-[11px] text-muted-foreground">Settings & profile</span>
      </span>
    </Link>
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
      <SidebarHeader className="px-3 py-5">
        <Link
          to="/home"
          className="flex items-center gap-3.5 rounded-lg px-1 py-0.5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Belief architecture home"
        >
          <img
            src="/app-icon-192.png"
            srcSet="/app-icon-192.png 96w, /app-icon-512.png 192w"
            sizes="48px"
            alt=""
            width={48}
            height={48}
            decoding="async"
            className="h-12 w-12 shrink-0 rounded-xl object-contain shadow-sm ring-1 ring-black/[0.06]"
          />
          <span className="min-w-0">
            <span className="block font-display text-[2.125rem] font-normal leading-none tracking-[-0.03em] text-leather">
              Belief
            </span>
            <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/85">
              architecture
            </span>
          </span>
        </Link>
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
      <SidebarFooter className="mt-auto shrink-0 border-t border-border/40 px-2 py-3">
        <HubSidebarProfile />
      </SidebarFooter>
    </Sidebar>
  );
}
