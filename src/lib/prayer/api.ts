import { supabase } from "@/integrations/supabase/client";
import { throwSupabaseError } from "@/lib/supabase/errors";
import { localDateISO } from "@/lib/habits/dates";
import {
  buildAskedEventTitle,
  requestedAtToIso,
} from "@/lib/prayer/timeline";
import type {
  CreatePrayerRequestInput,
  CreateTimelineEventInput,
  PrayerCategory,
  PrayerRequestRow,
  PrayerRequestStatus,
  PrayerTimelineEventRow,
  UpdatePrayerRequestInput,
} from "@/lib/prayer/types";
import { rowToPrayerRequest, rowToTimelineEvent } from "@/lib/prayer/types";

const REQUEST_SELECT =
  "id,user_id,title,prayer_text,purpose,category,status,requested_at,deadline,answered_at,amount_requested,amount_provided,answer_text,private_notes,scripture_refs,praise_report_entry_id,sort_order,created_at,updated_at";

const TIMELINE_SELECT =
  "id,user_id,prayer_request_id,event_kind,title,body,occurred_at,link_ref,created_at";

export async function listPrayerRequests(
  userId: string,
  opts?: { status?: PrayerRequestStatus | "all"; category?: PrayerCategory | "all" },
): Promise<PrayerRequestRow[]> {
  let q = supabase
    .from("prayer_requests")
    .select(REQUEST_SELECT)
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (opts?.status && opts.status !== "all") q = q.eq("status", opts.status);
  if (opts?.category && opts.category !== "all") q = q.eq("category", opts.category);

  const { data, error } = await q;
  if (error) throwSupabaseError(error);
  return (data ?? []).map((row) => rowToPrayerRequest(row as Record<string, unknown>));
}

export async function countWaitingPrayerRequests(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("prayer_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "waiting");
  if (error) throwSupabaseError(error);
  return count ?? 0;
}

export async function fetchPrayerRequest(
  userId: string,
  id: string,
): Promise<PrayerRequestRow | null> {
  const { data, error } = await supabase
    .from("prayer_requests")
    .select(REQUEST_SELECT)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throwSupabaseError(error);
  if (!data) return null;
  return rowToPrayerRequest(data as Record<string, unknown>);
}

export async function createPrayerRequest(
  userId: string,
  input: CreatePrayerRequestInput,
): Promise<PrayerRequestRow | null> {
  const requestedAt = input.requestedAt ?? localDateISO();
  const { data, error } = await supabase
    .from("prayer_requests")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      prayer_text: input.prayerText?.trim() ?? "",
      purpose: input.purpose?.trim() ?? "",
      category: input.category ?? "finances",
      requested_at: requestedAt,
      deadline: input.deadline || null,
      amount_requested: input.amountRequested ?? null,
      private_notes: input.privateNotes?.trim() ?? "",
      scripture_refs: input.scriptureRefs ?? [],
      status: "waiting",
    })
    .select(REQUEST_SELECT)
    .maybeSingle();
  if (error) throwSupabaseError(error);
  if (!data) return null;

  const row = rowToPrayerRequest(data as Record<string, unknown>);
  await createTimelineEvent(userId, {
    prayerRequestId: row.id,
    eventKind: "asked",
    title: buildAskedEventTitle(row.title),
    body: row.prayer_text || null,
    occurredAt: requestedAtToIso(requestedAt),
  });
  return row;
}

export async function updatePrayerRequest(
  userId: string,
  id: string,
  patch: UpdatePrayerRequestInput,
): Promise<PrayerRequestRow | null> {
  const { data, error } = await supabase
    .from("prayer_requests")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select(REQUEST_SELECT)
    .maybeSingle();
  if (error) throwSupabaseError(error);
  if (!data) return null;
  return rowToPrayerRequest(data as Record<string, unknown>);
}

export async function deletePrayerRequest(userId: string, id: string): Promise<boolean> {
  const { error } = await supabase.from("prayer_requests").delete().eq("user_id", userId).eq("id", id);
  if (error) throwSupabaseError(error);
  return true;
}

