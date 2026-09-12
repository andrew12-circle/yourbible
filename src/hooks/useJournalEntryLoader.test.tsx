import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingleMock = vi.fn();
const photosSelectMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "journal_entries") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: maybeSingleMock }),
          }),
        };
      }
      if (table === "journal_photos") {
        return {
          select: () => ({
            eq: () => photosSelectMock(),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  },
}));

vi.mock("@/lib/journal/photos", () => ({
  getSignedPhotoUrls: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

import { useJournalEntryLoader } from "./useJournalEntryLoader";
import { toast } from "@/hooks/use-toast";

const entryRow = {
  id: "e1",
  user_id: "owner",
  revision: 1,
  e2e_encrypted: false,
  title: "T",
  body: "body",
  summary: null,
  mood: null,
  tags: [],
  entry_at_ts: "2024-01-01",
  pinned: false,
  analyze_for_mirror: false,
  journal_id: "j1",
  location_name: null,
  weather: null,
  weather_temp_c: null,
  weather_icon: null,
  entry_kind: null,
};

describe("useJournalEntryLoader", () => {
  beforeEach(() => {
    vi.mocked(toast).mockClear();
    maybeSingleMock.mockReset();
    photosSelectMock.mockReset();
    photosSelectMock.mockResolvedValue({ data: [] });
  });

  it("sets notFound when entry is missing", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useJournalEntryLoader("e1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notFound).toBe(true);
    expect(result.current.entry).toBeNull();
  });

  it("loads entry when present", async () => {
    maybeSingleMock.mockResolvedValue({ data: entryRow, error: null });
    const { result } = renderHook(() => useJournalEntryLoader("e1"));
    await waitFor(() => expect(result.current.entry?.id).toBe("e1"));
    expect(result.current.notFound).toBe(false);
    expect(result.current.entry).toMatchObject({ revision: 1, user_id: "owner" });
  });

  it("ignores stale load when entryId changes", async () => {
    let resolveFirst!: (v: unknown) => void;
    maybeSingleMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    maybeSingleMock.mockResolvedValueOnce({ data: { ...entryRow, id: "e2", title: "New" }, error: null });

    const { result, rerender } = renderHook(({ id }) => useJournalEntryLoader(id), {
      initialProps: { id: "e1" as string | null },
    });
    rerender({ id: "e2" });
    resolveFirst({ data: entryRow, error: null });
    await waitFor(() => expect(result.current.entry?.id).toBe("e2"));
    expect(result.current.entry?.title).toBe("New");
  });

  it("rejects an unversioned row instead of bypassing concurrency protection", async () => {
    maybeSingleMock.mockResolvedValue({ data: { ...entryRow, revision: undefined }, error: null });
    const { result } = renderHook(() => useJournalEntryLoader("e1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entry).toBeNull();
    expect(result.current.notFound).toBe(false);
    expect(photosSelectMock).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Couldn't load entry", variant: "destructive",
      description: expect.stringContaining("revision support"),
    }));
  });

  it("reports a failed read without treating the entry as deleted", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: new Error("Connection interrupted") });
    const { result } = renderHook(() => useJournalEntryLoader("e1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entry).toBeNull();
    expect(result.current.notFound).toBe(false);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Couldn't load entry", variant: "destructive",
      description: expect.stringContaining("Connection interrupted"),
    }));
  });
});
