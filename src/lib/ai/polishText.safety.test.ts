import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { polishText } from "./polishText";
const h = vi.hoisted(() => ({ auth: vi.fn(), fetch: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: h.auth } } }));
beforeEach(() => {
  h.auth.mockReset().mockResolvedValue({ data: { session: { access_token: "test" } } });
  h.fetch.mockReset(); vi.stubGlobal("fetch", h.fetch);
  vi.stubEnv("VITE_AI_POLISH_URL", ""); vi.stubEnv("VITE_AI_POLISH_KEY", "");
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.test");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("proofreading cannot replace complete text with a truncated prefix", () => {
  it.each([12001, 15021, 80000])("preserves all %i characters without sending a request", async (size) => {
    const original = "x".repeat(size - 20) + " THE IRREPLACEABLE END";
    expect(await polishText(original)).toBe(original);
    expect(h.fetch).not.toHaveBeenCalled(); expect(h.auth).not.toHaveBeenCalled();
  });
  it.each([undefined, "", "Short partial response"]) ("rejects incomplete output %s", async (polished) => {
    const original = "This is my original complete journal sentence. ".repeat(12);
    h.fetch.mockResolvedValue(new Response(JSON.stringify({ polished })));
    expect(await polishText(original)).toBe(original);
  });
  it("accepts a bounded correction without changing untouched input on errors", async () => {
    h.fetch.mockResolvedValue(new Response(JSON.stringify({ polished: "This is my complete journal sentence." })));
    expect(await polishText("This is my complete jurnal sentence.")).toBe("This is my complete journal sentence.");
    h.fetch.mockRejectedValue(new Error("offline"));
    await expect(polishText("My complete original text remains unchanged.")).rejects.toThrow("offline");
  });
  it("passes cancellation through to the request", async () => {
    h.fetch.mockResolvedValue(new Response(JSON.stringify({ polished: "Same complete journal text" })));
    const controller = new AbortController();
    await polishText("Same complete journal text", controller.signal);
    expect(h.fetch.mock.calls[0][1].signal).toBe(controller.signal);
  });
});
