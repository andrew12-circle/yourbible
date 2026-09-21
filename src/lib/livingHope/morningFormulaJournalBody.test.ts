import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: db }));
import { mergeMorningReviewBody, MORNING_REVIEW_START, replaceMorningSection, updateMorningFormulaEntry } from "./morningFormulaJournalBody";

const original = "## Worship\n\nYou are good.\n\n## Thanksgiving\n\nOur family.\n\n## What's on my heart\n\n[[video:keep-this-id]]\nMy own words.\n\n## Listening\n\nBe still.";
const compiled = "## Thanksgiving\n\nOur family.\n\n## Conversation\n\n[[entry:self]]\n\n## Scripture\n\nPsalm 23\n\n## Surrender\n\nI surrender.";
describe("one Morning Formula journal body", () => {
  it("keeps video tokens, heart writing, and listening while appending completion", () => {
    const next = mergeMorningReviewBody(original, compiled);
    expect(next).toContain(original);
    expect(next).toContain("Psalm 23");
    expect(next).not.toContain("[[entry:self]]");
    expect(next.match(/## Thanksgiving/g)).toHaveLength(1);
  });
  it("is idempotent when completion is retried", () => {
    const once = mergeMorningReviewBody(original, compiled);
    expect(mergeMorningReviewBody(once, compiled)).toBe(once);
  });
  it("updates the managed summary without erasing writing after it", () => {
    const once = mergeMorningReviewBody(original, compiled) + "\nAfter my session";
    const next = mergeMorningReviewBody(once, compiled.replace("Psalm 23", "Psalm 24"));
    expect(next).toContain("After my session");
    expect(next.match(/<!-- morning-formula-review:start -->/g)).toHaveLength(1);
    expect(next).not.toContain("Psalm 23");
  });
  it("section saves cannot erase the completed summary", () => {
    const completed = mergeMorningReviewBody(original, compiled);
    const next = replaceMorningSection(completed, "## Listening", "New listening note");
    expect(next).toContain(MORNING_REVIEW_START);
    expect(next).toContain("Psalm 23");
    expect(next).toContain("[[video:keep-this-id]]");
  });
  it("handles missing headings without discarding a following section", () => {
    const next = replaceMorningSection("## Listening\nKeep me", "## What's on my heart", "Honest words", "## Listening");
    expect(next.indexOf("Honest words")).toBeLessThan(next.indexOf("Keep me"));
  });
});

describe("serialized revision-checked morning writes", () => {
  const responses: unknown[] = [];
  const writes: Record<string, unknown>[] = [];
  const filters: unknown[][] = [];
  beforeEach(() => {
    responses.length = 0; writes.length = 0; filters.length = 0;
    db.from.mockImplementation(() => {
      const builder = { select: vi.fn(() => builder), update: vi.fn((value) => { writes.push(value); return builder; }),
        eq: vi.fn((...args) => { filters.push(args); return builder; }), maybeSingle: vi.fn(async () => responses.shift()) };
      return builder;
    });
  });
  const row = (body: string, revision: number, e2e_encrypted = false) => ({ data: { body, revision, tags: ["keep-tag"], e2e_encrypted }, error: null });
  it("re-reads after a revision conflict and preserves concurrent content", async () => {
    responses.push(row("first", 1), { data: null, error: null }, row("first + remote note", 2), { data: { id: "entry" }, error: null });
    await updateMorningFormulaEntry("user", "entry", (body) => body + " + summary", { extraTags: ["morning"], summary: "Done" });
    expect(writes[1]).toMatchObject({ body: "first + remote note + summary", tags: ["keep-tag", "morning"] });
    expect(filters).toContainEqual(["user_id", "user"]);
    expect(filters).toContainEqual(["revision", 2]);
    expect(writes[1]).not.toHaveProperty("entry_at_ts");
    expect(writes[1]).not.toHaveProperty("journal_id");
  });
  it("rejects encrypted content without attempting plaintext update", async () => {
    responses.push(row("ciphertext", 1, true));
    await expect(updateMorningFormulaEntry("user", "private", () => "unsafe")).rejects.toThrow("unlock");
    expect(writes).toHaveLength(0);
  });
  it("surfaces fetch and save errors rather than reporting completion", async () => {
    responses.push({ data: null, error: new Error("offline") });
    await expect(updateMorningFormulaEntry("user", "entry", (v) => v)).rejects.toThrow("offline");
    responses.push(row("body", 1), { data: null, error: new Error("denied") });
    await expect(updateMorningFormulaEntry("user", "entry", (v) => v)).rejects.toThrow("denied");
  });
  it("serializes two writes to the same entry in invocation order", async () => {
    responses.push(row("", 1), { data: { id: "entry" } }, row("older", 2), { data: { id: "entry" } });
    await Promise.all([updateMorningFormulaEntry("user", "entry", () => "older"), updateMorningFormulaEntry("user", "entry", () => "newest")]);
    expect(writes.map((w) => w.body)).toEqual(["older", "newest"]);
  });
});
