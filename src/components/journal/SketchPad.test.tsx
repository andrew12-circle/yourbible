import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SketchPad from "./SketchPad";

const canvasContext = {
  fillStyle: "",
  strokeStyle: "",
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

function setPrefersDark(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("SketchPad", () => {
  beforeEach(() => {
    setPrefersDark(false);
    window.localStorage.removeItem("sketchpad:paper");
    Object.assign(canvasContext, { fillStyle: "", strokeStyle: "" });
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

  it("opens with fountain pen selected by default", () => {
    render(<SketchPad open onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Fountain pen" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("blocks browser selection and callout gestures on the sketch surface", () => {
    render(<SketchPad open onClose={vi.fn()} onSave={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Handwritten" });
    const canvas = dialog.querySelector("canvas");
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);

    for (const eventName of ["selectstart", "contextmenu"] as const) {
      const event = new Event(eventName, { bubbles: true, cancelable: true });
      dialog.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }

    if (typeof TouchEvent !== "undefined") {
      const touchStart = new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(touchStart, "touches", {
        value: [{ clientX: 0, clientY: 0 }],
      });
      canvas.dispatchEvent(touchStart);
      expect(touchStart.defaultPrevented).toBe(true);
    }

    const gesture = new Event("gesturestart", { bubbles: true, cancelable: true });
    canvas.dispatchEvent(gesture);
    expect(gesture.defaultPrevented).toBe(true);
  });

  it("shows Apple-style markup toolbar with pen variants", () => {
    render(<SketchPad open onClose={vi.fn()} onSave={vi.fn()} />);

    const toolbar = screen.getByRole("toolbar", { name: "Handwritten markup tools" });
    expect(toolbar).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fountain pen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Highlighter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ruler" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eraser" })).toBeInTheDocument();
    expect(screen.getByText("Closing without saving discards the handwritten note").closest("footer")).toHaveClass("hidden");
  });

  it("uses dark paper and night-safe ink when the device is in night mode", () => {
    setPrefersDark(true);

    render(<SketchPad open onClose={vi.fn()} onSave={vi.fn()} />);

    expect(canvasContext.fillStyle).toBe("#05070a");
    expect(screen.getByRole("button", { name: "Color White" })).toHaveStyle({
      background: "#f8fafc",
    });

    const canvas = screen.getByRole("dialog", { name: "Handwritten" }).querySelector("canvas");
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

    expect(canvasContext.fillStyle).toBe("#f8fafc");
  });

  it("prevents pointer defaults while drawing", () => {
    render(<SketchPad open onClose={vi.fn()} onSave={vi.fn()} />);

    const canvas = screen.getByRole("dialog", { name: "Handwritten" }).querySelector("canvas");
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
