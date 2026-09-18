import { afterEach, describe, expect, it, vi } from "vitest";
import { stableMediaUrls, type StableMediaUrlCache } from "./stableMediaUrls";
const cache = (): StableMediaUrlCache => ({ urls: new Map(), pending: new Map() });
afterEach(() => vi.restoreAllMocks());

describe("journal thumbnail URL lifetime", () => {
  it("reuses an unchanged video's exact URL and renews before expiry", async () => {
    const time = vi.spyOn(Date, "now").mockReturnValue(1000);
    const signed = vi.fn().mockResolvedValueOnce({ clip: "clip?token=first" }).mockResolvedValueOnce({ clip: "clip?token=next" });
    const memory = cache();
    expect(await stableMediaUrls(["clip"], "video", memory, signed)).toEqual({ clip: "clip?token=first" });
    time.mockReturnValue(1000 + 54 * 60 * 1000);
    expect(await stableMediaUrls(["clip"], "video", memory, signed)).toEqual({ clip: "clip?token=first" });
    expect(signed).toHaveBeenCalledTimes(1);
    time.mockReturnValue(1000 + 55 * 60 * 1000);
    expect(await stableMediaUrls(["clip"], "video", memory, signed)).toEqual({ clip: "clip?token=next" });
    expect(signed).toHaveBeenCalledTimes(2);
  });
  it("coalesces overlapping requests for the same storage object", async () => {
    let resolve!: (urls: Record<string, string>) => void;
    const signed = vi.fn(() => new Promise<Record<string, string>>((yes) => { resolve = yes; }));
    const memory = cache();
    const first = stableMediaUrls(["clip"], "video", memory, signed);
    const second = stableMediaUrls(["clip"], "video", memory, signed);
    await Promise.resolve();
    resolve({ clip: "clip?token=one" });
    expect(await first).toEqual(await second);
    expect(signed).toHaveBeenCalledTimes(1);
    expect(memory.pending.size).toBe(0);
  });
  it("separates account caches, buckets and changed paths", async () => {
    const signed = vi.fn(async (paths: string[]) => Object.fromEntries(paths.map((path) => [path, `${path}?token=${signed.mock.calls.length}`])));
    const a = cache();
    await stableMediaUrls(["clip"], "video", a, signed);
    await stableMediaUrls(["clip"], "photo", a, signed);
    await stableMediaUrls(["new-clip"], "video", a, signed);
    await stableMediaUrls(["clip"], "video", cache(), signed);
    expect(signed).toHaveBeenCalledTimes(4);
  });
  it("does not indefinitely cache canonical sketches that can be overwritten", async () => {
    const signed = vi.fn().mockResolvedValue({ "user/entry/sketch-entry.png": "sketch-url" });
    const memory = cache();
    await stableMediaUrls(["user/entry/sketch-entry.png"], "photo", memory, signed);
    await stableMediaUrls(["user/entry/sketch-entry.png"], "photo", memory, signed);
    expect(signed).toHaveBeenCalledTimes(2);
  });
  it("clears failed in-flight signatures so a later refresh can retry", async () => {
    const signed = vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({ clip: "recovered" });
    const memory = cache();
    await expect(stableMediaUrls(["clip"], "video", memory, signed)).rejects.toThrow("thumbnail");
    expect(memory.pending.size).toBe(0);
    expect(await stableMediaUrls(["clip"], "video", memory, signed)).toEqual({ clip: "recovered" });
  });
});
