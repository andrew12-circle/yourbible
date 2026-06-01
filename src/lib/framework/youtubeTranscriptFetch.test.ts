import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resumeYoutubeTranscriptFetch,
  restartYoutubeTranscriptFetch,
  startYoutubeTranscriptFetch,
} from "@/lib/framework/youtubeTranscriptFetch";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => {
  const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  const eqForSelect = vi.fn(() => ({ maybeSingle }));
  const eqForUpdate = vi.fn(() => Promise.resolve({ error: null }));
  const update = vi.fn(() => ({ eq: eqForUpdate }));
  const select = vi.fn(() => ({ eq: eqForSelect }));
  const from = vi.fn(() => ({ update, select }));
  return {
    supabase: {
      functions: { invoke: vi.fn() },
      from,
      __mocks: { eqForSelect, eqForUpdate, update, select, from, maybeSingle },
    },
  };
});

type SupabaseMock = typeof supabase & {
  __mocks: {
    eqForSelect: ReturnType<typeof vi.fn>;
    eqForUpdate: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  };
};

const mockedSupabase = supabase as SupabaseMock;

beforeEach(() => {
  vi.clearAllMocks();
  mockedSupabase.__mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mockedSupabase.__mocks.eqForUpdate.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("youtube transcript fetch helper", () => {
  it("starts the transcript edge function with the artifact token", async () => {
    vi.mocked(mockedSupabase.functions.invoke).mockResolvedValue({ data: { ok: true }, error: null });

    const result = await startYoutubeTranscriptFetch({
      artifactId: "artifact-1",
      url: "https://www.youtube.com/watch?v=abc123def45",
      processingToken: "token-1",
    });

    expect(result.ok).toBe(true);
    expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith("framework-fetch-transcript", {
      body: {
        artifact_id: "artifact-1",
        url: "https://www.youtube.com/watch?v=abc123def45",
        processing_token: "token-1",
      },
    });
    expect(mockedSupabase.__mocks.from).not.toHaveBeenCalled();
  });

  it("marks the artifact as errored when the edge function cannot be invoked", async () => {
    vi.mocked(mockedSupabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new Error("Function not found"),
    });

    const result = await startYoutubeTranscriptFetch({
      artifactId: "artifact-1",
      url: "https://www.youtube.com/watch?v=abc123def45",
      processingToken: "token-1",
    });

    expect(result).toEqual({
      ok: false,
      error: "Could not start transcript fetch: Function not found",
    });
    expect(mockedSupabase.__mocks.from).toHaveBeenCalledWith("artifacts");
    expect(mockedSupabase.__mocks.update).toHaveBeenCalledWith({
      status: "error",
      error: "Could not start transcript fetch: Function not found",
    });
    expect(mockedSupabase.__mocks.eqForUpdate).toHaveBeenCalledWith("id", "artifact-1");
  });

  it("resumes with the existing processing token when present", async () => {
    mockedSupabase.__mocks.maybeSingle.mockResolvedValue({
      data: { processing_token: "existing-token" },
      error: null,
    });
    vi.mocked(mockedSupabase.functions.invoke).mockResolvedValue({ data: { ok: true }, error: null });

    const result = await resumeYoutubeTranscriptFetch(
      "artifact-1",
      "https://www.youtube.com/watch?v=abc123def45",
    );

    expect(result.ok).toBe(true);
    expect(mockedSupabase.__mocks.select).toHaveBeenCalledWith("processing_token");
    expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith("framework-fetch-transcript", {
      body: {
        artifact_id: "artifact-1",
        url: "https://www.youtube.com/watch?v=abc123def45",
        processing_token: "existing-token",
      },
    });
    expect(mockedSupabase.__mocks.update).not.toHaveBeenCalled();
  });

  it("queues a fresh token before restarting a stuck fetch", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("retry-token" as `${string}-${string}-${string}-${string}-${string}`);
    vi.mocked(mockedSupabase.functions.invoke).mockResolvedValue({ data: { ok: true }, error: null });

    const result = await restartYoutubeTranscriptFetch(
      "artifact-1",
      "https://www.youtube.com/watch?v=abc123def45",
    );

    expect(result.ok).toBe(true);
    expect(mockedSupabase.__mocks.update).toHaveBeenCalledWith({
      status: "fetching",
      error: null,
      processing_token: "retry-token",
    });
    expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith("framework-fetch-transcript", {
      body: {
        artifact_id: "artifact-1",
        url: "https://www.youtube.com/watch?v=abc123def45",
        processing_token: "retry-token",
      },
    });
  });
});
