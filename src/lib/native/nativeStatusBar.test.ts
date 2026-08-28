import { describe, expect, it } from "vitest";
import { resolveNativeStatusBarAppearance } from "@/lib/native/nativeStatusBar";

describe("resolveNativeStatusBarAppearance", () => {
  it("uses light icons when the app theme or an active surface is dark", () => {
    expect(
      resolveNativeStatusBarAppearance({
        resolvedTheme: "dark",
        darkSurfaceActive: false,
      }),
    ).toEqual({ backgroundColor: "#000000", lightIcons: true });
    expect(
      resolveNativeStatusBarAppearance({
        resolvedTheme: "light",
        darkSurfaceActive: true,
      }),
    ).toEqual({ backgroundColor: "#000000", lightIcons: true });
  });

  it("uses dark icons throughout the light app, regardless of route", () => {
    expect(
      resolveNativeStatusBarAppearance({
        resolvedTheme: "light",
        darkSurfaceActive: false,
      }),
    ).toEqual({ backgroundColor: "#FFFFFF", lightIcons: false });
    expect(
      resolveNativeStatusBarAppearance({
        resolvedTheme: undefined,
        darkSurfaceActive: false,
      }),
    ).toEqual({ backgroundColor: "#FFFFFF", lightIcons: false });
  });
});
