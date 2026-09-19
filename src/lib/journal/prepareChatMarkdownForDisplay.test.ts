import { describe, expect, it } from "vitest";
import { prepareChatMarkdownForDisplay } from "./prepareChatMarkdownForDisplay";

describe("prepareChatMarkdownForDisplay", () => {
  it("splits short multi-sentence lines into one sentence per paragraph", () => {
    const raw = "That's beautiful. I'm glad you felt peace.";
    const out = prepareChatMarkdownForDisplay(raw);
    expect(out).toBe("That's beautiful.\n\nI'm glad you felt peace.");
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

  it("splits long blocks even when double newlines exist elsewhere", () => {
    const long =
      "Sentence one about prayer. Sentence two about grace. Sentence three about ministry. Sentence four about tradition. Sentence five about history. Sentence six wraps up.";
    const raw = `Short intro.\n\n${long}`;
    const out = prepareChatMarkdownForDisplay(raw);
    expect(out.startsWith("Short intro.")).toBe(true);
    expect(out.split("\n\n").length).toBeGreaterThan(2);
  });

  it("breaks before transition phrases", () => {
    const raw =
      "Many teachers hold this view. However, others disagree strongly. Similarly, historians note context.";
    const out = prepareChatMarkdownForDisplay(raw);
    expect(out).toContain("\n\nHowever");
    expect(out).toContain("\n\nSimilarly");
  });

  it("merges consecutive blockquote blocks into one prayer", () => {
    const raw = "> God, I thank You for the peace.\n\n> Now, as Caroline arrives, guide me.\n\n> Amen.";
    const out = prepareChatMarkdownForDisplay(raw);
    expect(out).toMatch(/^> God, I thank You.*Amen\.\s*$/s);
    expect(out.match(/^>\s/gm)?.length).toBe(1);
  });

  it("formats long quoted prayers as one blockquote", () => {
    const raw =
      'Try this: "Dear Jesus, I come before You with a heart that wants to honor You. Guide my steps today. Give me strength for what is ahead. Amen." What do you think?';
    const out = prepareChatMarkdownForDisplay(raw);
    expect(out).toContain("> Dear Jesus");
    expect(out).toContain("Amen.");
    expect(out.match(/^>\s/gm)?.length).toBe(1);
  });

  it("breaks before reflective closing questions", () => {
    const raw =
      "That peace is a gift worth holding onto. As you think about what needs to get done, what feels like the next step?";
    const out = prepareChatMarkdownForDisplay(raw);
    expect(out).toContain("\n\nAs you think");
  });

  it("preserves bold numbered sections without splitting asterisks", () => {
    const raw =
      "**1. Water. Bathroom. Brush teeth.**\n\n**2. Get dressed. Eat breakfast.**";
    const out = prepareChatMarkdownForDisplay(raw);
    expect(out).toContain("**1. Water. Bathroom. Brush teeth.**");
    expect(out).toContain("**2. Get dressed. Eat breakfast.**");
    expect(out).not.toMatch(/\*\*1\.\n\n/);
  });

  it("preserves multiline bullet lists without breaking list markers", () => {
    const raw = "- Water.\n- Bathroom.\n- Brush teeth.";
    const out = prepareChatMarkdownForDisplay(raw);
    expect(out).toBe("- Water.\n- Bathroom.\n- Brush teeth.");
  });

  it("joins ordered list markers split from their item text", () => {
    const raw = "Start with this:\n\n1.\nOnly the first clean, silent instruction.\n\n2.\nThen the next small step.";
    const out = prepareChatMarkdownForDisplay(raw);
    expect(out).toContain("1. Only the first clean, silent instruction.");
    expect(out).toContain("2. Then the next small step.");
    expect(out).not.toContain("1.\nOnly");
  });
});
