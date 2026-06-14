import { describe, expect, it } from "vitest";
import { buildRitualSteps } from "@/lib/livingHope/morningRitual";
import {
  compactThanksgivingLists,
  emptyThanksgivingLists,
  formatThanksgivingJournalBody,
  parseThanksgivingLists,
} from "@/lib/livingHope/morningRitual";
import { emptyWorkbook } from "@/lib/livingHope/workbookTypes";

describe("buildRitualSteps", () => {
  it("always includes surrender then covering before assignment", () => {
    const kinds = buildRitualSteps(null, []).map((s) => s.kind);
    const surrenderIdx = kinds.indexOf("surrender");
    const coveringIdx = kinds.indexOf("covering");
    const assignmentIdx = kinds.indexOf("assignment");
    expect(surrenderIdx).toBeGreaterThan(-1);
    expect(coveringIdx).toBe(surrenderIdx + 1);
    expect(assignmentIdx).toBe(coveringIdx + 1);
  });

  it("always starts with connection steps before alignment", () => {
    const steps = buildRitualSteps(null, []);
    const kinds = steps.map((s) => s.kind);
    expect(kinds.slice(0, 5)).toEqual(["intro", "worship", "thanksgiving", "scripture", "prayer"]);
    expect(kinds).toContain("assignment");
    expect(kinds).toContain("surrender");
    expect(kinds).toContain("covering");
    expect(kinds[kinds.length - 1]).toBe("done");
  });

  it("includes workbook steps when content exists", () => {
    const wb = emptyWorkbook();
    wb.manifesto = [{ id: "m1", text: "Submitted to God." }];
    wb.stories = [{ id: "s1", text: "Peace at the office." }];
    wb.vision_headline = "Seven figures.";

    const steps = buildRitualSteps(wb, []);
    const kinds = steps.map((s) => s.kind);
    expect(kinds).toContain("manifesto");
    expect(kinds).toContain("vision");
    expect(kinds).toContain("story");
    expect(kinds).toContain("covering");
    const surrenderIdx = kinds.indexOf("surrender");
    const coveringIdx = kinds.indexOf("covering");
    const assignmentIdx = kinds.indexOf("assignment");
    const manifestoIdx = kinds.indexOf("manifesto");
    expect(manifestoIdx).toBeLessThan(surrenderIdx);
    expect(surrenderIdx).toBeLessThan(coveringIdx);
    expect(coveringIdx).toBeLessThan(assignmentIdx);
  });

  it("includes story step for empty workbook so scenes can be added in flow", () => {
    const wb = emptyWorkbook();
    const kinds = buildRitualSteps(wb, []).map((s) => s.kind);
    expect(kinds).toContain("story");
  });
});

describe("thanksgiving lists", () => {
  it("parses five-item now and not-yet lists", () => {
    const lists = parseThanksgivingLists({
      thanksgiving_now: ["Salvation", "Family", "", "", ""],
      thanksgiving_not_yet: ["Seven figures", "", "", "", ""],
    });
    expect(lists.now[0]).toBe("Salvation");
    expect(lists.notYet[0]).toBe("Seven figures");
    expect(lists.now).toHaveLength(5);
  });

  it("migrates legacy thanksgiving_note into first now slot", () => {
    const lists = parseThanksgivingLists({ thanksgiving_note: "Family and provision." });
    expect(lists.now[0]).toBe("Family and provision.");
    expect(lists.notYet.every((s) => !s.trim())).toBe(true);
  });

  it("formats journal body with both sections", () => {
    const body = formatThanksgivingJournalBody({
      now: ["Salvation", "Family", "", "", ""],
      notYet: ["Paid-off home", "", "", "", ""],
    });
    expect(body).toContain("Thankful now");
    expect(body).toContain("not yet come");
    expect(body).toContain("1. Salvation");
    expect(body).toContain("1. Paid-off home");
  });

  it("compactThanksgivingLists omits empty arrays", () => {
    const compact = compactThanksgivingLists(emptyThanksgivingLists());
    expect(compact.thanksgiving_now).toBeUndefined();
    expect(compact.thanksgiving_not_yet).toBeUndefined();
  });
});
