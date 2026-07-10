import { describe, expect, it } from "vitest";
import { parseChatPrayer, splitPrayerSentences } from "./parseChatPrayer";

describe("parseChatPrayer", () => {
  it("splits title line from prayer body", () => {
    const raw =
      "Be Strong in Grace\n\nFather, bring me out of overwhelm and into obedience. Give me a sound mind.";
    const out = parseChatPrayer(raw);
    expect(out.title).toBe("Be Strong in Grace");
    expect(out.body).toMatch(/^Father,/);
    expect(out.label).toBe("Morning Prayer");
  });

  it("derives a title when none is provided", () => {
    const raw = "Father, guide my steps today and give me peace for what is ahead. Amen.";
    const out = parseChatPrayer(raw);
    expect(out.body).toMatch(/^Father,/);
    expect(out.title.length).toBeGreaterThan(0);
  });

  it("detects evening prayers", () => {
    const raw = "Lord, as this evening closes, help me rest in Your care. Amen.";
    expect(parseChatPrayer(raw).label).toBe("Evening Prayer");
  });
});

describe("splitPrayerSentences", () => {
  it("splits prayer into sentence-sized verses", () => {
    const out = splitPrayerSentences(
      "Father, bring me peace. Give me courage. Amen.",
    );
    expect(out).toEqual([
      "Father, bring me peace.",
      "Give me courage.",
      "Amen.",
    ]);
  });
});
