import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MiniPhoneEmbedProvider } from "@/contexts/MiniPhoneEmbedContext";
import { shouldShowHubShell, useAppShellMode } from "@/hooks/useAppShellMode";

const mockUseAuth = vi.fn();
const mockIsNativePlatform = vi.fn(() => false);

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mockIsNativePlatform() },
}));

describe("useAppShellMode", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ profile: { layout: "{}" } });
    mockIsNativePlatform.mockReturnValue(false);
  });

  it("shows hub shell when homeMode is hub", () => {
    mockUseAuth.mockReturnValue({ profile: { layout: JSON.stringify({ homeMode: "hub" }) } });
    const { result } = renderHook(() => useAppShellMode());
    expect(result.current.homeMode).toBe("hub");
    expect(result.current.showHubShell).toBe(true);
  });

  it("shows hub shell by default when homeMode is unset", () => {
    const { result } = renderHook(() => useAppShellMode());
    expect(result.current.homeMode).toBe("hub");
    expect(result.current.showHubShell).toBe(true);
  });

  it("hides hub shell when homeMode is ios", () => {
    mockUseAuth.mockReturnValue({ profile: { layout: JSON.stringify({ homeMode: "ios" }) } });
    const { result } = renderHook(() => useAppShellMode());
    expect(result.current.homeMode).toBe("ios");
    expect(result.current.showHubShell).toBe(false);
  });

  it("hides hub shell inside mini phone even when homeMode is hub", () => {
    mockUseAuth.mockReturnValue({ profile: { layout: JSON.stringify({ homeMode: "hub" }) } });
    const { result } = renderHook(() => useAppShellMode(), {
      wrapper: ({ children }) => <MiniPhoneEmbedProvider>{children}</MiniPhoneEmbedProvider>,
    });
    expect(result.current.showHubShell).toBe(false);
  });

  it("always hides the hub shell in the native app", () => {
    mockIsNativePlatform.mockReturnValue(true);
    mockUseAuth.mockReturnValue({ profile: { layout: JSON.stringify({ homeMode: "hub" }) } });
    const { result } = renderHook(() => useAppShellMode());
    expect(result.current.homeMode).toBe("hub");
    expect(result.current.showHubShell).toBe(false);
  });

  it("keeps shell selection testable without React", () => {
    expect(
      shouldShowHubShell({ homeMode: "hub", inMiniPhone: false, nativeApp: false }),
    ).toBe(true);
    expect(
      shouldShowHubShell({ homeMode: "hub", inMiniPhone: false, nativeApp: true }),
    ).toBe(false);
  });
});
