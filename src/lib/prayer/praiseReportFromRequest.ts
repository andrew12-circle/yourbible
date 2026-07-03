import type { PrayerRequestRow } from "@/lib/prayer/types";
import { computeWaitDays, formatDisplayDate, humanizeWaitDays } from "@/lib/prayer/stats";

export function buildPraiseReportTitle(request: Pick<PrayerRequestRow, "title">): string {
  return `Answered: ${request.title.trim()}`;
}

export function buildPraiseReportBody(
  request: Pick<
    PrayerRequestRow,
    "requested_at" | "answered_at" | "prayer_text" | "answer_text" | "title" | "status"
  >,
  answerOverride?: string,
): string {
  const answeredAt = request.answered_at ?? new Date().toISOString().slice(0, 10);
  const waitDays = computeWaitDays({ requested_at: request.requested_at, answered_at: answeredAt });
  const waitLabel = waitDays != null ? humanizeWaitDays(waitDays) : "—";
  const answer = (answerOverride ?? request.answer_text ?? "").trim();
  const prayer = request.prayer_text.trim();
  const statusNote =
    request.status === "different_answer"
      ? "\n\n_God answered differently than I expected — and that was the gift._"
      : "";

  return [
    `**Requested:** ${formatDisplayDate(request.requested_at)}`,
    `**Answered:** ${formatDisplayDate(answeredAt)}`,
    `**Waited:** ${waitLabel}`,
    "",
    "**Prayer:**",
    prayer ? `"${prayer}"` : "_(no prayer text recorded)_",
    "",
    "**Answer:**",
    answer ? `"${answer}"` : "_(describe how God provided)_",
    statusNote,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i + 1] === ""))
    .join("\n");
}
