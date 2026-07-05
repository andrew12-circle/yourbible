import { type MouseEvent, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  buildChatSidebarSections,
  sidebarChatTitle,
  type ChatSidebarSection,
  type MyAiChatListItem,
  type MyAiProjectRow,
} from "@/lib/myai/chatSections";
import { LumenIcon } from "@/components/myai/LumenIcon";
import { LUMEN_NAME } from "@/lib/myai/lumenBrand";
import {
  myAiSidebarGroupHeader,
  myAiSidebarSectionGap,
  myAiSidebarSectionHeader,
} from "@/lib/myai/myAiTheme";

type Props = {
  chats: MyAiChatListItem[];
  projects: MyAiProjectRow[];
  loading: boolean;
  activeChatId?: string;
  activeProjectFilter: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onNewProject: () => void;
  onDeleteChat: (id: string, e?: MouseEvent) => void;
  onMoveChatToProject: (chatId: string, projectId: string | null) => void;
  onSelectProjectFilter: (projectId: string | null) => void;
  onDeleteProject: (projectId: string) => void;
  onCloseSidebar?: () => void;
};

export default function MyAiChatSidebar({
  chats,
  projects,
  loading,
  activeChatId,
  activeProjectFilter,
  onSelectChat,
  onNewChat,
  onNewProject,
  onDeleteChat,
  onMoveChatToProject,
  onSelectProjectFilter,
  onDeleteProject,
  onCloseSidebar,
}: Props) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const query = search.trim().toLowerCase();
  const filteredChats = useMemo(() => {
    if (!query) return chats;
    return chats.filter((c) => sidebarChatTitle(c.title).toLowerCase().includes(query));
  }, [chats, query]);

  const sections = useMemo(
    () => buildChatSidebarSections(filteredChats, projects),
    [filteredChats, projects],
  );

  const projectSections = useMemo(
    () => sections.filter((section) => section.kind === "project"),
    [sections],
  );
  const timeSections = useMemo(
    () => sections.filter((section) => section.kind === "time"),
    [sections],
  );

  const toggleSection = (sectionId: string) => {
    setCollapsed((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const isSectionCollapsed = (sectionId: string) => collapsed[sectionId] ?? false;

  const renderChatRow = (c: MyAiChatListItem) => (
    <div
      key={c.id}
      role="button"
      tabIndex={0}
      onClick={() => onSelectChat(c.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectChat(c.id);
        }
      }}
      className={cn(
        "group mx-0.5 flex min-w-0 cursor-pointer items-center gap-1 overflow-hidden rounded-lg px-2.5 py-2 text-[13px] transition-colors",
        activeChatId === c.id
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      <span className="min-w-0 flex-1 truncate leading-snug" title={c.title?.trim() || undefined}>
        {sidebarChatTitle(c.title)}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Chat options"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {projects.length > 0 ? (
            <>
              <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
                Move to folder
              </DropdownMenuLabel>
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveChatToProject(c.id, project.id);
                  }}
                >
                  <Folder className="mr-2 h-3.5 w-3.5" />
                  {project.name}
                </DropdownMenuItem>
              ))}
              {c.project_id ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveChatToProject(c.id, null);
                  }}
                >
                  Remove from folder
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteChat(c.id);
            }}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const renderSubSection = (section: ChatSidebarSection, nested = false) => {
    const isCollapsed = isSectionCollapsed(section.id);
    const projectId = section.kind === "project" ? section.id.replace("project:", "") : null;
    const isActiveProject = projectId != null && activeProjectFilter === projectId;

    return (
      <div key={section.id} className={cn(myAiSidebarSectionGap, nested && "mb-2")}>
        <div
          className={cn(
            "group/section flex items-center gap-1 rounded-md px-1.5 py-1",
            isActiveProject && "bg-blue-500/10",
          )}
        >
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-muted-foreground/70 hover:text-foreground"
            aria-label={isCollapsed ? `Expand ${section.label}` : `Collapse ${section.label}`}
            onClick={() => toggleSection(section.id)}
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
            onClick={() => {
              if (projectId) {
                onSelectProjectFilter(isActiveProject ? null : projectId);
                return;
              }
              toggleSection(section.id);
            }}
          >
            {section.kind === "project" ? (
              <Folder className="h-3 w-3 shrink-0 text-muted-foreground/70" />
            ) : null}
            <span className={myAiSidebarSectionHeader}>{section.label}</span>
            <span className="text-[10px] text-muted-foreground/60">({section.chats.length})</span>
          </button>
          {projectId ? (
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/section:opacity-100 focus-visible:opacity-100"
              aria-label={`Delete folder ${section.label}`}
              onClick={() => onDeleteProject(projectId)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        {!isCollapsed ? section.chats.map(renderChatRow) : null}
      </div>
    );
  };

  const renderGroupHeader = (groupId: string, label: string) => {
    const isCollapsed = isSectionCollapsed(groupId);
    return (
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-1.5 py-1.5 text-left"
        onClick={() => {
          toggleSection(groupId);
          if (groupId === "group:chats") onSelectProjectFilter(null);
        }}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-foreground" />
        )}
        <span className={myAiSidebarGroupHeader}>{label}</span>
      </button>
    );
  };

  const hasSearchResults = query.length > 0 && sections.length > 0;
  const showEmptySearch = query.length > 0 && sections.length === 0;

  return (
    <div className="my-ai-chat-sidebar flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <div className="flex flex-col gap-1 border-b border-border/50 px-2 py-2">
        <div className="flex items-center gap-1">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1">
            <LumenIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="truncate font-display text-[15px] font-semibold leading-tight tracking-tight text-foreground">
              {LUMEN_NAME}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onNewChat}
            aria-label="New chat"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onNewProject}
            aria-label="New folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          {onCloseSidebar ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 shrink-0 md:inline-flex"
              onClick={onCloseSidebar}
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats"
            className="h-8 rounded-md border-transparent bg-muted/50 pl-8 text-xs placeholder:text-muted-foreground focus-visible:border-border focus-visible:bg-background"
          />
        </div>
      </div>

      <div className="my-ai-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : chats.length === 0 ? (
          <p className="px-3 py-3 text-[11px] text-muted-foreground">No chats yet.</p>
        ) : showEmptySearch ? (
          <p className="px-3 py-3 text-[11px] text-muted-foreground">No chats match "{search.trim()}".</p>
        ) : (
          <>
            <div className="mb-3">
              {renderGroupHeader("group:projects", "Projects")}
              {!isSectionCollapsed("group:projects") ? (
                <div className="pl-1">
                  {projectSections.length === 0 ? (
                    <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                      No folders yet. Use the folder button above to create one.
                    </p>
                  ) : (
                    projectSections.map((section) => renderSubSection(section, true))
                  )}
                </div>
              ) : null}
            </div>

            <div className={cn(hasSearchResults && "border-t border-border/50 pt-2")}>
              {renderGroupHeader("group:chats", "Chats")}
              {!isSectionCollapsed("group:chats") ? (
                <div className="pl-1">
                  {timeSections.length === 0 ? (
                    <p className="px-2 py-1.5 text-[11px] text-muted-foreground">No unfiled chats.</p>
                  ) : (
                    timeSections.map((section) => renderSubSection(section, true))
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
