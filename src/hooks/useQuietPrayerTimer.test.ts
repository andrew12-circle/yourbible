import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useQuietPrayerTimer } from "./useQuietPrayerTimer";

describe("useQuietPrayerTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T15:00:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("waits for Start and preserves time across pause and resume", () => {
    const { result } = renderHook(() => useQuietPrayerTimer(2));
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current.phase).toBe("idle");
    expect(result.current.remainingMs).toBe(120_000);
    expect(result.current.soundEnabled).toBe(false);

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(45_000));
    expect(result.current.remainingMs).toBe(75_000);
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.phase).toBe("paused");
    expect(result.current.remainingMs).toBe(75_000);

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(75_000));
    expect(result.current.phase).toBe("finished");
    expect(result.current.remainingMs).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses the deadline when a background tab wakes instead of counting intervals", () => {
    const { result } = renderHook(() => useQuietPrayerTimer(2));
    act(() => result.current.start());
    act(() => {
      vi.setSystemTime(new Date("2026-11-09T15:04:00Z"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.phase).toBe("finished");
    expect(result.current.elapsedMs).toBe(120_000);
  });

  it("chimes once on completion and closes its own audio context on unmount", () => {
    const oscillator = {
      type: "sine", frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(),
      start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), onended: null,
    };
    const gain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(), disconnect: vi.fn(),
    };
    const context = {
      state: "running", currentTime: 0, destination: {},
      createOscillator: vi.fn(() => oscillator), createGain: vi.fn(() => gain),
      close: vi.fn(() => Promise.resolve()), resume: vi.fn(() => Promise.resolve()),
    };
    const Audio = vi.fn(function () { return context; });
    vi.stubGlobal("AudioContext", Audio);
    const { result, unmount } = renderHook(() => useQuietPrayerTimer(2));
    expect(Audio).not.toHaveBeenCalled();
    act(() => result.current.setSoundEnabled(true));
    act(() => result.current.start());
    act(() => {
      vi.setSystemTime(new Date("2026-11-09T15:03:00Z"));
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.phase).toBe("finished");
    expect(oscillator.start).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(10_000));
    expect(oscillator.start).toHaveBeenCalledTimes(1);
    unmount();
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("continues sitting without a new deadline, and supports an open-ended session", () => {
    const { result } = renderHook(() => useQuietPrayerTimer(2));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(120_000));
    act(() => result.current.continueSitting());
    expect(result.current.phase).toBe("running");
    expect(result.current.remainingMs).toBeNull();
    expect(result.current.elapsedMs).toBe(120_000);
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current.elapsedMs).toBe(150_000);
    act(() => result.current.reset());
    expect(result.current.phase).toBe("idle");
    expect(result.current.durationMinutes).toBeNull();
    act(() => result.current.start());
    act(() => {
      vi.setSystemTime(new Date("2026-11-09T16:00:00Z"));
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current.phase).toBe("running");
    expect(result.current.remainingMs).toBeNull();
  });
});
