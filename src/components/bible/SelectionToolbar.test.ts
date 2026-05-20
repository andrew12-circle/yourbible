import { describe, expect, it } from "vitest";
import { computeToolbarPosition, TOOLBAR_GAP, TOOLBAR_W } from "./SelectionToolbar";

const rect = { left: 100, top: 400, right: 300, bottom: 420 };
const base = { vw: 390, vh: 844, toolbarW: TOOLBAR_W, toolbarH: 72, dockBottom: false };

describe("computeToolbarPosition", () => {
  it("places toolbar above the selection when there is room", () => {
    const { top } = computeToolbarPosition(rect, base);
    expect(top + 72 + TOOLBAR_GAP).toBeLessThanOrEqual(rect.top);
  });

  it("places toolbar below when there is no room above", () => {
    const highRect = { left: 100, top: 4, right: 300, bottom: 24 };
    const { top } = computeToolbarPosition(highRect, base);
    expect(top).toBeGreaterThanOrEqual(highRect.bottom + TOOLBAR_GAP);
  });

  it("floats above selection on mobile when dock would cover it", () => {
    const lowRect = { left: 50, top: 760, right: 340, bottom: 800 };
    const { top } = computeToolbarPosition(lowRect, { ...base, dockBottom: true });
    expect(top + 72 + TOOLBAR_GAP).toBeLessThanOrEqual(lowRect.top);
  });

  it("docks to bottom on mobile when selection is high enough", () => {
    const { top } = computeToolbarPosition(rect, { ...base, dockBottom: true });
    expect(top).toBe(base.vh - 8 - 72);
  });
});
