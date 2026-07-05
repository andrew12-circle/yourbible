import { normalizeChatSessionTitle } from "@/lib/myai/chatTitle";

export type MyAiChatListItem = {
  id: string;
  title: string | null;
  updated_at: string;
  project_id: string | null;
  journal_entry_id: string | null;
};

export type MyAiProjectRow = {
  id: string;
  name: string;
  sort_order: number;
};

export type ChatSidebarSectionKind = "project" | "smart" | "time";

export type ChatSidebarSection = {
  id: string;
  label: string;
  kind: ChatSidebarSectionKind;
  chats: MyAiChatListItem[];
};

export type SmartCategory = "hard-question" | "claim-research" | "journal";

const SMART_SECTIONS: { id: SmartCategory; label: string }[] = [
  { id: "hard-question", label: "Hard questions" },
  { id: "claim-research", label: "Claim research" },
  { id: "journal", label: "Journal chats" },
];

const TIME_SECTIONS: { id: TimeBucket; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "Previous 7 days" },
  { id: "month", label: "Previous 30 days" },
  { id: "older", label: "Older" },
];

type TimeBucket = "today" | "yesterday" | "week" | "month" | "older";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function timeBucketForChat(updatedAt: string, now = new Date()): TimeBucket {
  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) return "older";

  const todayStart = startOfLocalDay(now);
  const updatedDay = startOfLocalDay(updated);
  const dayDiff = Math.floor((todayStart.getTime() - updatedDay.getTime()) / 86_400_000);

  if (dayDiff <= 0) return "today";
  if (dayDiff === 1) return "yesterday";
  if (dayDiff <= 7) return "week";
  if (dayDiff <= 30) return "month";
  return "older";
}

export function detectSmartCategory(chat: MyAiChatListItem): SmartCategory | null {
  const title = chat.title?.trim() ?? "";
  if (title.startsWith("Hard question")) return "hard-question";
  if (title.startsWith("Claim research")) return "claim-research";
  if (chat.journal_entry_id) return "journal";
  return null;
}

function sortChatsNewestFirst(chats: MyAiChatListItem[]): MyAiChatListItem[] {
  return [...chats].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

function pushSection(
  sections: ChatSidebarSection[],
  id: string,
  label: string,
  kind: ChatSidebarSectionKind,
  chats: MyAiChatListItem[],
  opts?: { allowEmpty?: boolean },
) {
  if (!chats.length && !opts?.allowEmpty) return;
  sections.push({ id, label, kind, chats: sortChatsNewestFirst(chats) });
}

/** Build sidebar sections: user folders first, then time buckets for unfiled chats. */
export function buildChatSidebarSections(
  chats: MyAiChatListItem[],
  projects: MyAiProjectRow[],
  opts?: { projectFilterId?: string | null; now?: Date },
): ChatSidebarSection[] {
  const now = opts?.now ?? new Date();
  const projectFilterId = opts?.projectFilterId ?? null;

  let visible = chats;
  if (projectFilterId) {
    visible = chats.filter((c) => c.project_id === projectFilterId);
  }

  const sections: ChatSidebarSection[] = [];
  const sortedProjects = [...projects].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const knownProjectIds = new Set(sortedProjects.map((p) => p.id));

  if (!projectFilterId) {
    for (const project of sortedProjects) {
      const projectChats = visible.filter((c) => c.project_id === project.id);
      pushSection(sections, `project:${project.id}`, project.name, "project", projectChats, {
        allowEmpty: true,
      });
    }
  } else {
    const activeProject = sortedProjects.find((p) => p.id === projectFilterId);
    if (activeProject) {
      pushSection(sections, `project:${activeProject.id}`, activeProject.name, "project", visible);
    }
  }

  const unfiled = projectFilterId
    ? []
    : visible.filter((c) => !c.project_id || !knownProjectIds.has(c.project_id));

  const timeBuckets = new Map<TimeBucket, MyAiChatListItem[]>();

  for (const chat of unfiled) {
    const time = timeBucketForChat(chat.updated_at, now);
    const bucket = timeBuckets.get(time) ?? [];
    bucket.push(chat);
    timeBuckets.set(time, bucket);
  }

  for (const time of TIME_SECTIONS) {
    pushSection(sections, `time:${time.id}`, time.label, "time", timeBuckets.get(time.id) ?? []);
  }

  return sections;
}

export function sidebarChatTitle(title: string | null | undefined): string {
  const trimmed = title?.trim();
  if (!trimmed) return "New chat";
  return normalizeChatSessionTitle(trimmed);
}
