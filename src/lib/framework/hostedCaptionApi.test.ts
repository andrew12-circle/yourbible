// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({ getUser: vi.fn(), captions: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser: h.getUser } }) }));
vi.mock("youtube-transcript-plus", () => ({ fetchTranscript: h.captions }));
import { POST } from "../../../api/youtube-captions";
const request = (body: object = { video_id: "HbLhpMEmrqU" }, auth = "Bearer user-token") => new Request("https://app.example/api/youtube-captions", { method: "POST", headers: { authorization: auth }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co"); vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test");
  h.getUser.mockReset().mockResolvedValue({ data: { user: { id: crypto.randomUUID() } }, error: null });
  h.captions.mockReset().mockResolvedValue([{ text: "The actual spoken words.", offset: 0, duration: 5 }]);
});
afterEach(() => vi.unstubAllEnvs());
describe("authenticated Node caption path", () => {
  it("verifies the existing Supabase session before fetching captions", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(h.getUser).toHaveBeenCalledWith("user-token");
    expect(h.captions).toHaveBeenCalledWith("HbLhpMEmrqU", expect.objectContaining({ retries: 0, signal: expect.any(AbortSignal) }));
    expect(await response.json()).toEqual({ video_id: "HbLhpMEmrqU", provider: "vercel_youtube_captions", segments: [{ text: "The actual spoken words.", start: 0, duration: 5 }] });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("does not call YouTube for unsigned or invalid sessions", async () => {
    expect((await POST(request({}, ""))).status).toBe(401);
    h.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request())).status).toBe(401);
    expect(h.captions).not.toHaveBeenCalled();
  });
  it("rejects arbitrary URLs and malformed video identities", async () => {
    expect((await POST(request({ video_id: "https://internal.example" }))).status).toBe(400);
    expect(h.captions).not.toHaveBeenCalled();
  });
  it("reports blocked scraping without claiming that the video was deleted", async () => {
    h.captions.mockRejectedValue(new Error("video no longer available cookie=private"));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toMatch(/private|deleted|removed/);
  });
  it("never replaces empty captions with a guessed transcript", async () => {
    h.captions.mockResolvedValue([]);
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(await response.json()).not.toHaveProperty("segments");
  });
  it("rejects corrupt cue data rather than silently dropping part of a transcript", async () => {
    h.captions.mockResolvedValue([{ text: "word", offset: NaN, duration: 3 }, { text: "actual", offset: 5, duration: 3 }]);
    expect((await POST(request())).status).toBe(502);
  });
});
