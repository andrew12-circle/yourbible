import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), get: vi.fn(), set: vi.fn(), bundled: vi.fn() }));
vi.mock("@/lib/bible/api", () => ({ fetchPassage: mocks.fetch }));
vi.mock("@/lib/bible/passageCache", () => ({ getCachedPassage: mocks.get, setCachedPassage: mocks.set }));
vi.mock("@/lib/bible/bibleEditions", () => ({ isBundledBibleId: mocks.bundled }));
import { fetchPassageWithCache } from "@/lib/bible/fetchPassageWithCache";
const passage = { reference: "John 3", verses: [{ number: 1, text: "Synthetic text." }], paragraphStarts: [1], headings: [] };
beforeEach(() => { vi.clearAllMocks(); mocks.bundled.mockReturnValue(false); mocks.get.mockResolvedValue(null); mocks.set.mockResolvedValue(undefined); mocks.fetch.mockResolvedValue(passage); Object.defineProperty(navigator, "onLine", { configurable: true, value: true }); });
describe("cache-first Scripture delivery", () => {
  it("does not contact the provider for a valid saved chapter", async () => { mocks.get.mockResolvedValue({ passage }); expect((await fetchPassageWithCache("fixture", "Jhn", 3)).reference).toBe("John 3"); expect(mocks.fetch).not.toHaveBeenCalled(); });
  it("saves a remote response once", async () => { await fetchPassageWithCache("fixture", "Jhn", 3); expect(mocks.fetch).toHaveBeenCalledTimes(1); expect(mocks.set).toHaveBeenCalledTimes(1); });
  it("never substitutes the cache for an authoritative bundled edition", async () => { mocks.bundled.mockReturnValue(true); await fetchPassageWithCache("fixture", "Jhn", 3); expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.set).not.toHaveBeenCalled(); });
  it("uses valid saved Scripture offline", async () => { Object.defineProperty(navigator, "onLine", { configurable: true, value: false }); mocks.get.mockResolvedValue({ passage }); await fetchPassageWithCache("fixture", "Jhn", 3); expect(mocks.fetch).not.toHaveBeenCalled(); });
  it("does not fetch when offline without valid saved Scripture", async () => { Object.defineProperty(navigator, "onLine", { configurable: true, value: false }); await expect(fetchPassageWithCache("fixture", "Jhn", 3)).rejects.toThrow(/offline cache/); expect(mocks.fetch).not.toHaveBeenCalled(); });
  it("does not publish or save a mismatched response", async () => { mocks.fetch.mockResolvedValue({ ...passage, reference: "John 4" }); await expect(fetchPassageWithCache("fixture", "Jhn", 3)).rejects.toThrow(/reference/); expect(mocks.set).not.toHaveBeenCalled(); });
  it("does not turn cancellation into successful cached data", async () => { const controller = new AbortController(); mocks.get.mockResolvedValue({ passage }); controller.abort(); await expect(fetchPassageWithCache("fixture", "Jhn", 3, controller.signal)).rejects.toMatchObject({ name: "AbortError" }); expect(mocks.fetch).not.toHaveBeenCalled(); });
});
