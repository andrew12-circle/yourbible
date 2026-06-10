import { describe, expect, it } from "vitest";
import { splitJesusSpeechForChapter } from "./redLetter";

function jesusText(segments: { text: string; isJesus: boolean }[]): string {
  return segments.filter((s) => s.isJesus).map((s) => s.text).join("");
}

describe("splitJesusSpeechForChapter", () => {
  it("paints Jesus' quoted words red across verse boundaries", () => {
    const verses = [
      {
        number: 4,
        text: 'Jesus replied to them, "Go and report to John what you hear and see:',
      },
      {
        number: 5,
        text:
          "The blind receive their sight, the lame walk, those with leprosy are cleansed, the deaf hear, the dead are raised, and the poor are told the good news,",
      },
      {
        number: 6,
        text: 'and blessed is the one who isn\'t offended by me."',
      },
    ];

    const segs = splitJesusSpeechForChapter("Mat", 11, verses);
    const red = [
      jesusText(segs.get(4)!),
      jesusText(segs.get(5)!),
      jesusText(segs.get(6)!),
    ].join(" ");

    expect(red).toContain("Go and report to John");
    expect(red).toContain("The blind receive their sight");
    expect(red).toContain("blessed is the one");
    expect(segs.get(4)!.some((s) => !s.isJesus && s.text.includes("Jesus replied"))).toBe(true);
  });

  it("does not paint nested quotes of other speakers red", () => {
    const verses = [
      {
        number: 16,
        text:
          '"To what should I compare this generation? It\'s like children sitting in the marketplaces, who call to other children,',
      },
      {
        number: 18,
        text: "For John came neither eating nor drinking, and they say, 'He has a demon!'",
      },
      {
        number: 19,
        text:
          "The Son of Man came eating and drinking, and they say, 'Look, a glutton and a drunkard, a friend of tax collectors and sinners!' Yet wisdom is vindicated by her deeds.\"",
      },
    ];

    const segs = splitJesusSpeechForChapter("Mat", 11, verses);
    const red = [18, 19].map((n) => jesusText(segs.get(n)!)).join(" ");

    expect(red).toContain("they say,");
    expect(red).not.toContain("He has a demon");
    expect(red).not.toContain("Look, a glutton");
  });

  it("paints Jesus' own words red when speech spans verses with nested quotes", () => {
    const verses = [
      {
        number: 16,
        text:
          '"To what should I compare this generation? It\'s like children sitting in the marketplaces, who call to other children,',
      },
      {
        number: 17,
        text:
          "and say, 'We played the flute for you, but you didn't dance; we sang a lament, but you didn't mourn!'",
      },
    ];

    const segs = splitJesusSpeechForChapter("Mat", 11, verses);
    const red = [jesusText(segs.get(16)!), jesusText(segs.get(17)!)].join(" ");

    expect(red).toContain("To what should I compare");
    expect(red).toContain("and say,");
    expect(red).not.toContain("We played the flute");
  });
});
