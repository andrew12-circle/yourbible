import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useEffect, type PropsWithChildren } from "react";
import { useReaderContinuation } from "./useReaderContinuation";
import { passageQueryKey } from "./usePassage";
import { fetchPassageWithCache } from "@/lib/bible/fetchPassageWithCache";
import type { Passage } from "@/lib/bible/api";
vi.mock("@/lib/bible/fetchPassageWithCache", () => ({ fetchPassageWithCache: vi.fn() }));
const passage = (ch: number): Passage => ({ reference: `Psalms ${ch}`, verses: [{ number: 1, text: `Original chapter ${ch}.` }], paragraphStarts: [1], headings: [] });
const base = [{ bookAbbr: "Psa", bookName: "Psalms", chapter: 7, ...passage(7), poetryBlocks: [] }];
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const options = { bibleId: "test", scope: "Psa6", after: { bookAbbr: "Psa", chapter: 7 }, baseChapters: base, baseReady: true, enabled: true };
  return { client, wrapper, options };
}
beforeEach(() => { vi.mocked(fetchPassageWithCache).mockReset(); });
describe("measured continuation query ownership", () => {
  it("loads one additional chapter on demand, reuses cached data, and keeps stable paragraphs", async () => {
    const { client, wrapper, options } = setup();
    client.setQueryData(passageQueryKey("test", "Psa", 8), passage(8));
    vi.mocked(fetchPassageWithCache).mockResolvedValue(passage(9));
    const { result, rerender } = renderHook(props => useReaderContinuation(props), { initialProps: options, wrapper });
    expect(fetchPassageWithCache).not.toHaveBeenCalled();
    act(() => { result.current.extend(); result.current.extend(); });
    await waitFor(() => expect(result.current.chapters.map(ch => ch.chapter)).toEqual([7, 8]));
    expect(fetchPassageWithCache).not.toHaveBeenCalled();
    const chapters = result.current.chapters;
    rerender(options);
    expect(result.current.chapters).toBe(chapters);
    act(() => result.current.extend());
    await waitFor(() => expect(result.current.chapters.map(ch => ch.chapter)).toEqual([7, 8, 9]));
    expect(fetchPassageWithCache).toHaveBeenCalledTimes(1);
  });
  it("does not insert a later cached chapter over a missing one, and keeps old requests out of a new scope", async () => {
    const { client, wrapper, options } = setup();
    let resolve!: (data: Passage) => void;
    vi.mocked(fetchPassageWithCache).mockImplementation(() => new Promise(done => { resolve = done; }));
    client.setQueryData(passageQueryKey("test", "Psa", 9), passage(9));
    const props = { ...options, through: { bookAbbr: "Psa", chapter: 9 } };
    const { result, rerender } = renderHook(input => useReaderContinuation(input), { initialProps: props, wrapper });
    await waitFor(() => expect(result.current.pending).toBe(true));
    expect(result.current.chapters.map(ch => ch.chapter)).toEqual([7]);
    rerender({ ...props, scope: "other", after: { bookAbbr: "Rev", chapter: 22 }, enabled: false });
    await act(async () => resolve(passage(8)));
    expect(result.current.chapters).toBe(base);
    expect(result.current.pending).toBe(false);
  });
  it("rejects wrong chapter identity and exposes a retry rather than skipping Scripture", async () => {
    const { client, wrapper, options } = setup();
    client.setQueryData(passageQueryKey("test", "Psa", 8), passage(9));
    const { result } = renderHook(() => useReaderContinuation({ ...options, through: { bookAbbr: "Psa", chapter: 8 } }), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.chapters).toBe(base);
    expect(result.current.canExtend).toBe(false);
  });
  it("keeps filling a new window after the previous window reached its cap", async () => {
    const { client, wrapper, options } = setup();
    vi.mocked(fetchPassageWithCache).mockImplementation(async (_id, _book, chapter) => passage(chapter));
    const { result, rerender } = renderHook((opts) => {
      const value = useReaderContinuation(opts);
      const need = value.refs.length < 5;
      const extend = value.extend;
      useEffect(() => { if (need) extend(); }, [need, extend]);
      return value;
    }, { initialProps: { ...options, through: {bookAbbr:"Psa", chapter:23} }, wrapper });
    await waitFor(() => expect(result.current.chapters.length).toBe(17));
    rerender({ ...options, scope:"Psa23", after:{bookAbbr:"Psa",chapter:24}, through:{bookAbbr:"Psa",chapter:23} });
    await waitFor(() => expect(result.current.refs.length).toBe(5));
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.error).toBeNull();
    client.clear();
  });

});
