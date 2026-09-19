import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  start: vi.fn(), abort: vi.fn(), previous: vi.fn(), resume: vi.fn(),
  options: null as Record<string, any> | null,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: mocks.getSession } } }));
vi.mock("tus-js-client", () => ({ Upload: class {
  constructor(_blob: Blob, options: Record<string, any>) { mocks.options = options; }
  start = mocks.start;
  abort = mocks.abort;
  findPreviousUploads = mocks.previous;
  resumeFromPreviousUpload = mocks.resume;
} }));
import { journalVideoResumableEndpoint, uploadJournalVideoResumable, JOURNAL_VIDEO_RESUMABLE_THRESHOLD } from "./journalVideoResumableUpload";

const input = () => ({ userId: "user-1", bucket: "journal-videos", path: "user-1/entry-1/recording.webm",
  blob: new Blob(["video"], { type: "video/webm" }), contentType: "video/webm", upsert: true });
const tick = async () => { await vi.waitFor(() => expect(mocks.start).toHaveBeenCalled()); };

describe("resumable journal videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" }, access_token: "current-token" } }, error: null });
    mocks.abort.mockResolvedValue(undefined);
    mocks.previous.mockResolvedValue([]);
    mocks.options = null;
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

  it("uses direct storage, exact six-megabyte chunks, scoped fingerprints and fresh authorization", async () => {
    const pending = uploadJournalVideoResumable(input());
    await tick();
    const options = mocks.options!;
    expect(options.endpoint).toBe("https://example.storage.supabase.co/storage/v1/upload/resumable");
    expect(options.chunkSize).toBe(JOURNAL_VIDEO_RESUMABLE_THRESHOLD);
    expect(options.removeFingerprintOnSuccess).toBe(true);
    expect(options.headers).toEqual({ "x-upsert": "true" });
    const request = { getURL: () => options.endpoint, setHeader: vi.fn() };
    await options.onBeforeRequest(request);
    expect(request.setHeader).toHaveBeenCalledWith("authorization", "Bearer current-token");
    const fingerprint = await options.fingerprint();
    expect(fingerprint).toContain("user-1/entry-1/recording.webm");
    expect(fingerprint).not.toContain("current-token");
    options.onSuccess(); await pending;
  });

  it("resumes only a receipt on the configured storage origin", async () => {
    const trusted = { uploadUrl: "https://example.storage.supabase.co/storage/v1/upload/resumable/upload-id" };
    mocks.previous.mockResolvedValue([{ uploadUrl: "https://untrusted.test/collect" }, trusted]);
    const pending = uploadJournalVideoResumable(input()); await tick();
    expect(mocks.resume).toHaveBeenCalledWith(trusted);
    mocks.options!.onSuccess(); await pending;
  });

  it("refuses forwarding credentials to an untrusted receipt or a different account", async () => {
    const pending = uploadJournalVideoResumable(input()); await tick();
    const setHeader = vi.fn();
    await expect(mocks.options!.onBeforeRequest({ getURL: () => "https://untrusted.test/collect", setHeader })).rejects.toThrow("Untrusted");
    expect(setHeader).not.toHaveBeenCalled();
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "other-user" }, access_token: "other-token" } }, error: null });
    await expect(mocks.options!.onBeforeRequest({ getURL: () => mocks.options!.endpoint, setHeader })).rejects.toThrow("recording's account");
    expect(setHeader).not.toHaveBeenCalled();
    mocks.options!.onError(new Error("offline"));
    await expect(pending).rejects.toThrow("offline");
    expect(mocks.abort).toHaveBeenCalledWith(false);
  });

  it("returns an idle connection to the durable retry queue without terminating its server upload", async () => {
    const pending = uploadJournalVideoResumable(input()); await tick();
    vi.useFakeTimers();
    mocks.options!.onProgress(1, 5);
    const assertion = expect(pending).rejects.toThrow("connection stopped responding");
    await vi.advanceTimersByTimeAsync(90_001);
    await assertion;
    expect(mocks.abort).toHaveBeenCalledWith(false);
    mocks.options!.onAfterResponse();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves local/custom HTTPS endpoints and rejects insecure remote destinations", () => {
    expect(journalVideoResumableEndpoint("http://localhost:54321")).toBe("http://localhost:54321/storage/v1/upload/resumable");
    expect(() => journalVideoResumableEndpoint("http://remote.test")).toThrow("secure");
  });
});
