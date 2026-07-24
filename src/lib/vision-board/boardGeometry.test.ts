import {
  BACKGROUND_KEYS,
  bringForward,
  clampTransform,
  defaultSizeForType,
  isBackgroundKey,
  nextZIndex,
  normalizeBackgroundKey,
  normalizeNoteColor,
  noteColorCss,
  rotationFromPointer,
  sendBackward,
} from "@/lib/vision-board/boardGeometry";

describe("vision board geometry", () => {
  it("normalizes unknown background to cork", () => {
    expect(normalizeBackgroundKey(undefined)).toBe("cork");
    expect(normalizeBackgroundKey("neon")).toBe("cork");
    expect(isBackgroundKey("wood")).toBe(true);
    expect(BACKGROUND_KEYS).toContain("felt");
  });

  it("clamps transform onto the board", () => {
    const t = clampTransform({ x: -500, y: 9000, width: 10, height: 10, rotation: 400 });
    expect(t.width).toBeGreaterThanOrEqual(24);
    expect(t.y).toBeLessThan(800);
    expect(t.rotation).toBeGreaterThanOrEqual(-180);
    expect(t.rotation).toBeLessThanOrEqual(180);
  });

  it("assigns next z-index", () => {
    expect(nextZIndex([])).toBe(1);
    expect(nextZIndex([{ z_index: 2 }, { z_index: 5 }])).toBe(6);
  });

  it("bringForward and sendBackward swap neighbors", () => {
    const items = [
      { id: "a", z_index: 1 },
      { id: "b", z_index: 2 },
      { id: "c", z_index: 3 },
    ];
    const up = bringForward(items, "a");
    expect(up.find((i) => i.id === "a")?.z_index).toBe(2);
    expect(up.find((i) => i.id === "b")?.z_index).toBe(1);

    const down = sendBackward(items, "c");
    expect(down.find((i) => i.id === "c")?.z_index).toBe(2);
    expect(down.find((i) => i.id === "b")?.z_index).toBe(3);
  });

  it("default sizes differ by type", () => {
    expect(defaultSizeForType("pin").width).toBeLessThan(defaultSizeForType("photo").width);
    expect(defaultSizeForType("note").height).toBe(160);
  });

  it("note colors and rotation helper", () => {
    expect(normalizeNoteColor("pink")).toBe("pink");
    expect(normalizeNoteColor("x")).toBe("yellow");
    expect(noteColorCss("mint")).toMatch(/^#/);
    const deg = rotationFromPointer(0, 0, 0, -10);
    expect(deg).toBeCloseTo(0, 0);
  });
});
