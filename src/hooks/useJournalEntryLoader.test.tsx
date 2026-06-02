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

const entryRow = {
  id: "e1",
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
});
