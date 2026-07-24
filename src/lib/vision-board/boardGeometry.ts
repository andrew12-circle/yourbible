/** Logical board size in board pixels (scaled to fit viewport). */
export const BOARD_WIDTH = 1200;
export const BOARD_HEIGHT = 800;

export const VISION_BOARD_ITEM_TYPES = ["photo", "note", "pin"] as const;
export type VisionBoardItemType = (typeof VISION_BOARD_ITEM_TYPES)[number];

export const BACKGROUND_KEYS = ["cork", "wood", "linen", "felt"] as const;
export type BackgroundKey = (typeof BACKGROUND_KEYS)[number];

export const NOTE_COLORS = ["yellow", "pink", "mint", "blue", "cream"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export type ItemTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export function isBackgroundKey(value: string): value is BackgroundKey {
  return (BACKGROUND_KEYS as readonly string[]).includes(value);
}

export function normalizeBackgroundKey(value: string | null | undefined): BackgroundKey {
  if (value && isBackgroundKey(value)) return value;
  return "cork";
}

export function isNoteColor(value: string): value is NoteColor {
  return (NOTE_COLORS as readonly string[]).includes(value);
}

export function normalizeNoteColor(value: string | null | undefined): NoteColor {
  if (value && isNoteColor(value)) return value;
  return "yellow";
}

export function defaultSizeForType(type: VisionBoardItemType): { width: number; height: number } {
  switch (type) {
    case "photo":
      return { width: 220, height: 180 };
    case "note":
      return { width: 160, height: 160 };
    case "pin":
      return { width: 36, height: 48 };
  }
}

/** Keep item mostly on the board; allow slight overhang. */
export function clampTransform(t: ItemTransform): ItemTransform {
  const minW = t.width < 40 && t.height < 50 ? 24 : 60;
  const minH = t.width < 40 && t.height < 50 ? 32 : 60;
  const width = Math.max(minW, Math.min(BOARD_WIDTH * 0.9, t.width));
  const height = Math.max(minH, Math.min(BOARD_HEIGHT * 0.9, t.height));
  const x = Math.max(-width * 0.4, Math.min(BOARD_WIDTH - width * 0.6, t.x));
  const y = Math.max(-height * 0.4, Math.min(BOARD_HEIGHT - height * 0.6, t.y));
  let rotation = t.rotation % 360;
  if (rotation > 180) rotation -= 360;
  if (rotation < -180) rotation += 360;
  return { x, y, width, height, rotation };
}

export function nextZIndex(items: { z_index: number }[]): number {
  if (!items.length) return 1;
  return Math.max(...items.map((i) => i.z_index)) + 1;
}

export function bringForward(
  items: { id: string; z_index: number }[],
  id: string,
): { id: string; z_index: number }[] {
  const sorted = [...items].sort((a, b) => a.z_index - b.z_index);
  const idx = sorted.findIndex((i) => i.id === id);
  if (idx < 0 || idx === sorted.length - 1) return items.map((i) => ({ id: i.id, z_index: i.z_index }));
  const a = sorted[idx];
  const b = sorted[idx + 1];
  return items.map((i) => {
    if (i.id === a.id) return { id: i.id, z_index: b.z_index };
    if (i.id === b.id) return { id: i.id, z_index: a.z_index };
    return { id: i.id, z_index: i.z_index };
  });
}

export function sendBackward(
  items: { id: string; z_index: number }[],
  id: string,
): { id: string; z_index: number }[] {
  const sorted = [...items].sort((a, b) => a.z_index - b.z_index);
  const idx = sorted.findIndex((i) => i.id === id);
  if (idx <= 0) return items.map((i) => ({ id: i.id, z_index: i.z_index }));
  const a = sorted[idx - 1];
  const b = sorted[idx];
  return items.map((i) => {
    if (i.id === a.id) return { id: i.id, z_index: b.z_index };
    if (i.id === b.id) return { id: i.id, z_index: a.z_index };
    return { id: i.id, z_index: i.z_index };
  });
}

/** Angle in degrees from item center to pointer (board coords). */
export function rotationFromPointer(
  centerX: number,
  centerY: number,
  pointerX: number,
  pointerY: number,
): number {
  const rad = Math.atan2(pointerY - centerY, pointerX - centerX);
  return (rad * 180) / Math.PI + 90;
}

export function noteColorCss(color: NoteColor): string {
  switch (color) {
    case "yellow":
      return "#fef3a0";
    case "pink":
      return "#fbcfe8";
    case "mint":
      return "#bbf7d0";
    case "blue":
      return "#bfdbfe";
    case "cream":
      return "#fef9c3";
  }
}
