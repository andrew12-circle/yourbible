import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVisualSaved } from "./useVisualSaved";
import { savedVisualKey } from "@/lib/visualBible/explorerModel";
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("Device-local visual collections", () => {
  it("survives remounts but never leaks one account's favorites into another", () => {
    const first = renderHook(({ owner }) => useVisualSaved(owner), { initialProps: { owner: "account-a" } });
    act(() => first.result.current.toggle("visual:work-a"));
    expect(first.result.current.ids).toEqual(["visual:work-a"]);
    first.rerender({ owner: "account-b" });
    expect(first.result.current.ids).toEqual([]);
    act(() => first.result.current.toggle("place:a123456"));
    first.rerender({ owner: "account-a" });
    expect(first.result.current.ids).toEqual(["visual:work-a"]);
    first.unmount();
    const second = renderHook(() => useVisualSaved("account-a"));
    expect(second.result.current.ids).toEqual(["visual:work-a"]);
  });
  it("handles corrupt data and reports write failures without claiming a save", () => {
    localStorage.setItem(savedVisualKey("account-a"), "broken");
    const view = renderHook(() => useVisualSaved("account-a"));
    expect(view.result.current.ids).toEqual([]);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    act(() => view.result.current.toggle("visual:work-a"));
    expect(view.result.current.ids).toEqual([]);
    expect(view.result.current.error).toContain("could not save");
  });
  it("synchronizes two open galleries without clobbering saved IDs", () => {
    const first = renderHook(() => useVisualSaved("account-a"));
    const second = renderHook(() => useVisualSaved("account-a"));
    act(() => first.result.current.toggle("visual:work-a"));
    expect(second.result.current.ids).toEqual(["visual:work-a"]);
    act(() => second.result.current.toggle("place:a123456"));
    expect(first.result.current.ids).toEqual(["visual:work-a", "place:a123456"]);
    act(() => first.result.current.toggle("visual:work-a"));
    expect(second.result.current.ids).toEqual(["place:a123456"]);
  });
});
