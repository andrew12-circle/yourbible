import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const signer = vi.hoisted(() => vi.fn());
vi.mock("@/lib/journal/videos", () => ({ getSignedVideoUrl: signer }));
import JournalEntryVideoPlayer from "./JournalEntryVideoPlayer";
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  signer.mockReset().mockResolvedValue("https://test/new.mp4");
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("journal player source recovery", () => {
  it("does not reload the video when unrelated journal renders reuse the same URL", () => {
    const { rerender } = render(<JournalEntryVideoPlayer url="https://test/old.mp4" storagePath="u/e/video.mp4" durationMs={60_000} mimeType="video/mp4" />);
    const calls = vi.mocked(HTMLMediaElement.prototype.load).mock.calls.length;
    rerender(<JournalEntryVideoPlayer url="https://test/old.mp4" storagePath="u/e/video.mp4" durationMs={60_000} mimeType="video/mp4" className="updated" />);
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledTimes(calls);
  });
  it("renews a failed source and restores the user's playback position and state", async () => {
    const { container } = render(<JournalEntryVideoPlayer url="https://test/old.mp4" storagePath="u/e/video.mp4" durationMs={60_000} mimeType="video/mp4" />);
    const video = container.querySelector("video")!;
    Object.defineProperties(video, { paused: { configurable: true, value: false }, ended: { configurable: true, value: false }, duration: { configurable: true, value: 60 } });
    video.currentTime = 17; video.playbackRate = 1.5;
    await act(async () => fireEvent.error(video));
    expect(signer).toHaveBeenCalledWith("u/e/video.mp4");
    expect(video.src).toBe("https://test/new.mp4");
    video.currentTime = 0;
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(17);
    expect(video.playbackRate).toBe(1.5);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
  it("offers a bounded manual retry instead of looping on a broken video", async () => {
    signer.mockResolvedValue(null);
    const { container } = render(<JournalEntryVideoPlayer url="https://test/missing.mp4" storagePath="u/e/missing.mp4" durationMs={1} mimeType="video/mp4" />);
    await act(async () => fireEvent.error(container.querySelector("video")!));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry playback" })).toBeVisible());
    await act(async () => fireEvent.error(container.querySelector("video")!));
    expect(signer).toHaveBeenCalledTimes(1);
  });
});


it("retains play intent when a media error has already paused the native element", async () => {
  const { container } = render(<JournalEntryVideoPlayer url="https://test/old.mp4" storagePath="u/e/video.mp4" durationMs={60_000} mimeType="video/mp4" />);
  const video = container.querySelector("video")!;
  fireEvent.loadedMetadata(video);
  fireEvent.play(video);
  Object.defineProperty(video, "error", { configurable: true, value: { code: 2 } });
  video.currentTime = 12;
  fireEvent.pause(video);
  await act(async () => fireEvent.error(video));
  video.currentTime = 0;
  fireEvent.loadedMetadata(video);
  expect(video.currentTime).toBe(12);
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
});
