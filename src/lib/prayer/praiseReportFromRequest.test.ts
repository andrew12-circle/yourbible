import { describe, expect, it } from "vitest";
import { buildPraiseReportBody, buildPraiseReportTitle } from "@/lib/prayer/praiseReportFromRequest";

describe("buildPraiseReportTitle", () => {
  it("prefixes with Answered", () => {
    expect(buildPraiseReportTitle({ title: "CRM payroll" })).toBe("Answered: CRM payroll");
  });
});

describe("buildPraiseReportBody", () => {
  it("formats celebration memorial text", () => {
    const body = buildPraiseReportBody({
      title: "CRM payroll",
      requested_at: "2026-07-02",
      answered_at: "2026-08-14",
      prayer_text: "Lord, provide enough business to cover payroll.",
      answer_text: "Closed three unexpected loans that fully covered payroll.",
      status: "answered",
    });
    expect(body).toContain("**Requested:** July 2, 2026");
    expect(body).toContain("**Waited:** 43 days");
    expect(body).toContain("Closed three unexpected loans");
  });

  it("notes different answer status", () => {
    const body = buildPraiseReportBody({
      title: "Job",
      requested_at: "2026-01-01",
      answered_at: "2026-02-01",
      prayer_text: "Open doors",
      answer_text: "A different role appeared",
      status: "different_answer",
    });
    expect(body).toContain("differently than I expected");
  });
});
