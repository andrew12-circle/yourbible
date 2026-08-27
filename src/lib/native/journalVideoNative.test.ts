import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nativeMocks = vi.hoisted(() => {
  const listeners = new Map<string, (event: unknown) => void>();
  const removeListeners = new Map<string, ReturnType<typeof vi.fn>>();
  return {
    listeners,
    removeListeners,
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => "ios"),
    convertFileSrc: vi.fn((url: string) => `capacitor://local/${encodeURIComponent(url)}`),
    plugin: {
      startJournalVideoCapture: vi.fn(),
      getJournalVideoCaptureState: vi.fn(),
      listPendingJournalVideoCaptures: vi.fn(),
      getPendingJournalVideoCapture: vi.fn(),
      resumePendingJournalVideoCapture: vi.fn(),
      acknowledgePendingJournalVideoCapture: vi.fn(),
      discardPendingJournalVideoCapture: vi.fn(),
      addListener: vi.fn(),
    },
  };
});

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => nativeMocks.isNativePlatform(),
    getPlatform: () => nativeMocks.getPlatform(),
    convertFileSrc: (url: string) => nativeMocks.convertFileSrc(url),
  },
  registerPlugin: () => nativeMocks.plugin,
}));

import {
  acknowledgeNativeJournalVideoQueued,
  buildNativeJournalVideoCaptureResult,
  createNativeJournalVideoDraftOwnerId,
  discardNativeJournalVideoCapture,
  findPendingNativeJournalVideoCapture,
  getNativeJournalVideoCapture,
  nativeJournalVideoCaptureSupported,
  nativeJournalVideoRecoveryHref,
  parseNativeLifeWeekVideoOwner,
  readNativeJournalVideoDraftEntry,
  rememberNativeJournalVideoDraftEntry,
  isNativeJournalVideoDraftOwnerId,
  readNativeJournalVideoBlob,
  resumeNativeJournalVideoCapture,
  startNativeJournalVideoCapture,
  waitForNativeJournalVideoCaptureReady,
  type NativeJournalVideoCaptureSnapshot,
  type StartNativeJournalVideoCaptureOptions,
} from "@/lib/native/journalVideoNative";

const startOptions: StartNativeJournalVideoCaptureOptions = {
  sessionId: "session-1",
  userId: "user-1",
  entryId: "entry-1",
  anchorOffset: 4,
  maxDurationMs: 30_000,
  maxBytes: 5_000_000,
  teleprompter: "Remember this moment",
};

const recording: NativeJournalVideoCaptureSnapshot = {
  sessionId: "session-1",
  state: "recording",
  userId: "user-1",
  entryId: "entry-1",
  durationMs: 2_000,
  byteSize: 2_048,
};

const ready: NativeJournalVideoCaptureSnapshot = {
  ...recording,
  state: "pendingHandoff",
  fileUrl: "file:///journal/session-1.mp4",
  mimeType: "video/mp4",
  durationMs: 12_000,
  byteSize: 12_345,
};

