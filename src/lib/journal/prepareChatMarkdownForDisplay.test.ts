import { describe, expect, it } from "vitest";
import { prepareChatMarkdownForDisplay } from "./prepareChatMarkdownForDisplay";

describe("prepareChatMarkdownForDisplay", () => {
  it("splits wall-of-text into paragraph breaks", () => {
    const raw =
      "First sentence about weight. Second sentence about faith. Third adds context. Fourth asks what you think. Fifth closes the loop.";
    const out = prepareChatMarkdownForDisplay(raw);
    expect(out.split("\n\n").length).toBeGreaterThan(1);
  });

  it("breaks inline list markers onto their own lines", () => {
    const raw = "Consider these examples: - Joseph in prison. - David on the run. - Paul in chains.";
    const out = prepareChatMarkdownForDisplay(raw);
    expect(out).toContain("\n\n- ");
  });

  it("preserves existing double newlines", () => {
    const raw = "Paragraph one.\n\nParagraph two.";
    expect(prepareChatMarkdownForDisplay(raw)).toBe("Paragraph one.\n\nParagraph two.");
  });

  it("strips citation tokens while formatting", () => {
    const raw = "You wrote [[journal:798b717b-63c9-4070-b929-bb50144021]] that trust matters. Then more followed.";
    const out = prepareChatMarkdownForDisplay(raw);
    expect(out).not.toContain("journal:");
    expect(out.split("\n\n").length).toBeGreaterThanOrEqual(1);
  });
});
