import type { PrayerTimelineEventRow, ScriptureRef } from "@/lib/prayer/types";

export function scriptureRefFromTimelineEvent(event: PrayerTimelineEventRow): string | null {
  if (event.event_kind !== "scripture") return null;
  const fromLink = event.link_ref.verse_ref?.trim();
  if (fromLink) return fromLink;
  const fromTitle = event.title.replace(/^Read\s+/i, "").trim();
  return fromTitle || null;
}

export function scriptureRefsFromTimeline(events: PrayerTimelineEventRow[]): string[] {
  const refs: string[] = [];
  for (const event of events) {
    const ref = scriptureRefFromTimelineEvent(event);
    if (ref) refs.push(ref);
  }
  return refs;
}

export function mergeScriptureRefStrings(refs: ScriptureRef[], timelineRefs: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const item of refs) {
    const key = item.ref.toLowerCase();
    if (!item.ref || seen.has(key)) continue;
    seen.add(key);
    merged.push(item.ref);
  }

  for (const ref of timelineRefs) {
    const key = ref.toLowerCase();
    if (!ref || seen.has(key)) continue;
    seen.add(key);
    merged.push(ref);
  }

  return merged;
}

export function mergeScriptureDisplay(
  refs: ScriptureRef[],
  events: PrayerTimelineEventRow[],
): string[] {
  return mergeScriptureRefStrings(refs, scriptureRefsFromTimeline(events));
}

export function formatScriptureRefsList(refs: string[]): string {
  return refs.join(", ");
}
