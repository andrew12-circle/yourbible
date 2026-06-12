import { type MouseEvent, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Loader2,
  MessageCircle,
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

function sectionIcon(kind: "project" | "smart" | "time") {
  if (kind === "project") return Folder;
  return MessageCircle;
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

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsed((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
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

      <div className="min-h-0 flex-1 overflow-y-auto py-1.5">
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
          sections.map((section) => {
            const isCollapsed = collapsed[section.id] ?? false;
            const SectionIcon = sectionIcon(section.kind);
            const projectId = section.kind === "project" ? section.id.replace("project:", "") : null;

            return (
              <div key={section.id} className="mb-1">
                <div className="group/section flex items-center gap-1 px-2 py-1">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-1 text-left"
                    onClick={() => toggleSection(section.id)}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <SectionIcon className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">({section.chats.length})</span>
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
                          "group mx-1.5 flex cursor-pointer items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-xs transition-colors",
                          activeChatId === c.id
                            ? "border-blue-500 bg-blue-500/8 font-medium text-foreground"
                            : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        <MessageCircle className="h-3 w-3 shrink-0 opacity-60" />
                        <span className="min-w-0 flex-1 truncate">{sidebarChatTitle(c.title)}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                              aria-label="Chat options"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ChevronDown className="h-3 w-3" />
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
