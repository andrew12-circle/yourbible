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
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  type MyAiChatListItem,
  type MyAiProjectRow,
} from "@/lib/myai/chatSections";
import { myAiSidebarSectionGap, myAiSidebarSectionHeader } from "@/lib/myai/myAiTheme";

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

function defaultSectionCollapsed(
  sectionId: string,
  chatCount: number,
  activeChatId: string | undefined,
  chats: MyAiChatListItem[],
): boolean {
  if (sectionId !== "smart:journal" || chatCount <= 10) return false;
  return !chats.some((c) => c.id === activeChatId);
}

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
  const sections = useMemo(
    () => buildChatSidebarSections(chats, projects, { projectFilterId: activeProjectFilter }),
    [activeProjectFilter, chats, projects],
  );

  const firstTimeIndex = useMemo(
    () => sections.findIndex((s) => s.kind === "time"),
    [sections],
  );
  const hasSmartSections = useMemo(
    () => sections.some((s) => s.kind === "smart"),
    [sections],
  );

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsed((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const isSectionCollapsed = (sectionId: string, sectionChats: MyAiChatListItem[]) =>
    collapsed[sectionId] ??
    defaultSectionCollapsed(sectionId, sectionChats.length, activeChatId, sectionChats);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-card">
      <div className="flex items-center gap-1 border-b border-border px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 flex-1 justify-start gap-1.5 rounded-md px-2 text-xs font-medium hover:bg-muted/70"
          onClick={onNewChat}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          New chat
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

      {projects.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-border px-2 py-2">
          <button
            type="button"
            onClick={() => onSelectProjectFilter(null)}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
              activeProjectFilter === null
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            All chats
          </button>
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => onSelectProjectFilter(project.id)}
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                activeProjectFilter === project.id
                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Folder className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{project.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2 pt-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : chats.length === 0 ? (
          <p className="px-3 py-3 text-[11px] text-muted-foreground">No chats yet.</p>
        ) : sections.length === 0 ? (
          <div className="px-3 py-3 text-[11px] text-muted-foreground">
            {activeProjectFilter ? (
              <>
                <p>No chats in this folder.</p>
                <button
                  type="button"
                  className="mt-2 text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                  onClick={() => onSelectProjectFilter(null)}
                >
                  Show all chats
                </button>
              </>
            ) : (
              <p>Could not group chats. Refresh the page.</p>
            )}
          </div>
        ) : (
          sections.map((section, index) => {
            const isCollapsed = isSectionCollapsed(section.id, section.chats);
            const projectId = section.kind === "project" ? section.id.replace("project:", "") : null;
            const showSmartTimeDivider =
              section.kind === "time" &&
              index === firstTimeIndex &&
              hasSmartSections &&
              firstTimeIndex > 0;

            return (
              <div
                key={section.id}
                className={cn(
                  myAiSidebarSectionGap,
                  showSmartTimeDivider && "mt-3 border-t border-border/50 pt-3",
                )}
              >
                <div className="group/section flex items-center gap-1 px-1.5 py-1">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    onClick={() => toggleSection(section.id)}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                    ) : (
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                    )}
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

                {!isCollapsed
                  ? section.chats.map((c) => (
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
                        <span
                          className="min-w-0 flex-1 truncate leading-snug"
                          title={c.title?.trim() || undefined}
                        >
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
                    ))
                  : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
