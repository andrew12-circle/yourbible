import { describe, expect, it } from "vitest";
import {
  hasBottomComposerRoute,
  homeIndicatorHidden,
  isArtifactDetailRoute,
} from "@/lib/shell/homeIndicatorRoutes";

describe("homeIndicatorRoutes", () => {
  it("hides on home, auth, composer, and reader dock routes", () => {
    expect(homeIndicatorHidden("/home", false)).toBe(true);
    expect(homeIndicatorHidden("/auth", false)).toBe(true);
    expect(homeIndicatorHidden("/my-ai", false)).toBe(true);
    expect(homeIndicatorHidden("/journal/chat", false)).toBe(true);
    expect(homeIndicatorHidden("/read/Jhn/1", false)).toBe(true);
    expect(homeIndicatorHidden("/settings", false)).toBe(false);
  });

  it("hides when hub shell is active", () => {
    expect(homeIndicatorHidden("/settings", true)).toBe(true);
  });

  it("detects artifact detail and bottom composer routes", () => {
    expect(isArtifactDetailRoute("/framework/artifacts/abc")).toBe(true);
    expect(isArtifactDetailRoute("/framework/artifacts/new")).toBe(false);
    expect(hasBottomComposerRoute("/my-ai/123")).toBe(true);
    expect(hasBottomComposerRoute("/journal")).toBe(false);
  });
});
