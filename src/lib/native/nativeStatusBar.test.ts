import { describe, expect, it } from "vitest";
import { nativeStatusBarNeedsLightIcons } from "@/lib/native/nativeStatusBar";

describe("nativeStatusBarNeedsLightIcons", () => {
  it("uses light icons on dark native surfaces and journal covers", () => {
    expect(
      nativeStatusBarNeedsLightIcons({
        pathname: "/journal",
        resolvedTheme: "light",
        darkSurfaceActive: false,
      }),
    ).toBe(true);
    expect(
      nativeStatusBarNeedsLightIcons({
        pathname: "/journal/new",
        resolvedTheme: "light",
        darkSurfaceActive: true,
      }),
    ).toBe(true);
  });

  it("uses dark icons on light compose surfaces", () => {
    expect(
      nativeStatusBarNeedsLightIcons({
        pathname: "/journal/6cd9c431-adca-489a-a564-328a2cc4f0dd/edit",
        resolvedTheme: "light",
        darkSurfaceActive: false,
      }),
    ).toBe(false);
    expect(
      nativeStatusBarNeedsLightIcons({
        pathname: "/journal/chat",
        resolvedTheme: "light",
        darkSurfaceActive: false,
      }),
    ).toBe(false);
    expect(
      nativeStatusBarNeedsLightIcons({
        pathname: "/music",
        resolvedTheme: "light",
        darkSurfaceActive: false,
      }),
    ).toBe(false);
  });
});
