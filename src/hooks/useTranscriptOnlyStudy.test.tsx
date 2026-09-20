import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTranscriptOnlyStudy } from "./useTranscriptOnlyStudy";
import { buildTranscriptOnlyStudy } from "@/lib/framework/transcriptOnlyStudy";

const text = "Read the whole source carefully before deciding what the speaker means. Written references such as John 3:16 need context.";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("local transcript work", () => {
  it("works without Worker and without a single network request", async () => {
    vi.stubGlobal("Worker", undefined);
    const fetch = vi.fn(() => { throw new Error("No network permitted"); });
    vi.stubGlobal("fetch", fetch);
    const { result } = renderHook(() => useTranscriptOnlyStudy("a", text, true));
    await waitFor(() => expect(result.current.result?.excerpts.length).toBe(1));
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does no work while collapsed", () => {
    const worker = vi.fn(); vi.stubGlobal("Worker", worker);
    const { result } = renderHook(() => useTranscriptOnlyStudy("a", text, false));
    expect(result.current.pending).toBe(false);
    expect(worker).not.toHaveBeenCalled();
  });
  it("discards late worker results on artifact navigation, source edits, and unmount", async () => {
    const workers: FakeWorker[] = [];
    class FakeWorker {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onerror = null;
      request: { id: number; text: string } | null = null;
      terminate = vi.fn();
      postMessage = (request: { id: number; text: string }) => { this.request = request; };
      constructor() { workers.push(this); }
      complete() { this.onmessage?.({ data: { id: this.request!.id, result: buildTranscriptOnlyStudy(this.request!.text) } }); }
    }
    vi.stubGlobal("Worker", FakeWorker);
    const { result, rerender, unmount } = renderHook(({ id, source }) => useTranscriptOnlyStudy(id, source, true), { initialProps: { id: "a", source: text } });
    rerender({ id: "b", source: text + " Different source." });
    expect(workers[0].terminate).toHaveBeenCalled();
    act(() => workers[0].complete());
    expect(result.current.result).toBeUndefined();
    act(() => workers[1].complete());
    expect(result.current.result?.sourceChars).toBe((text + " Different source.").length);
    rerender({ id: "b", source: text + " Edited source." });
    expect(result.current.result).toBeUndefined();
    unmount();
    expect(workers[2].terminate).toHaveBeenCalled();
  });
  it("keeps a large source readable when worker construction is blocked", async () => {
    vi.stubGlobal("Worker", class { constructor() { throw new Error("Blocked"); } });
    const { result } = renderHook(() => useTranscriptOnlyStudy("a", text.repeat(2000), true));
    await waitFor(() => expect(result.current.error).toMatch(/cannot scan a large transcript/));
    expect(result.current.pending).toBe(false);
  });
});
