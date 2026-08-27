import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useJournalVideoPageLifecycle } from "@/hooks/useJournalVideoPageLifecycle";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useJournalVideoPageLifecycle", () => {
  it("routes page background and return events and removes listeners on unmount", () => {
    const onHidden = vi.fn();
    const onReturn = vi.fn();
    const { unmount } = renderHook(() => useJournalVideoPageLifecycle(onHidden, onReturn));

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
      window.dispatchEvent(new Event("pageshow"));
      document.dispatchEvent(new Event("freeze"));
      document.dispatchEvent(new Event("resume"));
    });
    expect(onHidden).toHaveBeenCalledTimes(2);
    expect(onReturn).toHaveBeenCalledTimes(2);

    unmount();
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(onHidden).toHaveBeenCalledTimes(2);
  });

  it("distinguishes hidden and visible visibility changes", () => {
    let visibility: DocumentVisibilityState = "hidden";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    const onHidden = vi.fn();
    const onReturn = vi.fn();
    renderHook(() => useJournalVideoPageLifecycle(onHidden, onReturn));

    act(() => document.dispatchEvent(new Event("visibilitychange")));
    visibility = "visible";
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(onHidden).toHaveBeenCalledOnce();
    expect(onReturn).toHaveBeenCalledOnce();
  });
});
