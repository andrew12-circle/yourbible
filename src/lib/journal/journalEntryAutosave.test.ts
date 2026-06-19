import { describe, expect, it } from "vitest";
import { buildFlushPayload, mergePendingPatches } from "./journalEntryAutosave";

describe("journalEntryAutosave", () => {
  it("merges pending patches", () => {
    expect(mergePendingPatches({ body: "a" }, { title: "t" })).toEqual({ body: "a", title: "t" });
    expect(mergePendingPatches({ body: "a" }, { body: "b" })).toEqual({ body: "b" });
  });

  it("builds flush payload from latest current row", () => {
    const pending = { body: "stale", title: "old" };
    const current = { body: "latest body", title: "latest title", mood: 3 };
    expect(buildFlushPayload(pending, current)).toEqual({
      body: "latest body",
      title: "latest title",
    });
  });
});
