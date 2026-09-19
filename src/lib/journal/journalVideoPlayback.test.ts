import { describe, expect, it, vi } from "vitest";
import { journalVideoSignedUrlNeedsRenewal, journalVideoSignedUrlExpiresAt, restoreJournalVideoPlayback, snapshotJournalVideoPlayback } from "./journalVideoPlayback";
const signed = (exp: number) => `https://test.supabase.co/storage/video?token=x.${btoa(JSON.stringify({ exp }))}.x`;
describe("journal video playback continuity", () => {
  it("renews a signed link before expiry without periodically reloading valid media", () => {
    expect(journalVideoSignedUrlExpiresAt(signed(3600))).toBe(3_600_000);
    expect(journalVideoSignedUrlNeedsRenewal(signed(3600), 3_550_000)).toBe(true);
    expect(journalVideoSignedUrlNeedsRenewal(signed(3600), 1000)).toBe(false);
    expect(journalVideoSignedUrlNeedsRenewal("blob:local-recording")).toBe(false);
    expect(journalVideoSignedUrlNeedsRenewal("https://test/video?token=malformed")).toBe(false);
  });
  it("preserves position, playing state, rate, mute and volume after a source change", () => {
    const video = { currentTime: 23, paused: false, ended: false, playbackRate: 1.5, volume: 0.4, muted: true, duration: 60, play: vi.fn(async () => {}) };
    const saved = snapshotJournalVideoPlayback(video as unknown as HTMLVideoElement);
    Object.assign(video, { currentTime: 0, paused: true, playbackRate: 1, volume: 1, muted: false });
    restoreJournalVideoPlayback(video as unknown as HTMLVideoElement, saved);
    expect(video).toMatchObject({ currentTime: 23, playbackRate: 1.5, volume: 0.4, muted: true });
    expect(video.play).toHaveBeenCalledOnce();
  });
  it("does not start a paused video and clamps a saved seek to a valid duration", () => {
    const video = { currentTime: 0, duration: 5, play: vi.fn() } as unknown as HTMLVideoElement;
    restoreJournalVideoPlayback(video, { time: 50, playing: false, rate: 1, volume: 1, muted: false });
    expect(video.currentTime).toBeLessThan(5);
    expect(video.play).not.toHaveBeenCalled();
  });
});
