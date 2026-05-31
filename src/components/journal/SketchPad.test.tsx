import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SketchPad from "./SketchPad";

const canvasContext = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
} as unknown as CanvasRenderingContext2D;

const rect = {
  bottom: 500,
  height: 500,
  left: 0,
  right: 800,
  top: 0,
  width: 800,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

describe("SketchPad", () => {
  beforeEach(() => {
    window.localStorage.removeItem("sketchpad:paper");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvasContext);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens new sketches on notebook paper by default", () => {
    render(<SketchPad open onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByRole("radio", { name: "Notebook paper" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("blocks browser selection and callout gestures on the sketch surface", () => {
    render(<SketchPad open onClose={vi.fn()} onSave={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Sketch" });
    const canvas = dialog.querySelector("canvas");
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);

    for (const [target, eventName] of [
      [dialog, "selectstart"],
      [dialog, "contextmenu"],
      [canvas, "touchstart"],
      [canvas, "touchmove"],
      [canvas, "gesturestart"],
    ] as const) {
      const event = new Event(eventName, { bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
  });

  it("prevents pointer defaults while drawing", () => {
    render(<SketchPad open onClose={vi.fn()} onSave={vi.fn()} />);

    const canvas = screen.getByRole("dialog", { name: "Sketch" }).querySelector("canvas");
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);

    const pointerDown = new Event("pointerdown", { bubbles: true, cancelable: true });
    Object.assign(pointerDown, {
      clientX: 12,
      clientY: 18,
      pointerId: 1,
      pointerType: "pen",
      pressure: 0.6,
    });

    canvas.dispatchEvent(pointerDown);

    expect(pointerDown.defaultPrevented).toBe(true);
  });
});
