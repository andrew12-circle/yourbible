import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Sun, Sunrise, NotebookPen, StickyNote, Brain, Sprout, Network, FileStack, Share2, Sparkles,
  GraduationCap, Mail, ListTodo, CheckSquare, Moon,
  HeartHandshake, Settings, LayoutGrid, Clock, CircleHelp, ClipboardList, Layers, Users, User,
  Grid3X3, BookMarked, ChevronRight, HandHeart,
} from "lucide-react";
import { APP_WORDMARK, APP_WORDMARK_SUBTITLE } from "@/lib/appBrand";
import { cn } from "@/lib/utils";
import { getBibleRoute } from "@/lib/home/homeApps";
import { mobileSheetSafeTop } from "@/lib/shell/mobileShellClasses";
import { useAuth } from "@/contexts/AuthContext";
import { useHomeDashboard } from "@/contexts/HomeDashboardContext";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarSeparator, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HubSidebarStorageMeter } from "@/components/shell/HubSidebarStorageMeter";
import { HubSidebarMediaPlayer } from "@/components/media/HubSidebarMediaPlayer";
import { LumenIcon } from "@/components/myai/LumenIcon";
import { LUMEN_NAME } from "@/lib/myai/lumenBrand";

const iconColorMap: Record<string, string> = {
  Overview: "text-blue-500",
  Bible: "text-amber-600",
  "Code Lab": "text-amber-800",
  "Life Manual": "text-yellow-600",
  "Morning formula": "text-amber-500",
  Daily: "text-orange-500",
  Journal: "text-violet-500",
  Prayer: "text-rose-500",
  Notes: "text-amber-500",
  Framework: "text-indigo-500",
  Journey: "text-emerald-500",
  Beliefs: "text-sky-500",
  Artifacts: "text-rose-500",
  Graph: "text-cyan-500",
  "Mind map": "text-cyan-500",
  Tensions: "text-fuchsia-500",
  Study: "text-blue-400",
  Digest: "text-slate-500",
  Tasks: "text-teal-500",
  Habits: "text-green-500",
  Sleep: "text-indigo-400",
  "Lumen AI": "text-amber-600",
  Partner: "text-red-400",
  Settings: "text-gray-500",
  "Research later": "text-slate-400",
  "Hard questions": "text-amber-500",
  "Questions for God": "text-rose-400",
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

interface SidebarGroupConfig {
  label: string;
  items: SidebarItem[];
  defaultCollapsed?: boolean;
}

const sidebarGroups: SidebarGroupConfig[] = [
  {
    label: "",
    items: [
      { title: "Overview", icon: LayoutGrid, to: "/home" },
      { title: "Bible", icon: BookOpen, to: "__bible__" },
      { title: "Journal", icon: NotebookPen, to: "/journal" },
      { title: "Prayer", icon: HandHeart, to: "/prayer" },
      { title: "Notes", icon: StickyNote, to: "/journal/notes" },
      { title: "Morning formula", icon: Sunrise, to: "/living-hope" },
      { title: "Mind map", icon: Share2, to: "/framework/graph" },
      { title: "Artifacts", icon: FileStack, to: "/framework/artifacts" },
    ],
  },
  {
    label: "Life",
    items: [
      { title: LUMEN_NAME, icon: LumenIcon, to: "/my-ai" },
      { title: "Tasks", icon: ListTodo, to: "/life/todos" },
      { title: "Habits", icon: CheckSquare, to: "/life/habits" },
      { title: "Sleep", icon: Moon, to: "/sleep" },
      { title: "Daily", icon: Sun, to: "/framework/daily" },
    ],
  },
  {
    label: "Framework",
    defaultCollapsed: true,
    items: [
      { title: "Framework", icon: Brain, to: "/framework" },
      { title: "Beliefs", icon: Network, to: "/framework/beliefs" },
      { title: "Life Manual", icon: BookMarked, to: "/bible/life-guide" },
      { title: "Journey", icon: Sprout, to: "/framework/journey" },
      { title: "Influences", icon: Users, to: "/framework/influences" },
      { title: "Library standing", icon: Layers, to: "/framework/library-standing" },
      { title: "Tensions", icon: Sparkles, to: "/framework/tensions" },
      { title: "Study", icon: GraduationCap, to: "/framework/study" },
      { title: "Digest", icon: Mail, to: "/framework/digest" },
      { title: "Research later", icon: Clock, to: "/framework/research-later" },
      { title: "Questions for God", icon: HandHeart, to: "/framework/questions-for-god" },
      { title: "Hard questions", icon: CircleHelp, to: "/framework/hard-questions" },
      { title: "Playbook", icon: ClipboardList, to: "/framework/playbook" },
    ],
  },
  {
    label: "More",
    items: [
      { title: "Code Lab", icon: Grid3X3, to: "/bible/code-lab" },
      { title: "Partner", icon: HeartHandshake, to: "/partner" },
      { title: "Settings", icon: Settings, to: "/settings" },
    ],
  },
];


function resolveItemPath(item: SidebarItem, bibleTo: string): string {
  return item.to === "__bible__" ? bibleTo : item.to;
}

function isItemActive(item: SidebarItem, to: string, pathname: string): boolean {
  if (item.title === "Bible") return pathname.startsWith("/read/");
  if (item.title === "Notes") {
    return pathname === "/journal/notes" || pathname.startsWith("/journal/notes/");
  }
  if (item.title === "Journal") {
    if (pathname.startsWith("/journal/notes")) return false;
    return pathname === to || pathname.startsWith(to + "/");
  }
  if (item.title === "Prayer") {
    return pathname === to || pathname.startsWith(to + "/");
  }
  if (to === "/home") return pathname === "/home";
  return pathname === to || (to !== "/home" && pathname.startsWith(to + "/"));
}

function isGroupActive(group: SidebarGroupConfig, pathname: string, bibleTo: string): boolean {
  return group.items.some((item) => isItemActive(item, resolveItemPath(item, bibleTo), pathname));
}

function SidebarGroupItems({
  group,
  pathname,
  bibleTo,
  badgeMap,
}: {
  group: SidebarGroupConfig;
  pathname: string;
  bibleTo: string;
  badgeMap: Record<string, number | undefined>;
}) {
  return (
    <SidebarMenu>
      {group.items.map((item) => {
        const to = resolveItemPath(item, bibleTo);
        const navItem = { ...item, to };
        const isActive = isItemActive(item, to, pathname);
        const withBadge = { ...navItem, badge: badgeMap[item.title] };
        return <NavItem key={item.title} item={withBadge} isActive={isActive} />;
      })}
    </SidebarMenu>
  );
}

function CollapsibleSidebarGroup({
  group,
  pathname,
  bibleTo,
  badgeMap,
}: {
  group: SidebarGroupConfig;
  pathname: string;
  bibleTo: string;
  badgeMap: Record<string, number | undefined>;
}) {
  const activeInGroup = useMemo(
    () => isGroupActive(group, pathname, bibleTo),
    [group, pathname, bibleTo],
  );
  const [open, setOpen] = useState(() => !group.defaultCollapsed || activeInGroup);

  useEffect(() => {
    if (activeInGroup) setOpen(true);
  }, [activeInGroup]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-full shrink-0 items-center gap-1.5 rounded-md px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/40 outline-none ring-sidebar-ring transition-colors hover:text-sidebar-foreground/60 focus-visible:ring-2"
            aria-expanded={open}
          >
            <ChevronRight
              className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", open && "rotate-90")}
              aria-hidden
            />
            <span>{group.label}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarGroupItems group={group} pathname={pathname} bibleTo={bibleTo} badgeMap={badgeMap} />
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

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
  const { isMobile } = useSidebar();
  const { counts } = useHomeDashboard();
  const bibleTo = getBibleRoute();
  const promptBadge = !counts.journalToday ? 1 : undefined;

  const badgeMap: Record<string, number | undefined> = {
    Journal: promptBadge,
    Prayer: counts.prayerWaiting || undefined,
    Beliefs: counts.beliefs || undefined,
    Artifacts: counts.artifacts || undefined,
    Tensions: counts.tensions || undefined,
    [LUMEN_NAME]: counts.chats || undefined,
  };

  return (
    <Sidebar collapsible="offcanvas" variant="floating" className="app-theme">
      <SidebarHeader
        className={cn(
          "gap-2 p-0 px-3 pb-5",
          isMobile ? mobileSheetSafeTop() : "py-5",
        )}
      >
        <Link
          to="/home"
          className="flex items-center gap-3.5 rounded-lg px-1 py-0.5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${APP_WORDMARK} ${APP_WORDMARK_SUBTITLE} home`}
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
              {APP_WORDMARK}
            </span>
            <span className="-mt-0.5 block text-[11px] font-medium uppercase leading-none tracking-[0.16em] text-muted-foreground/85">
              {APP_WORDMARK_SUBTITLE}
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="sidebar-scroll">
        {sidebarGroups.map((group, gi) => (
          <div key={group.label || "main"}>
            {group.defaultCollapsed && group.label ? (
              <CollapsibleSidebarGroup
                group={group}
                pathname={pathname}
                bibleTo={bibleTo}
                badgeMap={badgeMap}
              />
            ) : (
              <SidebarGroup>
                {group.label && (
                  <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/40">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarGroupItems
                    group={group}
                    pathname={pathname}
                    bibleTo={bibleTo}
                    badgeMap={badgeMap}
                  />
                </SidebarGroupContent>
              </SidebarGroup>
            )}
            {gi < sidebarGroups.length - 1 && <SidebarSeparator className="my-1" />}
          </div>
        ))}
      </SidebarContent>
      <SidebarFooter
        className={cn(
          "mt-auto shrink-0 border-t border-border/40 p-0 px-2 py-3",
          isMobile && "pb-safe",
        )}
      >
        <HubSidebarMediaPlayer />
        <HubSidebarStorageMeter />
        <HubSidebarProfile />
      </SidebarFooter>
    </Sidebar>
  );
}
