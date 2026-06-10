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

  it("does not paint narration red in formerly-WHOLE verses", () => {
    const verses = [
      {
        number: 11,
        text:
          'He answered them, "Because the secrets of the kingdom of heaven have been given for you to know, but not to them."',
      },
    ];

    const segs = splitJesusSpeechForChapter("Mat", 13, verses);
    const red = jesusText(segs.get(11)!);

    expect(red).toContain("Because the secrets");
    expect(red).not.toContain("He answered them");
  });

  it("does not paint epistle text red", () => {
    const verses = [
      {
        number: 1,
        text: "Paul, a servant of Christ Jesus, called as an apostle and set apart for the gospel of God—",
      },
    ];

    const segs = splitJesusSpeechForChapter("Rom", 1, verses);
    expect(jesusText(segs.get(1)!)).toBe("");
  });

  it("handles missing verse text without empty segments", () => {
    const verses = [{ number: 4, text: undefined as unknown as string }];
    const segs = splitJesusSpeechForChapter("Mat", 11, verses);
    expect(segs.get(4)).toEqual([{ text: "", isJesus: false }]);
  });

  it("does not break on curly apostrophes in contractions (CSB-style)", () => {
    const verses = [
      {
        number: 3,
        text:
          "He said to them, \u201CHaven\u2019t you read what David did when he was hungry:",
      },
      {
        number: 8,
        text: "For the Son of Man is Lord of the Sabbath.\u201D",
      },
      {
        number: 11,
        text:
          "He said to them, \u201CWho among you, if he had a sheep that fell into a pit on the Sabbath, wouldn\u2019t take hold of it and lift it out?",
      },
      {
        number: 12,
        text:
          "Isn\u2019t a person worth more than a sheep? So it is lawful to do what is good on the Sabbath.\u201D",
      },
    ];

    const segs = splitJesusSpeechForChapter("Mat", 12, verses);
    const red = [3, 8, 11, 12].map((n) => jesusText(segs.get(n)!)).join(" ");

    expect(red).toContain("Haven\u2019t you read");
    expect(red).toContain("Lord of the Sabbath");
    expect(red).toContain("wouldn\u2019t take hold");
    expect(red).toContain("lawful to do what is good");
    expect(segs.get(3)!.some((s) => !s.isJesus && s.text.includes("He said to them"))).toBe(
      true,
    );
  });

  it("paints WHOLE-list verses red when translation omits quote marks", () => {
    const verses = [
      {
        number: 3,
        text: "Blessed are the poor in spirit, for the kingdom of heaven is theirs.",
      },
    ];

    const segs = splitJesusSpeechForChapter("Mat", 5, verses);
    expect(jesusText(segs.get(3)!)).toBe(verses[0]!.text);
  });
});
