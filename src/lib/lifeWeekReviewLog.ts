import type { LifeWeekReviewSubject } from "@/lib/lifeWeekReview";
import { LIFE_WEEK_REVIEW_SUBJECTS } from "@/lib/lifeWeekReview";

export type LifeWeekReviewLogEntry = {
  id: string;
  subject: LifeWeekReviewSubject;
  week_index: number;
  week_start: string;
  reflection: string;
  completed_at: string;
  source: "remote" | "local";
};

export type LifeWeekReviewGroup = {
  groupKey: string;
  completedAt: string;
  selfWeekStart: string | null;
  entries: Partial<Record<LifeWeekReviewSubject, LifeWeekReviewLogEntry>>;
};

const GROUP_WINDOW_MS = 4 * 60 * 60 * 1000;

function entryKey(subject: LifeWeekReviewSubject, weekIndex: number): string {
  return `${subject}:${weekIndex}`;
}

/** Merge remote + local rows; remote wins on conflict unless local is newer. */
export function mergeLifeWeekReviewLogEntries(
  remote: LifeWeekReviewLogEntry[],
  local: LifeWeekReviewLogEntry[],
): LifeWeekReviewLogEntry[] {
  const byKey = new Map<string, LifeWeekReviewLogEntry>();

  for (const row of remote) {
    byKey.set(entryKey(row.subject, row.week_index), row);
  }

  for (const row of local) {
    const key = entryKey(row.subject, row.week_index);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    if (new Date(row.completed_at).getTime() > new Date(existing.completed_at).getTime()) {
      byKey.set(key, row);
    }
  }

  return [...byKey.values()].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
  );
}

/** Cluster close-outs from the same session (typically self + family within a few hours). */
export function groupLifeWeekReviews(entries: LifeWeekReviewLogEntry[]): LifeWeekReviewGroup[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
  );

  const groups: LifeWeekReviewGroup[] = [];

  for (const entry of sorted) {
    const entryTime = new Date(entry.completed_at).getTime();
    const existing = groups.find((group) => {
      const anchor = new Date(group.completedAt).getTime();
      return Math.abs(anchor - entryTime) <= GROUP_WINDOW_MS;
    });

    if (existing) {
      if (!existing.entries[entry.subject]) {
        existing.entries[entry.subject] = entry;
      }
      if (entry.subject === "self") {
        existing.selfWeekStart = entry.week_start;
      }
      if (entryTime > new Date(existing.completedAt).getTime()) {
        existing.completedAt = entry.completed_at;
      }
      continue;
    }

    groups.push({
      groupKey: entry.completed_at,
      completedAt: entry.completed_at,
      selfWeekStart: entry.subject === "self" ? entry.week_start : null,
      entries: { [entry.subject]: entry },
    });
  }

  return groups;
}

export function subjectDisplayName(
  subject: LifeWeekReviewSubject,
  names: Partial<Record<LifeWeekReviewSubject, string>>,
): string {
  if (subject === "self") return names.self?.trim() || "Me";
  return names[subject]?.trim() || subject;
}

export function countGroupedSubjects(group: LifeWeekReviewGroup): number {
  return LIFE_WEEK_REVIEW_SUBJECTS.filter((s) => group.entries[s]).length;
}
