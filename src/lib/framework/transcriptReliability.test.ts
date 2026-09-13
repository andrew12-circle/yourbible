import { afterEach, describe, expect, it, vi } from "vitest";
import { isDirectTranscriptMediaUrl, shouldRetryTranscriptProvider, transcriptBillingBlocked, transcriptJobBudget, transcriptWithDeadline } from "../../../supabase/functions/_shared/transcriptReliability";
afterEach(() => vi.useRealTimers());
describe("transcript provider reliability", () => {
  it("does not retry depleted credit 429s as temporary capacity errors", () => {
    const message = '{"error":{"status":"RESOURCE_EXHAUSTED","message":"Your prepayment credits are depleted."}}';
    expect(transcriptBillingBlocked(message)).toBe(true);
    expect(shouldRetryTranscriptProvider(429, message)).toBe(false);
    expect(shouldRetryTranscriptProvider(402, "payment required")).toBe(false);
    expect(shouldRetryTranscriptProvider(429, "rate limit")).toBe(true);
    expect(shouldRetryTranscriptProvider(503, "upstream unavailable")).toBe(true);
    expect(shouldRetryTranscriptProvider(401, "invalid key")).toBe(false);
  });
  it.each(["https://www.youtube.com/watch?v=HbLhpMEmrqU", "https://youtu.be/HbLhpMEmrqU", "https://youtube.com/embed/HbLhpMEmrqU", "http://media.example/one.mp4", "https://127.0.0.1/audio", "https://localhost/file", "https://name:password@media.example/audio"])("never sends watch pages or unsafe URLs as media: %s", (url) => {
    expect(isDirectTranscriptMediaUrl(url)).toBe(false);
  });
  it("allows a direct signed HTTPS media URL", () => expect(isDirectTranscriptMediaUrl("https://rr1.googlevideo.com/videoplayback?id=abc")).toBe(true));
  it("clamps invalid or excessive edge wall-clock budgets", () => {
    expect(transcriptJobBudget("not-a-number")).toBe(125000);
    expect(transcriptJobBudget("540000")).toBe(125000);
  });
  it("clears the deadline timer on success", async () => {
    vi.useFakeTimers();
    await expect(transcriptWithDeadline(Promise.resolve("done"), 5000, "Test")).resolves.toBe("done");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects a hung provider without letting its later result acknowledge a save", async () => {
    vi.useFakeTimers();
    let finish!: (text: string) => void;
    const acknowledged = vi.fn();
    const result = transcriptWithDeadline(new Promise<string>((resolve) => { finish = resolve; }), 5000, "Transcript fetch").then(acknowledged);
    const rejection = expect(result).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(5001); await rejection;
    finish("late"); await Promise.resolve();
    expect(acknowledged).not.toHaveBeenCalled();
  });
});
