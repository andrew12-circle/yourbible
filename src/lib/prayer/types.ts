import type { Json } from "@/integrations/supabase/types";

export type PrayerCategory =
  | "family"
  | "business"
  | "health"
  | "ministry"
  | "finances"
  | "guidance"
  | "protection";

export type PrayerRequestStatus =
  | "waiting"
  | "partial"
  | "answered"
  | "different_answer"
  | "closed";

export type PrayerTimelineEventKind =
  | "asked"
  | "note"
  | "scripture"
  | "journal"
  | "artifact"
  | "dream"
  | "worship"
  | "gratitude"
  | "opportunity"
  | "answered"
  | "praise";

export type ScriptureRef = { ref: string; role?: string };

export type PrayerTimelineLinkRef = {
  entry_id?: string;
  artifact_id?: string;
  verse_ref?: string;
};

export type PrayerRequestRow = {
  id: string;
  user_id: string;
  title: string;
  prayer_text: string;
  purpose: string;
  category: PrayerCategory;
  status: PrayerRequestStatus;
  requested_at: string;
  deadline: string | null;
  answered_at: string | null;
  amount_requested: number | null;
  amount_provided: number | null;
  answer_text: string | null;
  private_notes: string;
  scripture_refs: ScriptureRef[];
  praise_report_entry_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PrayerTimelineEventRow = {
  id: string;
  user_id: string;
  prayer_request_id: string;
  event_kind: PrayerTimelineEventKind;
  title: string;
  body: string | null;
  occurred_at: string;
  link_ref: PrayerTimelineLinkRef;
  created_at: string;
};

export type CreatePrayerRequestInput = {
  title: string;
  prayerText?: string;
  purpose?: string;
  category?: PrayerCategory;
  requestedAt?: string;
  deadline?: string | null;
  amountRequested?: number | null;
  scriptureRefs?: ScriptureRef[];
  privateNotes?: string;
};

export type UpdatePrayerRequestInput = Partial<{
  title: string;
  prayer_text: string;
  purpose: string;
  category: PrayerCategory;
  status: PrayerRequestStatus;
  requested_at: string;
  deadline: string | null;
  answered_at: string | null;
  amount_requested: number | null;
  amount_provided: number | null;
  answer_text: string | null;
  private_notes: string;
  scripture_refs: ScriptureRef[];
  praise_report_entry_id: string | null;
}>;

export type CreateTimelineEventInput = {
  prayerRequestId: string;
  eventKind: PrayerTimelineEventKind;
  title: string;
  body?: string | null;
  occurredAt?: string;
  linkRef?: PrayerTimelineLinkRef;
};

export type PraiseReportPeriod = "month" | "year" | "lifetime";

export function parseScriptureRefs(raw: Json | null | undefined): ScriptureRef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) => ({
      ref: String(item.ref ?? "").trim(),
      role: item.role != null ? String(item.role) : undefined,
    }))
    .filter((item) => item.ref.length > 0);
}

export function parseLinkRef(raw: Json | null | undefined): PrayerTimelineLinkRef {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  return {
    entry_id: typeof obj.entry_id === "string" ? obj.entry_id : undefined,
    artifact_id: typeof obj.artifact_id === "string" ? obj.artifact_id : undefined,
    verse_ref: typeof obj.verse_ref === "string" ? obj.verse_ref : undefined,
  };
}

export function rowToPrayerRequest(row: Record<string, unknown>): PrayerRequestRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: String(row.title ?? ""),
    prayer_text: String(row.prayer_text ?? ""),
    purpose: String(row.purpose ?? ""),
    category: row.category as PrayerCategory,
    status: row.status as PrayerRequestStatus,
    requested_at: String(row.requested_at),
    deadline: row.deadline != null ? String(row.deadline) : null,
    answered_at: row.answered_at != null ? String(row.answered_at) : null,
    amount_requested: row.amount_requested != null ? Number(row.amount_requested) : null,
    amount_provided: row.amount_provided != null ? Number(row.amount_provided) : null,
    answer_text: row.answer_text != null ? String(row.answer_text) : null,
    private_notes: String(row.private_notes ?? ""),
    scripture_refs: parseScriptureRefs(row.scripture_refs as Json),
    praise_report_entry_id:
      row.praise_report_entry_id != null ? String(row.praise_report_entry_id) : null,
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function rowToTimelineEvent(row: Record<string, unknown>): PrayerTimelineEventRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    prayer_request_id: String(row.prayer_request_id),
    event_kind: row.event_kind as PrayerTimelineEventKind,
    title: String(row.title ?? ""),
    body: row.body != null ? String(row.body) : null,
    occurred_at: String(row.occurred_at),
    link_ref: parseLinkRef(row.link_ref as Json),
    created_at: String(row.created_at),
  };
}
