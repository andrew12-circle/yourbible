import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { imageResponseError, imageRetryDelay } from "../../../scripts/lib/image-download-backoff.mjs";
import { boundedVisualDerivative } from "../../../scripts/lib/visual-image-derivative.mjs";
describe("polite, bounded image acquisition", () => {
  it("honors Retry-After seconds and HTTP dates and stops on long requested pauses", () => {
    const error = imageResponseError(new Response(null, { status: 429, headers: { "retry-after": "120" } }), "https://example.org/a");
    expect(imageRetryDelay(error, 0)).toBe(120000);
    const dated = imageResponseError(new Response(null, { status: 503, headers: { "retry-after": "Thu, 24 Sep 2026 12:02:00 GMT" } }), "https://example.org/a", Date.parse("2026-09-24T12:00:00Z"));
    expect(imageRetryDelay(dated, 0)).toBe(120000);
    expect(() => imageRetryDelay({ status: 429, retryAfterMs: 700000 }, 0)).toThrow(/longer pause/);
    expect(() => imageRetryDelay({ status: 403 }, 0)).toThrow();
  });
  it("preserves the composition without enlargement and enforces a byte bound", async () => {
    const bytes = await sharp({ create: { width: 120, height: 60, channels: 3, background: "white" } }).png().toBuffer();
    const result = await boundedVisualDerivative(bytes, { size: 1600, quality: 90 });
    expect(result.info.width).toBe(120); expect(result.info.height).toBe(60); expect(result.data.length).toBeLessThanOrEqual(4900000);
    await expect(boundedVisualDerivative(bytes, { size: 120, quality: 90 }, 1)).rejects.toThrow(/byte limit/);
  });
});
