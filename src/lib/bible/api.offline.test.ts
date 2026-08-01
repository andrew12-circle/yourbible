import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BIBLE_CSB_ID } from "./bibleEditions";
import { fetchPassage, listBibles, searchBible } from "./api";
import { PASSAGE_PARSER_REVISION } from "./textRevision";

const john3Bundle = {
  key: `${API_BIBLE_CSB_ID}|Jhn|3`,
  bibleId: API_BIBLE_CSB_ID,
  bookAbbr: "Jhn",
  chapter: 3,
  textRevision: "bundled-test",
  parserRevision: PASSAGE_PARSER_REVISION,
  cachedAt: 0,
  verses: [
    {
      verseId: `${API_BIBLE_CSB_ID}:Jhn:3:16`,
      bibleId: API_BIBLE_CSB_ID,
      bookAbbr: "Jhn",
      bookOrder: 43,
      chapter: 3,
      verse: 16,
      text: "For God loved the world in this way.",
      textRevision: "bundled-test",
    },
  ],
  layout: {
    bibleId: API_BIBLE_CSB_ID,
    bookAbbr: "Jhn",
    chapter: 3,
    paragraphStarts: [16],
    headings: [],
    poetryBlocks: [],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("bundled CSB reader access", () => {
  it("lists local editions without a network request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(listBibles()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: API_BIBLE_CSB_ID, abbreviation: "CSB" }),
      ]),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("loads CSB from a bundled chapter path rather than an API endpoint", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(john3Bundle), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const passage = await fetchPassage(API_BIBLE_CSB_ID, "Jhn", 3);

    expect(fetchSpy).toHaveBeenCalledWith("/bibles/csb/chapters/Jhn/3.json");
    expect(passage.verses).toMatchObject([
      { number: 16, text: "For God loved the world in this way." },
    ]);
  });

  it("fails closed for a non-bundled translation without fetching", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(fetchPassage("unlicensed-edition", "Jhn", 3)).rejects.toThrow(
      "not bundled locally",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("searches the bundled index and never falls through to remote search", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          bibleId: API_BIBLE_CSB_ID,
          verses: [["Jhn", 3, 16, "For God loved the world in this way."]],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await expect(searchBible(API_BIBLE_CSB_ID, "God world")).resolves.toMatchObject([
      { book: "Jhn", chapter: 3, verse: 16 },
    ]);
    expect(fetchSpy).toHaveBeenCalledWith("/bibles/csb/search.json");

    fetchSpy.mockClear();
    await expect(searchBible("unlicensed-edition", "God world")).rejects.toThrow(
      "API.Bible was not used",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
