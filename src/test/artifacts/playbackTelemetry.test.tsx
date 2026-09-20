import { renderHook, act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStaticYouTubeEmbedTelemetry } from "@/hooks/useStaticYouTubeEmbedTelemetry";
const mocks = vi.hoisted(() => ({ command: vi.fn(), frame: { contentWindow: {} }, hidden: false }));
vi.mock("@/lib/youtube/embed", () => ({ getStaticYouTubeEmbedIframe: () => mocks.frame, postYouTubeEmbedCommand: (...args: unknown[]) => mocks.command(...args) }));
vi.mock("@/lib/youtube/embedMessaging", () => ({ isMessageFromYouTubeFrame: (event: MessageEvent) => event.origin === "https://www.youtube.com", sendYouTubeFrameMessage: vi.fn() }));
vi.mock("@/lib/youtube/platform", () => ({ isIphoneWebKit: () => false }));
vi.mock("@/lib/youtube/iosBackgroundAudio", () => ({ isIosYouTubeBackgroundAudioActive: () => false, startIosYouTubeBackgroundAudio: vi.fn(), stopIosYouTubeBackgroundAudio: vi.fn() }));
const message = (data: unknown, origin = "https://www.youtube.com") => act(() => window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(data), origin })));
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-20T00:00:00Z")); mocks.command.mockClear(); mocks.hidden = false;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => mocks.hidden });
});
afterEach(() => { cleanup(); vi.useRealTimers(); sessionStorage.clear(); });
const slot = { current: null };
describe("acknowledged player control", () => {
  it("keeps callbacks and controller stable across unrelated renders", () => {
    const { result, rerender } = renderHook(() => useStaticYouTubeEmbedTelemetry({ videoSlotRef: slot, enabled: true, artifactId: "a" }));
    const previous = result.current; rerender(); expect(result.current).toBe(previous);
    expect(mocks.command).not.toHaveBeenCalled();
  });
  it("does not claim playback until the iframe acknowledges it", () => {
    const { result } = renderHook(() => useStaticYouTubeEmbedTelemetry({ videoSlotRef: slot, enabled: true }));
    act(() => result.current.playVideo()); expect(result.current.isPlaying).toBe(false);
    message({ event: "onStateChange", info: 1 }); expect(result.current.isPlaying).toBe(true);
  });
  it("cancels recovery when the user pauses", () => {
    const { result } = renderHook(() => useStaticYouTubeEmbedTelemetry({ videoSlotRef: slot, enabled: true }));
    act(() => { result.current.playVideo(); result.current.resumeAfterLayoutReposition(); result.current.pauseVideo(); });
    mocks.command.mockClear(); act(() => vi.advanceTimersByTime(2000));
    expect(mocks.command).not.toHaveBeenCalled(); expect(result.current.getWantsContinuousPlayback()).toBe(false);
  });
  it("does not keep retrying blocked autoplay", () => {
    const { result } = renderHook(() => useStaticYouTubeEmbedTelemetry({ videoSlotRef: slot, enabled: true }));
    act(() => { result.current.playVideo(); result.current.resumeAfterLayoutReposition(); });
    message({ event: "onAutoplayBlocked" }); mocks.command.mockClear();
    act(() => vi.advanceTimersByTime(2000)); expect(mocks.command).not.toHaveBeenCalled();
  });
  it("ignores messages from other origins", () => {
    const { result } = renderHook(() => useStaticYouTubeEmbedTelemetry({ videoSlotRef: slot, enabled: true }));
    message({ event: "onStateChange", info: 1 }, "https://unrelated.example"); expect(result.current.isPlaying).toBe(false);
  });
  it("does not skip five minutes when a hidden player was suspended", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useStaticYouTubeEmbedTelemetry({ videoSlotRef: slot, enabled: true, artifactId: "a", initialSeconds: 1200, syncBackgroundPlayback: true, getSavedPlaybackSeconds: () => 1200, onPersistPlaybackSeconds: save }));
    message({ event: "infoDelivery", info: { currentTime: 1200, playerState: 1 } });
    act(() => { mocks.hidden = true; document.dispatchEvent(new Event("visibilitychange")); vi.advanceTimersByTime(300000); });
    act(() => { mocks.hidden = false; document.dispatchEvent(new Event("visibilitychange")); vi.advanceTimersByTime(300); });
    expect(result.current.getCurrentTime()).toBe(1200); expect(save).toHaveBeenLastCalledWith(1200);
  });
  it("never plays merely to prime a poster", () => {
    const { result } = renderHook(() => useStaticYouTubeEmbedTelemetry({ videoSlotRef: slot, enabled: true }));
    act(() => result.current.primeToPausedFrame(120));
    expect(mocks.command.mock.calls.every(call => call[1] !== "playVideo")).toBe(true);
  });
  it("cancels all delayed recovery on unmount", () => {
    const { result, unmount } = renderHook(() => useStaticYouTubeEmbedTelemetry({ videoSlotRef: slot, enabled: true }));
    act(() => { result.current.playVideo(); result.current.resumeAfterLayoutReposition(); });
    unmount(); mocks.command.mockClear(); act(() => vi.advanceTimersByTime(5000)); expect(mocks.command).not.toHaveBeenCalled();
  });
});
