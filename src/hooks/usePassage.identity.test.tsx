import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Passage } from "@/lib/bible/api";
const load = vi.hoisted(() => vi.fn());
vi.mock("@/lib/bible/fetchPassageWithCache", () => ({ fetchPassageWithCache: load }));
import { usePassage } from "@/hooks/usePassage";
const passage = (chapter: number): Passage => ({ reference: `John ${chapter}`, verses: [{ number: 1, text: `Synthetic chapter ${chapter}.` }], paragraphStarts: [1], headings: [] });

describe("reader chapter identity", () => {
  it("never exposes a previous chapter while a different chapter is pending", async () => {
    let resolveSecond!: (p: Passage) => void;
    load.mockReset().mockResolvedValueOnce(passage(1)).mockImplementationOnce(() => new Promise<Passage>((resolve) => { resolveSecond = resolve; }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, rerender, unmount } = renderHook(({ chapter }) => usePassage("fixture", "Jhn", chapter), { initialProps: { chapter: 1 }, wrapper });
    await waitFor(() => expect(result.current.data?.reference).toBe("John 1"));
    rerender({ chapter: 2 });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await act(async () => resolveSecond(passage(2)));
    await waitFor(() => expect(result.current.data?.reference).toBe("John 2"));
    unmount(); client.clear();
  });
});
