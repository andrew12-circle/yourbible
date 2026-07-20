import { describe, expect, it } from "vitest";
import { shouldPreloadLikelyAppRoutes } from "@/lib/pwa/preloadAppRoutes";

function createNavigator(connection?: { saveData?: boolean; effectiveType?: string }) {
  return { connection } as Navigator;
}

describe("preloadAppRoutes", () => {
  it("allows route preloading on normal connections", () => {
    expect(shouldPreloadLikelyAppRoutes(createNavigator({ effectiveType: "4g" }))).toBe(true);
  });

  it("skips route preloading when data saver is enabled", () => {
    expect(shouldPreloadLikelyAppRoutes(createNavigator({ saveData: true }))).toBe(false);
  });

  it("skips route preloading on 2g connections", () => {
    expect(shouldPreloadLikelyAppRoutes(createNavigator({ effectiveType: "2g" }))).toBe(false);
    expect(shouldPreloadLikelyAppRoutes(createNavigator({ effectiveType: "slow-2g" }))).toBe(false);
  });
});
