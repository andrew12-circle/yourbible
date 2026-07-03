import { localDateISO } from "@/lib/habits/dates";
import { insertJournalEntry } from "@/lib/journal/journalEntryDb";
import {
  createTimelineEvent,
  updatePrayerRequest,
} from "@/lib/prayer/api";
import {
  buildPraiseReportBody,
  buildPraiseReportTitle,
} from "@/lib/prayer/praiseReportFromRequest";
import type { PrayerRequestRow, PrayerRequestStatus } from "@/lib/prayer/types";

export type CompletePrayerAnswerInput = {
  answerText: string;
  answeredAt?: string;
  status?: Extract<PrayerRequestStatus, "answered" | "different_answer">;
  praiseBodyOverride?: string;
};

export async function completePrayerAnswer(
  userId: string,
  request: PrayerRequestRow,
  input: CompletePrayerAnswerInput,
): Promise<{ request: PrayerRequestRow; praiseEntryId: string } | null> {
  const answeredAt = input.answeredAt ?? localDateISO();
  const status = input.status ?? "answered";
  const answerText = input.answerText.trim();

  const praiseTitle = buildPraiseReportTitle(request);
  const praiseBody =
    input.praiseBodyOverride?.trim() ||
    buildPraiseReportBody(
      {
        ...request,
        answered_at: answeredAt,
        answer_text: answerText,
        status,
      },
      answerText,
    );

  const { data: inserted, error: insertErr } = await insertJournalEntry(userId, {
    title: praiseTitle,
    body: praiseBody,
    entry_kind: "praise_report",
    entry_at_ts: new Date(`${answeredAt}T12:00:00`).toISOString(),
    analyze_for_mirror: true,
  });
  if (insertErr || !inserted?.id) throw insertErr ?? new Error("Failed to create praise report");

  const praiseEntryId = inserted.id as string;

  const updated = await updatePrayerRequest(userId, request.id, {
    status,
    answered_at: answeredAt,
    answer_text: answerText,
    praise_report_entry_id: praiseEntryId,
  });
  if (!updated) return null;

  await createTimelineEvent(userId, {
    prayerRequestId: request.id,
    eventKind: "answered",
    title: status === "different_answer" ? "Answered differently" : "Prayer answered",
    body: answerText,
    occurredAt: new Date(`${answeredAt}T12:00:00`).toISOString(),
  });

  await createTimelineEvent(userId, {
    prayerRequestId: request.id,
    eventKind: "praise",
    title: "Praise report created",
    body: praiseTitle,
    occurredAt: new Date(`${answeredAt}T12:00:00`).toISOString(),
    linkRef: { entry_id: praiseEntryId },
  });

  return { request: updated, praiseEntryId };
}
