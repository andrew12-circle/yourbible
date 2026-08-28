import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/bible/bibleEditions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./bibleEditions")>();
  return { ...actual, isBundledBibleId: () => false };
});

import { API_BIBLE_CSB_ID } from "./bibleEditions";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "anon-test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("production API-backed CSB", () => {
  it("loads a CSB chapter through the Bible passage edge function", async () => {
    const { fetchPassage } = await import("./api");
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          reference: "John 3",
          verses: [{ number: 16, text: "For God loved the world." }],
          paragraphStarts: [16],
          headings: [],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await expect(fetchPassage(API_BIBLE_CSB_ID, "Jhn", 3)).resolves.toMatchObject({
      reference: "John 3",
      verses: [{ number: 16, text: "For God loved the world." }],
    });
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("/functions/v1/bible-passage?");
  });

  it("does not call an undeployed search proxy for remote CSB", async () => {
    const { searchBible } = await import("./api");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(searchBible(API_BIBLE_CSB_ID, "faith", 3)).rejects.toThrow(
      "unavailable in this production build",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
