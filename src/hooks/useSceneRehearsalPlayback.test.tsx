// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSceneRehearsalPlayback } from "./useSceneRehearsalPlayback";
const beats = [
  { key: "arrive", title: "Arrive", text: "Be here.", seconds: 1 },
  { key: "act", title: "Act", text: "Choose one action.", seconds: 1 },
];
beforeEach(() => { vi.useFakeTimers(); Object.defineProperty(document, "hidden", { value: false, configurable: true }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("guided playback lifecycle", () => {
  it("never starts automatically and advances only when playing", () => {
    const { result } = renderHook(() => useSceneRehearsalPlayback(beats));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.index).toBe(0);
    expect(result.current.running).toBe(false);
    act(() => result.current.toggle());
    act(() => vi.advanceTimersByTime(1100));
    expect(result.current.index).toBe(1);
    act(() => vi.advanceTimersByTime(1100));
    expect(result.current.running).toBe(false);
    expect(result.current.index).toBe(1);
  });
  it("pauses when hidden and does not silently finish in the background", () => {
    const { result } = renderHook(() => useSceneRehearsalPlayback(beats));
    act(() => result.current.toggle());
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.running).toBe(false);
    expect(result.current.index).toBe(0);
  });
  it("pauses for another recording and cleans timers on unmount", () => {
    const { result, unmount } = renderHook(() => useSceneRehearsalPlayback(beats));
    act(() => result.current.toggle());
    const audio = document.createElement("audio"); document.body.append(audio);
    act(() => audio.dispatchEvent(new Event("play")));
    expect(result.current.running).toBe(false);
    audio.remove();
    act(() => result.current.toggle());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("clamps navigation to valid cues", () => {
    const { result } = renderHook(() => useSceneRehearsalPlayback(beats));
    act(() => result.current.go(999)); expect(result.current.index).toBe(1);
    act(() => result.current.go(-100)); expect(result.current.index).toBe(0);
  });
});
