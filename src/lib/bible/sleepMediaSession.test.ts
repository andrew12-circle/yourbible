import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindSleepMediaSession,
  clearSleepMediaSession,
  isMediaSessionSupported,
  updateSleepMediaSession,
  updateSleepMediaSessionPosition,
} from "./sleepMediaSession";

function mockMediaSession() {
  class MockMediaMetadata {
    title: string;
    artist?: string;
    album?: string;
    constructor(init: { title: string; artist?: string; album?: string }) {
      this.title = init.title;
      this.artist = init.artist;
      this.album = init.album;
    }
  }
  vi.stubGlobal("MediaMetadata", MockMediaMetadata);

  const handlers: Record<string, (() => void) | null> = {};
  const session = {
    metadata: null as InstanceType<typeof MockMediaMetadata> | null,
    playbackState: "none" as MediaSessionPlaybackState,
    setActionHandler: vi.fn((action: string, handler: (() => void) | null) => {
      handlers[action] = handler;
    }),
    setPositionState: vi.fn(),
  };
  Object.defineProperty(navigator, "mediaSession", {
    configurable: true,
    value: session,
  });
  return { session, handlers };
}

describe("sleepMediaSession", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "mediaSession");
    vi.restoreAllMocks();
  });

  it("detects media session support", () => {
    mockMediaSession();
    expect(isMediaSessionSupported()).toBe(true);
    Reflect.deleteProperty(navigator, "mediaSession");
    expect(isMediaSessionSupported()).toBe(false);
  });

  it("binds play/pause/stop handlers and clears on unbind", () => {
    const { session, handlers } = mockMediaSession();
    const onPlay = vi.fn();
    const onPause = vi.fn();
    const onStop = vi.fn();
    const unbind = bindSleepMediaSession({ onPlay, onPause, onStop });

    handlers.play?.();
    handlers.pause?.();
    handlers.stop?.();
    expect(onPlay).toHaveBeenCalledOnce();
    expect(onPause).toHaveBeenCalledOnce();
    expect(onStop).toHaveBeenCalledOnce();

    unbind();
    expect(session.setActionHandler).toHaveBeenCalledWith("play", null);
    expect(session.playbackState).toBe("none");
  });

  it("updates metadata and playback state", () => {
    mockMediaSession();
    updateSleepMediaSession({ title: "Psalm 23", subtitle: "Part 1 of 2" }, "playing");
    expect(navigator.mediaSession.metadata?.title).toBe("Psalm 23");
    expect(navigator.mediaSession.playbackState).toBe("playing");
    clearSleepMediaSession();
    expect(navigator.mediaSession.metadata).toBeNull();
    expect(navigator.mediaSession.playbackState).toBe("none");
  });

  it("updates position state when duration is valid", () => {
    const { session } = mockMediaSession();
    updateSleepMediaSessionPosition({ duration: 120, position: 30 });
    expect(session.setPositionState).toHaveBeenCalledWith({
      duration: 120,
      position: 30,
      playbackRate: 1,
    });
    updateSleepMediaSessionPosition({ duration: 0, position: 0 });
    expect(session.setPositionState).toHaveBeenCalledOnce();
  });
});
