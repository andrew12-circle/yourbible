import type { DefaultFolderSlug, SmartView } from "@/lib/todos/api";

export const SMART_VIEW_LABELS: Record<SmartView, string> = {
  inbox: "Inbox",
  today: "Today",
  upcoming: "Upcoming",
  backlog: "Backlog",
  all: "All",
  done: "Completed",
};

export const SMART_VIEW_SUBTITLES: Partial<Record<SmartView, string>> = {
  today: "Due today, overdue carryover, and pinned tasks.",
  backlog: "Someday and later — no date or more than a week out.",
  upcoming: "Due in the next 7 days.",
};

export const LIST_EMPTY_MESSAGES: Record<DefaultFolderSlug | "custom", string> = {
  work: "Nothing here — add work tasks below.",
  personal: "Nothing here — add personal tasks below.",
  home: "Add big projects here — pin or set a due date when you're ready to work on them. Break large jobs into subtasks from the task detail view.",
  custom: "Nothing here — add a task below.",
};

export function listEmptyMessage(slug: string | null): string {
  if (slug === "work" || slug === "personal" || slug === "home") {
    return LIST_EMPTY_MESSAGES[slug];
  }
  return LIST_EMPTY_MESSAGES.custom;
}

export function smartViewEmptyMessage(view: SmartView): string {
  switch (view) {
    case "done":
      return "No completed tasks yet.";
    case "backlog":
      return "Backlog is clear — capture big projects in Home & Projects when inspiration strikes.";
    case "today":
      return "Nothing scheduled for today. Check Backlog or pin a task when you're ready.";
    default:
      return "Nothing here — add a task below.";
  }
}
