import { describe, expect, it } from "vitest";
import { buildRitualSteps } from "@/lib/livingHope/morningRitual";
import { emptyWorkbook } from "@/lib/livingHope/workbookTypes";

describe("buildRitualSteps", () => {
  it("always starts with connection steps before alignment", () => {
    const steps = buildRitualSteps(null, []);
    const kinds = steps.map((s) => s.kind);
    expect(kinds.slice(0, 5)).toEqual(["intro", "worship", "thanksgiving", "scripture", "prayer"]);
    expect(kinds).toContain("assignment");
    expect(kinds).toContain("surrender");
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
    const assignmentIdx = kinds.indexOf("assignment");
    const manifestoIdx = kinds.indexOf("manifesto");
    expect(manifestoIdx).toBeLessThan(assignmentIdx);
  });
});
