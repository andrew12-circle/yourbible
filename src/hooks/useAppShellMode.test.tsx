import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAppShellMode } from "@/hooks/useAppShellMode";

const mockUseAuth = vi.fn();
const mockUseIsMobile = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

describe("useAppShellMode", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ profile: { layout: "{}" } });
    mockUseIsMobile.mockReturnValue(false);
  });

  it("shows hub shell on desktop when homeMode is hub", () => {
    mockUseAuth.mockReturnValue({ profile: { layout: JSON.stringify({ homeMode: "hub" }) } });
    mockUseIsMobile.mockReturnValue(false);
    const { result } = renderHook(() => useAppShellMode());
    expect(result.current.homeMode).toBe("hub");
    expect(result.current.showHubShell).toBe(true);
  });

  it("hides hub shell on mobile even when homeMode is hub", () => {
    mockUseAuth.mockReturnValue({ profile: { layout: JSON.stringify({ homeMode: "hub" }) } });
    mockUseIsMobile.mockReturnValue(true);
    const { result } = renderHook(() => useAppShellMode());
    expect(result.current.showHubShell).toBe(false);
  });

  it("hides hub shell when homeMode is ios", () => {
    const { result } = renderHook(() => useAppShellMode());
    expect(result.current.homeMode).toBe("ios");
    expect(result.current.showHubShell).toBe(false);
  });
});