export async function listScriptureTimelineRefsByRequestIds(
  userId: string,
  requestIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!requestIds.length) return map;

  const { data, error } = await supabase
    .from("prayer_request_timeline_events")
    .select(TIMELINE_SELECT)
    .eq("user_id", userId)
    .eq("event_kind", "scripture")
    .in("prayer_request_id", requestIds);
  if (error) throwSupabaseError(error);

  for (const row of data ?? []) {
    const event = rowToTimelineEvent(row as Record<string, unknown>);
    const requestId = event.prayer_request_id;
    const verseRef = event.link_ref.verse_ref?.trim() || event.title.replace(/^Read\s+/i, "").trim();
    if (!verseRef) continue;
    const existing = map.get(requestId) ?? [];
    if (!existing.some((r) => r.toLowerCase() === verseRef.toLowerCase())) {
      map.set(requestId, [...existing, verseRef]);
    }
  }

  return map;
}

export async function listTimelineEvents(
  userId: string,
  prayerRequestId: string,
): Promise<PrayerTimelineEventRow[]> {
  const { data, error } = await supabase
    .from("prayer_request_timeline_events")
    .select(TIMELINE_SELECT)
    .eq("user_id", userId)
    .eq("prayer_request_id", prayerRequestId)
    .order("occurred_at", { ascending: true });
  if (error) throwSupabaseError(error);
  return (data ?? []).map((row) => rowToTimelineEvent(row as Record<string, unknown>));
}

export async function listAllTimelineEvents(userId: string): Promise<
  (PrayerTimelineEventRow & { request_title?: string })[]
> {
  const { data, error } = await supabase
    .from("prayer_request_timeline_events")
    .select(`${TIMELINE_SELECT}, prayer_requests(title)`)
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (error) throwSupabaseError(error);

  return (data ?? []).map((row) => {
    const base = rowToTimelineEvent(row as Record<string, unknown>);
    const req = (row as { prayer_requests?: { title?: string } | null }).prayer_requests;
    return { ...base, request_title: req?.title };
  });
}

export async function createTimelineEvent(
  userId: string,
  input: CreateTimelineEventInput,
): Promise<PrayerTimelineEventRow | null> {
  const { data, error } = await supabase
    .from("prayer_request_timeline_events")
    .insert({
      user_id: userId,
      prayer_request_id: input.prayerRequestId,
      event_kind: input.eventKind,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      link_ref: input.linkRef ?? {},
    })
    .select(TIMELINE_SELECT)
    .maybeSingle();
  if (error) throwSupabaseError(error);
  if (!data) return null;
  return rowToTimelineEvent(data as Record<string, unknown>);
}

export async function deleteTimelineEvent(userId: string, eventId: string): Promise<boolean> {
  const { error } = await supabase
    .from("prayer_request_timeline_events")
    .delete()
    .eq("user_id", userId)
    .eq("id", eventId);
  if (error) throwSupabaseError(error);
  return true;
}

export async function fetchRequestsByPraiseEntryIds(
  userId: string,
  entryIds: string[],
): Promise<Map<string, PrayerRequestRow>> {
  if (!entryIds.length) return new Map();
  const { data, error } = await supabase
    .from("prayer_requests")
    .select(REQUEST_SELECT)
    .eq("user_id", userId)
    .in("praise_report_entry_id", entryIds);
  if (error) throwSupabaseError(error);
  const map = new Map<string, PrayerRequestRow>();
  for (const row of data ?? []) {
    const parsed = rowToPrayerRequest(row as Record<string, unknown>);
    if (parsed.praise_report_entry_id) map.set(parsed.praise_report_entry_id, parsed);
  }
  return map;
}

export async function linkJournalEntryToRequest(
  userId: string,
  entryId: string,
  prayerRequestId: string,
): Promise<void> {
  const { error } = await supabase.from("journal_entry_links").insert({
    user_id: userId,
    entry_id: entryId,
    target_kind: "prayer_request",
    target_ref: { id: prayerRequestId },
  });
  if (error && !/duplicate|unique/i.test(error.message)) throwSupabaseError(error);
}
