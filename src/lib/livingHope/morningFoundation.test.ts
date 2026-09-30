import { beforeEach, describe, expect, it } from "vitest";
import { appendMorningAction, carryMorningAction, emptyMorningFoundation, emptyMorningFoundationSession, formatMorningFoundationJournal, initializeMorningFoundationSession, mergeMorningFoundation, mergeMorningMemories, parseMorningFoundationSession, parseMorningMemories, type MorningMemory } from "./morningFoundation";
import { emptyWorkbook, mergeWorkbook } from "./workbookTypes";
import { buildRitualSteps, parseConnectionNotes } from "./morningRitual";
import { emptyMorningRitualDraftFields, loadMorningRitualDraft, saveMorningRitualDraft } from "./morningRitualDraft";
import { buildMorningReviewJournalContent } from "./morningReviewJournal";

const memory = (id = "real-1"): MorningMemory => ({ id, kind: "real_memory", title: "A real conversation", body: "We sat together and listened.", happenedOn: "Last spring", photoPath: "", audioPath: "", sceneId: "scene-1" });
beforeEach(() => localStorage.clear());
describe("personal foundation and real memories", () => {
  it("loads older workbooks without inventing a theme or a testimony", () => {
    const workbook = mergeWorkbook({ stories: [{ id: "s", text: "An imagined future" }] });
    expect(workbook.morning_foundation).toEqual(emptyMorningFoundation());
    expect(workbook.morning_memories).toEqual([]);
    expect(workbook.stories[0].text).toBe("An imagined future");
  });
  it("rejects future stories and malformed records rather than relabeling them as memories", () => {
    expect(parseMorningMemories([{ id: "s", title: "Future", body: "Imagined" }, null, { ...memory(), kind: "future_scene" }, { ...memory(), title: "" }])).toEqual([]);
    expect(parseMorningMemories([memory(), memory()])).toEqual([memory()]);
  });
  it("adds no required steps in full or express mornings", () => {
    const old = emptyWorkbook();
    const filled = { ...old, morning_foundation: { ...emptyMorningFoundation(), theme: "Practice presence" }, morning_memories: [memory()] };
    expect(buildRitualSteps(filled, [])).toEqual(buildRitualSteps(old, []));
    expect(buildRitualSteps(filled, [], true)).toEqual(buildRitualSteps(old, [], true));
  });
  it("merges independent settings without wiping remote changes", () => {
    const base = emptyMorningFoundation();
    expect(mergeMorningFoundation(base, { ...base, theme: "Focus" }, { ...base, motto: "Be present" })).toMatchObject({ theme: "Focus", motto: "Be present" });
  });
  it("rejects conflicting edits to the same setting", () => {
    const base = emptyMorningFoundation();
    expect(() => mergeMorningFoundation(base, { ...base, theme: "Local" }, { ...base, theme: "Remote" })).toThrow(/another device/);
  });
  it("preserves new remote memories during a stale-tab edit", () => {
    const first = memory(); const remote = memory("remote");
    expect(mergeMorningMemories([first], [{ ...first, title: "Renamed" }], [first, remote])).toEqual([{ ...first, title: "Renamed" }, remote]);
  });
  it("merges independent fields of the same memory", () => {
    const first = memory();
    expect(mergeMorningMemories([first], [{ ...first, title: "Renamed" }], [{ ...first, body: "Remote reflection" }])[0]).toMatchObject({ title: "Renamed", body: "Remote reflection" });
  });
  it("honors explicit deletion but refuses to delete a newly edited remote memory", () => {
    const first = memory();
    expect(mergeMorningMemories([first], [], [first, memory("remote")])).toEqual([memory("remote")]);
    expect(() => mergeMorningMemories([first], [], [{ ...first, body: "Remote edit" }])).toThrow(/changed on another device/);
  });
  it("does not resurrect a deleted remote memory", () => {
    const first = memory();
    expect(mergeMorningMemories([first], [first], [])).toEqual([]);
    expect(() => mergeMorningMemories([first], [{ ...first, title: "Edit" }], [])).toThrow(/removed on another device/);
  });
  it("snapshots settings once, preserving an in-progress morning", () => {
    const day = initializeMorningFoundationSession({ ...emptyMorningFoundation(), theme: "Original" }, emptyMorningFoundationSession());
    expect(initializeMorningFoundationSession({ ...emptyMorningFoundation(), theme: "Changed later" }, day)).toBe(day);
  });
  it("fills only a blank assignment and appends without duplicating multiline actions", () => {
    expect(carryMorningAction("Existing priority", "New action")).toBe("Existing priority");
    expect(carryMorningAction("  ", " New action ")).toBe("New action");
    const action = "Listen first.\nRespond calmly.";
    expect(appendMorningAction(`Existing\n${action}`, action)).toBe(`Existing\n${action}`);
    expect(appendMorningAction("Existing", action)).toBe(`Existing\n${action}`);
    expect(appendMorningAction("Existing", "")).toBe("Existing");
  });
  it("round-trips the daily snapshot through existing owner-scoped drafts and connection notes", () => {
    const foundation = { ...emptyMorningFoundationSession(), initialized: true, theme: "Daily focus", memory: memory(), memoryReflection: "I appreciated being heard", sceneId: "scene-1", sceneTitle: "A future dinner", action: "Put my phone away at dinner" };
    saveMorningRitualDraft("owner", { ...emptyMorningRitualDraftFields(), foundation, steps: buildRitualSteps(emptyWorkbook(), []), stepIndex: 2, expressMode: false, guidedMode: true });
    expect(loadMorningRitualDraft("owner")?.foundation).toEqual(foundation);
    expect(loadMorningRitualDraft("someone-else")).toBeNull();
    expect(parseConnectionNotes({ foundation }).foundation).toEqual(foundation);
    expect(parseMorningFoundationSession(null)).toEqual(emptyMorningFoundationSession());
  });
  it("keeps the original real-memory snapshot distinct from a later edited workbook and future scene", () => {
    const foundation = { ...emptyMorningFoundationSession(), initialized: true, memory: memory(), sceneTitle: "A future dinner", action: "Listen today" };
    const journal = buildMorningReviewJournalContent({ reviewDate: "2026-09-29", surrenderNote: "", goalTouches: [], workbook: { ...emptyWorkbook(), morning_memories: [{ ...memory(), title: "Later edit" }] }, goals: [], connectionNotes: { foundation } });
    expect(journal.body).toContain("Remember — a real memory I selected");
    expect(journal.body).toContain("A real conversation");
    expect(journal.body).toContain("future scene, not a past event");
    expect(journal.body).not.toContain("Later edit");
  });
  it("does not manufacture a journal section for unused setup", () => {
    expect(formatMorningFoundationJournal(emptyMorningFoundationSession())).toBe("");
  });
});
