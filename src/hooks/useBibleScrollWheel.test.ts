import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useBibleScrollWheel } from "./useBibleScrollWheel";

describe("useBibleScrollWheel", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("forwards wheel deltas while the pane can scroll", () => {
    const el = document.createElement("div");
    el.setAttribute("data-bible-scroll", "");
    Object.defineProperty(el, "scrollHeight", { configurable: true, value: 800 });
    Object.defineProperty(el, "clientHeight", { configurable: true, value: 400 });
    Object.defineProperty(el, "scrollTop", { configurable: true, writable: true, value: 0 });
    const child = document.createElement("p");
    el.appendChild(child);
    document.body.appendChild(el);

    renderHook(() => useBibleScrollWheel(true, "Jhn-1"));

    const event = new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true });
    const prevented = !child.dispatchEvent(event);

    expect(prevented).toBe(true);
    expect(el.scrollTop).toBe(120);
  });

  it("forwards wheel from the ink overlay to the scripture pane", () => {
    const el = document.createElement("div");
    el.setAttribute("data-bible-scroll", "");
    Object.defineProperty(el, "scrollHeight", { configurable: true, value: 800 });
    Object.defineProperty(el, "clientHeight", { configurable: true, value: 400 });
    Object.defineProperty(el, "scrollTop", { configurable: true, writable: true, value: 0 });
    document.body.appendChild(el);

    const layer = document.createElement("div");
    layer.setAttribute("data-reader-ink-layer", "test");
    document.body.appendChild(layer);

    renderHook(() => useBibleScrollWheel(true, "Jhn-1"));

    const event = new WheelEvent("wheel", { deltaY: 80, bubbles: true, cancelable: true });
    layer.dispatchEvent(event);

    expect(el.scrollTop).toBe(80);
  });

  it("does nothing when scroll mode is disabled", () => {
    const el = document.createElement("div");
    el.setAttribute("data-bible-scroll", "");
    Object.defineProperty(el, "scrollHeight", { configurable: true, value: 800 });
    Object.defineProperty(el, "clientHeight", { configurable: true, value: 400 });
    Object.defineProperty(el, "scrollTop", { configurable: true, writable: true, value: 0 });
    document.body.appendChild(el);

    renderHook(() => useBibleScrollWheel(false, "Jhn-1"));

    const event = new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true });
    el.dispatchEvent(event);

    expect(el.scrollTop).toBe(0);
  });
});
