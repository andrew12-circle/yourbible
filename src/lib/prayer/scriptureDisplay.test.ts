import { describe, expect, it } from "vitest";
import {
  mergeScriptureDisplay,
  mergeScriptureRefStrings,
  scriptureRefsFromTimeline,
} from "@/lib/prayer/scriptureDisplay";
import type { PrayerTimelineEventRow } from "@/lib/prayer/types";

function timelineEvent(
  partial: Partial<PrayerTimelineEventRow> & Pick<PrayerTimelineEventRow, "event_kind" | "title">,
): PrayerTimelineEventRow {
  return {
    id: "e1",
    user_id: "u1",
    prayer_request_id: "r1",
    body: null,
    occurred_at: "2026-07-01T12:00:00Z",
    link_ref: {},
    created_at: "2026-07-01T12:00:00Z",
    ...partial,
  };
}

describe("scriptureDisplay", () => {
  it("merges form refs and timeline refs without duplicates", () => {
    const merged = mergeScriptureRefStrings(
      [{ ref: "Philippians 4:19" }],
      ["Matthew 6:33", "philippians 4:19"],
    );
    expect(merged).toEqual(["Philippians 4:19", "Matthew 6:33"]);
  });

  it("reads verse refs from timeline link_ref or title", () => {
    const refs = scriptureRefsFromTimeline([
      timelineEvent({
        event_kind: "scripture",
        title: "Read John 3:16",
        link_ref: { verse_ref: "John 3:16" },
      }),
      timelineEvent({
        event_kind: "note",
        title: "Note",
      }),
      timelineEvent({
        event_kind: "scripture",
        title: "Read Romans 8:28",
        link_ref: {},
      }),
    ]);
    expect(refs).toEqual(["John 3:16", "Romans 8:28"]);
  });

  it("mergeScriptureDisplay combines both sources", () => {
    const result = mergeScriptureDisplay(
      [{ ref: "Psalm 23:1" }],
      [
        timelineEvent({
          event_kind: "scripture",
          title: "Read Isaiah 41:10",
          link_ref: { verse_ref: "Isaiah 41:10" },
        }),
      ],
    );
    expect(result).toEqual(["Psalm 23:1", "Isaiah 41:10"]);
  });
});
