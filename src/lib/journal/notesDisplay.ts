/** Apple Notes-style title and preview from plain text. */

export function noteDisplayTitle(title: string | null | undefined, body: string | null | undefined): string {
  const t = title?.trim();
  if (t) return t;
  const firstLine = (body ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  if (firstLine) return firstLine.slice(0, 80);
  return "New Note";
}

export function noteDisplayPreview(title: string | null | undefined, body: string | null | undefined): string {
  const lines = (body ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const t = title?.trim();
  const bodyLines = t && lines[0] === t ? lines.slice(1) : lines;
  const preview = bodyLines.join(" ").replace(/\s+/g, " ").trim();
  return preview.slice(0, 120);
}

export type NoteDateGroup = "pinned" | "today" | "yesterday" | "previous7" | "older";

export function noteDateGroup(iso: string, pinned: boolean): NoteDateGroup {
  if (pinned) return "pinned";
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 7);

  if (d >= startToday) return "today";
  if (d >= startYesterday) return "yesterday";
  if (d >= startWeek) return "previous7";
  return "older";
}

export const NOTE_GROUP_LABELS: Record<NoteDateGroup, string> = {
  pinned: "Pinned",
  today: "Today",
  yesterday: "Yesterday",
  previous7: "Previous 7 Days",
  older: "Older",
};

export function formatNoteListDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  if (d >= startToday) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