beforeEach(() => {
  localStorage.clear();
  nativeMocks.listeners.clear();
  nativeMocks.removeListeners.clear();
  nativeMocks.isNativePlatform.mockReturnValue(true);
  nativeMocks.getPlatform.mockReturnValue("ios");
  nativeMocks.convertFileSrc.mockImplementation(
    (url: string) => `capacitor://local/${encodeURIComponent(url)}`,
  );
  for (const mock of Object.values(nativeMocks.plugin)) mock.mockReset();
  nativeMocks.plugin.addListener.mockImplementation(async (name, listener) => {
    const remove = vi.fn(async () => {
      nativeMocks.listeners.delete(name);
    });
    nativeMocks.listeners.set(name, listener);
    nativeMocks.removeListeners.set(name, remove);
    return { remove };
  });
  nativeMocks.plugin.listPendingJournalVideoCaptures.mockResolvedValue({ captures: [] });
  nativeMocks.plugin.getPendingJournalVideoCapture.mockResolvedValue(ready);
  nativeMocks.plugin.resumePendingJournalVideoCapture.mockResolvedValue(recording);
  nativeMocks.plugin.acknowledgePendingJournalVideoCapture.mockResolvedValue(undefined);
  nativeMocks.plugin.discardPendingJournalVideoCapture.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("native journal video bridge", () => {
  it("only reports support in the native iOS shell", () => {
    expect(nativeJournalVideoCaptureSupported()).toBe(true);
    nativeMocks.getPlatform.mockReturnValue("android");
    expect(nativeJournalVideoCaptureSupported()).toBe(false);
    nativeMocks.isNativePlatform.mockReturnValue(false);
    nativeMocks.getPlatform.mockReturnValue("ios");
    expect(nativeJournalVideoCaptureSupported()).toBe(false);
  });

  it("requires Swift to preserve the JS-generated stable session id", async () => {
    nativeMocks.plugin.startJournalVideoCapture.mockResolvedValue(recording);
    await expect(startNativeJournalVideoCapture(startOptions)).resolves.toEqual(recording);
    expect(nativeMocks.plugin.startJournalVideoCapture).toHaveBeenCalledWith(startOptions);

    nativeMocks.plugin.startJournalVideoCapture.mockResolvedValue({
      ...recording,
      sessionId: "native-replaced-id",
    });
    await expect(startNativeJournalVideoCapture(startOptions)).rejects.toThrow(
      "different journal video session id",
    );
  });

  it("normalizes Swift bytes/error fields for the web state machine", async () => {
    nativeMocks.plugin.getJournalVideoCaptureState.mockResolvedValue({
      ...recording,
      byteSize: undefined,
      bytes: 4_096,
      error: "camera interrupted",
    });

    await expect(getNativeJournalVideoCapture("session-1")).resolves.toMatchObject({
      byteSize: 4_096,
      errorMessage: "camera interrupted",
    });
  });

  it("uses ready events and removes all listeners after resolving", async () => {
    nativeMocks.plugin.getJournalVideoCaptureState.mockResolvedValue(recording);
    const updates: NativeJournalVideoCaptureSnapshot[] = [];
    const waiting = waitForNativeJournalVideoCaptureReady("session-1", {
      pollIntervalMs: 60_000,
      onUpdate: (update) => updates.push(update),
    });

    await vi.waitFor(() => expect(nativeMocks.plugin.addListener).toHaveBeenCalledTimes(4));
    nativeMocks.listeners.get("journalVideoReady")?.(ready);

    await expect(waiting).resolves.toEqual(ready);
    expect(updates).toContainEqual(ready);
    expect(
      [...nativeMocks.removeListeners.values()].every(
        (remove: ReturnType<typeof vi.fn>) => remove.mock.calls.length === 1,
      ),
    ).toBe(true);
  });

  it("polls a relaunched session when its event was missed", async () => {
    vi.useFakeTimers();
    nativeMocks.plugin.getJournalVideoCaptureState
      .mockResolvedValueOnce(recording)
      .mockResolvedValueOnce({ ...ready, fileUrl: undefined });
    const waiting = waitForNativeJournalVideoCaptureReady("session-1", {
      pollIntervalMs: 25,
    });

    await vi.advanceTimersByTimeAsync(100);

    await expect(waiting).resolves.toEqual(ready);
    expect(nativeMocks.plugin.getJournalVideoCaptureState.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("finds only the newest pending draft owned by the exact user and entry", async () => {
    nativeMocks.plugin.listPendingJournalVideoCaptures.mockResolvedValue({
      captures: [
        { ...ready, sessionId: "wrong-user", userId: "user-2" },
        { ...ready, sessionId: "older", updatedAt: "2026-08-27T10:00:00.000Z" },
        { ...ready, sessionId: "newer", updatedAt: "2026-08-27T11:00:00.000Z" },
        { ...ready, sessionId: "wrong-entry", entryId: "entry-2" },
      ],
    });

    await expect(
      findPendingNativeJournalVideoCapture({ userId: "user-1", entryId: "entry-1" }),
    ).resolves.toMatchObject({ sessionId: "newer" });
    await expect(
      findPendingNativeJournalVideoCapture(undefined),
    ).resolves.toBeNull();
  });

  it("creates a recovery deep link only for an exact-user journal entry", () => {
    const capture = {
      ...ready,
      userId: "user-1",
      entryId: "6cd9c431-adca-489a-a564-328a2cc4f0dd",
    };
    expect(nativeJournalVideoRecoveryHref(capture, "user-1")).toBe(
      "/journal/6cd9c431-adca-489a-a564-328a2cc4f0dd/edit?resumeVideo=1",
    );
    expect(nativeJournalVideoRecoveryHref(capture, "user-2")).toBeNull();
    expect(
      nativeJournalVideoRecoveryHref(
        { ...capture, entryId: "life-week:self:123" },
        "user-1",
      ),
    ).toBe("/life-weeks?resumeLifeWeekVideo=life-week%3Aself%3A123");
    expect(
      nativeJournalVideoRecoveryHref(
        { ...capture, entryId: "journal-draft:native-local-session-1" },
        "user-1",
      ),
    ).toBe(
      "/journal/new?resumeVideo=1&nativeVideoOwner=journal-draft%3Anative-local-session-1",
    );
    expect(nativeJournalVideoRecoveryHref({ ...capture, entryId: "unknown-owner" }, "user-1"))
      .toBeNull();
  });

  it("creates a validated owner for an offline native journal draft", () => {
    const owner = createNativeJournalVideoDraftOwnerId();
    expect(isNativeJournalVideoDraftOwnerId(owner)).toBe(true);
    expect(isNativeJournalVideoDraftOwnerId("journal-draft:../../other-user")).toBe(false);
  });

  it("remembers the server entry bound to a local native draft", () => {
    const owner = "journal-draft:native-local-session-1";
    const entryId = "6cd9c431-adca-489a-a564-328a2cc4f0dd";
    expect(rememberNativeJournalVideoDraftEntry("user-1", owner, entryId)).toBe(true);
    expect(readNativeJournalVideoDraftEntry("user-1", owner)).toBe(entryId);
    expect(readNativeJournalVideoDraftEntry("user-2", owner)).toBeNull();
    expect(
      nativeJournalVideoRecoveryHref({ ...ready, userId: "user-1", entryId: owner }, "user-1"),
    ).toBe(
      `/journal/${entryId}/edit?resumeVideo=1&nativeVideoOwner=journal-draft%3Anative-local-session-1`,
    );
  });

  it("strictly parses a native Life Week owner", () => {
    expect(parseNativeLifeWeekVideoOwner("life-week:self:123")).toEqual({
      subject: "self",
      weekIndex: 123,
    });
    expect(parseNativeLifeWeekVideoOwner("life-week:self:-1")).toBeNull();
    expect(parseNativeLifeWeekVideoOwner("life-week:self:1:other")).toBeNull();
  });

  it("converts the file URL and fetches a Blob without base64", async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      blob: async () => new Blob(["native-video"], { type: "application/octet-stream" }),
    })) as unknown as typeof fetch;

    const blob = await readNativeJournalVideoBlob(ready, fetcher);

    expect(nativeMocks.convertFileSrc).toHaveBeenCalledWith(ready.fileUrl);
    expect(fetcher).toHaveBeenCalledWith(
      `capacitor://local/${encodeURIComponent(ready.fileUrl ?? "")}`,
    );
    expect(blob.type).toBe("video/mp4");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("rejects empty or oversized descriptors before reading native media", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;

    await expect(
      readNativeJournalVideoBlob({ ...ready, byteSize: 0 }, fetcher),
    ).rejects.toThrow("descriptor was empty");
    await expect(
      readNativeJournalVideoBlob({ ...ready, byteSize: 49 * 1_024 * 1_024 }, fetcher),
    ).rejects.toThrow("exceeds the upload limit");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps the native session id through review, queue id, and cleanup APIs", async () => {
    const blob = new Blob(["video"], { type: "video/mp4" });
    expect(buildNativeJournalVideoCaptureResult(ready, blob)).toMatchObject({
      video: blob,
      durationMs: 12_000,
      recoveryDraftId: "session-1",
      nativeCaptureId: "session-1",
    });

    await resumeNativeJournalVideoCapture("session-1");
    await acknowledgeNativeJournalVideoQueued("session-1");
    await discardNativeJournalVideoCapture("session-1");

    expect(nativeMocks.plugin.resumePendingJournalVideoCapture).toHaveBeenCalledWith({
      sessionId: "session-1",
    });
    expect(nativeMocks.plugin.acknowledgePendingJournalVideoCapture).toHaveBeenCalledWith({
      sessionId: "session-1",
    });
    expect(nativeMocks.plugin.discardPendingJournalVideoCapture).toHaveBeenCalledWith({
      sessionId: "session-1",
    });
  });
});
