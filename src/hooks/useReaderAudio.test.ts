import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReaderAudio } from "./useReaderAudio";
import type { Passage } from "@/lib/bible/api";
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(), get: vi.fn(), detach: vi.fn(), speak: vi.fn(), online: true,
  audio: { src: "", playbackRate: 1, onended: null as null | (() => void), onerror: null as null | (() => void), play: vi.fn(), pause: vi.fn() },
  paused: vi.fn(), resumed: vi.fn(), stopped: vi.fn(), toast: vi.fn(),
}));
vi.mock("@/lib/bible/api", () => ({ fetchSleepAudio: mocks.fetch }));
vi.mock("./useOnlineStatus", () => ({ useOnlineStatus: () => mocks.online }));
vi.mock("@/lib/bible/scriptureTts", () => ({ buildScriptureChunks: () => ["part one", "part two"] }));
vi.mock("@/lib/bible/sleepVoices", () => ({ getBrowserProfile: () => "female-soft" }));
vi.mock("./use-toast", () => ({ toast: mocks.toast }));
vi.mock("@/lib/bible/browserTts", () => ({ isBrowserTtsSupported: () => true, speakBrowserTts: mocks.speak, pauseBrowserTts: mocks.paused, resumeBrowserTts: mocks.resumed, stopBrowserTts: mocks.stopped }));
vi.mock("@/lib/bible/sleepMediaSession", () => ({ getOrCreateSleepAudioElement: mocks.get, detachSleepAudioElement: mocks.detach, bindSleepMediaSession: vi.fn(), clearSleepMediaSession: vi.fn(), updateSleepMediaSession: vi.fn() }));
const passage = { reference: "Matthew 16", verses: [{ number: 1, text: "test only" }], headings: [], paragraphStarts: [] } as Passage;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => {
  vi.clearAllMocks(); mocks.online = true;
  mocks.audio.onended = null; mocks.audio.onerror = null; mocks.audio.playbackRate = 1;
  mocks.audio.play.mockResolvedValue(undefined); mocks.get.mockReturnValue(mocks.audio);
  mocks.fetch.mockResolvedValue(new Blob(["mock audio"])); mocks.speak.mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() }));
});
describe("Reader audio cancellation and controls", () => {
  it("does not start stale narration when an old chapter request completes", async () => {
    const pending = deferred<Blob>(); mocks.fetch.mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(({ ref }) => useReaderAudio(ref, passage), { initialProps: { ref: "Matthew 16" } });
    let play!: Promise<void>;
    act(() => { play = result.current.toggle(); });
    expect(result.current.loading).toBe(true);
    rerender({ ref: "Matthew 17" });
    await act(async () => { pending.resolve(new Blob(["late"])); await play; });
    expect(mocks.get).not.toHaveBeenCalled(); expect(result.current.status).toBe("idle");
    expect(mocks.fetch.mock.calls[0][2].aborted).toBe(true);
  });
  it("guards duplicate start requests, pauses/resumes and changes later segment speed", async () => {
    const { result } = renderHook(() => useReaderAudio("Matthew 16", passage));
    await act(async () => { const one = result.current.toggle(); const two = result.current.toggle(); await Promise.all([one, two]); });
    expect(mocks.fetch).toHaveBeenCalledTimes(1); expect(result.current.playing).toBe(true);
    act(() => result.current.cycleSpeed()); expect(mocks.audio.playbackRate).toBe(1.25);
    await act(async () => { await result.current.toggle(); }); expect(result.current.paused).toBe(true);
    await act(async () => { await result.current.toggle(); }); expect(result.current.playing).toBe(true);
    await act(async () => { mocks.audio.onended?.(); });
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect(mocks.audio.playbackRate).toBe(1.25);
  });
  it("handles rejected resume and never leaves UI stuck as playing", async () => {
    const { result } = renderHook(() => useReaderAudio("Matthew 16", passage));
    await act(async () => { await result.current.toggle(); await result.current.toggle(); });
    mocks.audio.play.mockRejectedValueOnce(new Error("blocked"));
    await act(async () => { await result.current.toggle(); });
    expect(result.current.status).toBe("idle"); expect(mocks.toast).toHaveBeenCalled();
  });
  it("passes device speech the selected rate without calling a paid provider offline", async () => {
    mocks.online = false;
    const { result } = renderHook(() => useReaderAudio("Matthew 16", passage));
    act(() => { result.current.cycleSpeed(); void result.current.toggle(); });
    await waitFor(() => expect(mocks.speak).toHaveBeenCalled());
    expect(mocks.speak.mock.calls[0][3]).toBe(1.25); expect(mocks.fetch).not.toHaveBeenCalled();
    act(() => result.current.stop()); expect(result.current.status).toBe("idle");
  });
});
