import { describe, expect, it } from "vitest";
import { buildMorningReviewJournalContent, morningReviewTag } from "@/lib/livingHope/morningReviewJournal";
import { emptyWorkbook } from "@/lib/livingHope/workbookTypes";

describe("buildMorningReviewJournalContent", () => {
  it("builds sections from workbook and touches", () => {
    const wb = emptyWorkbook();
    wb.manifesto = [{ id: "m1", text: "I am submitted to God." }];
    wb.stories = [{ id: "s1", text: "Walking into the office with peace." }];
    wb.vision_headline = "Seven figures, clean structure.";
    wb.metrics = [{ id: "met1", label: "Revenue", unit: "USD" }];

    const { title, body, summary, verseRefs } = buildMorningReviewJournalContent({
      reviewDate: "2026-06-11",
      surrenderNote: "Father, not my will but Yours.",
      visionRecall: "I see the dashboard green.",
      goalTouches: [
        { goal_id: "g1", vivid_recall: "Team aligned", obedience_step: "Send one email" },
      ],
      manifestoIndex: 0,
      storyIndex: 0,
      metricValues: { met1: "12000" },
      workbook: wb,
      goals: [
        {
          id: "g1",
          user_id: "u",
          letter_id: null,
          title: "Launch product",
          domain: "business",
          vivid_detail: null,
          target_metric: "$10k MRR",
          steps: [],
          scripture_refs: ["Prov 16:3"],
          sort_order: 0,
          status: "active",
          parent_goal_id: null,
          created_at: "",
          updated_at: "",
        },
      ],
    });

    expect(title).toContain("Morning formula");
    expect(body).toContain("I am submitted to God.");
    expect(body).toContain("Seven figures");
    expect(body).toContain("Launch product");
    expect(body).toContain("Obedience step");
    expect(body).toContain("Revenue");
    expect(body).toContain("Father, not my will");
    expect(summary).toContain("dashboard green");
    expect(verseRefs).toContain("Rom 12:2");
    expect(verseRefs).toContain("Prov 16:3");
  });

  it("uses stable tag for idempotent lookup", () => {
    expect(morningReviewTag("2026-06-11")).toBe("lh-review:2026-06-11");
  });
});
