import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import JournalEntryMapDock from "./JournalEntryMapDock";
import EntryMiniMap from "./EntryMiniMap";
const h = vi.hoisted(() => ({ mounts: vi.fn(), unmounts: vi.fn(), renders: vi.fn(), panTo: vi.fn(), type: "roadmap",
  props: {} as { onMapTypeIdChanged: (event: unknown) => void; mapTypeId: string } }));
vi.mock("@/components/journal/GoogleMapsShell", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
  GoogleMapErrorDetector: () => null, useJournalGoogleMapsKey: () => "test-key",
}));
vi.mock("@vis.gl/react-google-maps", async () => {
  const React = await import("react");
  const map = { panTo: h.panTo, getMapTypeId: () => h.type };
  return {
    ControlPosition: { TOP_RIGHT: 1, RIGHT_CENTER: 2, RIGHT_BOTTOM: 3 },
    useMap: () => map,
    Marker: () => null,
    Map: (props: typeof h.props & { children: ReactNode }) => {
      h.props = props; h.renders();
      React.useEffect(() => { h.mounts(); return () => { h.unmounts(); }; }, []);
      return <div data-testid="google-map">{props.children}</div>;
    },
  };
});
beforeEach(() => { h.mounts.mockReset(); h.unmounts.mockReset(); h.renders.mockReset(); h.panTo.mockReset(); h.type = "roadmap"; });
afterEach(cleanup);
const props = { lat: 10, lng: 20, temperature: 23, weatherIcon: "sun", weather: "Clear", location: "Town", journalName: "Journal", journalColor: "200 100% 50%" };
describe("journal map isolation", () => {
  it("does not recreate or render the map through repeated unrelated editor renders", () => {
    const { rerender, container } = render(<JournalEntryMapDock {...props} />);
    const map = screen.getByTestId("google-map");
    const footer = container.querySelector("footer");
    const renders = h.renders.mock.calls.length;
    for (let i = 0; i < 20; i++) rerender(<JournalEntryMapDock {...props} />);
    expect(screen.getByTestId("google-map")).toBe(map);
    expect(container.querySelector("footer")).toBe(footer);
    expect(h.mounts).toHaveBeenCalledTimes(1);
    expect(h.unmounts).not.toHaveBeenCalled();
    expect(h.renders).toHaveBeenCalledTimes(renders);
    expect(h.panTo).not.toHaveBeenCalled();
  });
  it("updates actual coordinates in place, without replacing the map or resetting its zoom/type", () => {
    const { rerender } = render(<JournalEntryMapDock {...props} />);
    const map = screen.getByTestId("google-map");
    rerender(<JournalEntryMapDock {...props} lat={11} />);
    expect(screen.getByTestId("google-map")).toBe(map);
    expect(h.mounts).toHaveBeenCalledTimes(1);
    expect(h.panTo).toHaveBeenCalledExactlyOnceWith({ lat: 11, lng: 20 });
  });
  it("preserves the selected satellite map type across later renders", () => {
    const { rerender } = render(<EntryMiniMap lat={10} lng={20} />);
    h.type = "satellite";
    act(() => h.props.onMapTypeIdChanged({ map: { getMapTypeId: () => h.type } }));
    rerender(<EntryMiniMap lat={11} lng={20} />);
    expect(h.props.mapTypeId).toBe("satellite");
    expect(h.mounts).toHaveBeenCalledTimes(1);
  });
  it("wires desktop autosaves to row updates and keeps mutable coordinates out of React keys", () => {
    const editor = readFileSync("src/components/journal/EntryEditorPane.tsx", "utf8");
    const dock = readFileSync("src/components/journal/JournalEntryMapDock.tsx", "utf8");
    expect(editor).toContain("onChangedRef.current(state.snapshot)");
    expect(editor).toContain("journalValueEqual(previous, next)");
    expect(editor).toContain("<JournalEntryMapDock");
    expect(dock).not.toContain("key=");
    expect(dock).not.toContain("bodyFocused");
    for (const page of ["JournalPage", "JournalNotesPage"]) {
      const source = readFileSync(`src/pages/journal/${page}.tsx`, "utf8");
      expect(source).toContain("if (snapshot) notifyJournalListEntrySaved(snapshot)");
      expect(source).not.toContain("}, [user]);");
    }
  });
});
