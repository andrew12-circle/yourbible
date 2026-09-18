import { useLayoutEffect, type RefObject } from "react";
import { applyTextareaMirrorStyles } from "@/lib/journal/textareaMirrorStyles";

/** Grow with content without briefly collapsing the live field and clamping the
 * parent's scroll position. Measurement happens in an off-screen textarea. */
export function resizeJournalTextarea(el: HTMLTextAreaElement) {
  if (!el.isConnected || el.offsetWidth === 0) return;
  const cs = getComputedStyle(el);
  const mirror = document.createElement("textarea");
  applyTextareaMirrorStyles(el, mirror);
  for (const prop of ["tabSize", "textIndent", "direction", "whiteSpace", "fontVariant", "fontStretch"] as const) {
    mirror.style[prop] = cs[prop];
  }
  Object.assign(mirror.style, {
    position: "fixed", left: "-100000px", top: "0", visibility: "hidden",
    boxSizing: "border-box", width: `${el.offsetWidth}px`, height: "0",
    minHeight: "0", maxHeight: "none", overflow: "hidden", pointerEvents: "none",
  });
  mirror.rows = 1;
  mirror.wrap = el.wrap;
  mirror.tabIndex = -1;
  mirror.setAttribute("aria-hidden", "true");
  mirror.value = el.value;
  document.body.appendChild(mirror);
  const contentHeight = mirror.scrollHeight;
  mirror.remove();

  const padding = (Number.parseFloat(cs.paddingTop) || 0) + (Number.parseFloat(cs.paddingBottom) || 0);
  const borders = (Number.parseFloat(cs.borderTopWidth) || 0) + (Number.parseFloat(cs.borderBottomWidth) || 0);
  const height = contentHeight + (cs.boxSizing === "border-box" ? borders : -padding) + 8;
  el.style.minHeight = el.value.length ? "0px" : "";
  const floor = el.value.length ? 0 : Number.parseFloat(getComputedStyle(el).minHeight) || 0;
  el.style.height = `${Math.ceil(Math.max(height, floor))}px`;
  el.style.overflow = "hidden";
  // The outer pane owns scrolling. A browser can scroll internally while the
  // input event is still waiting for React's layout effect; discard that offset.
  el.scrollTop = 0;
}

export function useJournalEntryTextareaAutosize(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  enabled = true,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) {
      el.style.height = "";
      el.style.minHeight = "";
      el.style.overflow = "";
      el.style.overflowY = "";
      el.style.overflowX = "";
      return;
    }
    resizeJournalTextarea(el);
  }, [ref, value, enabled]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    let width = el.offsetWidth;
    const resize = () => resizeJournalTextarea(el);
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth === width) return; // Ignore our own height changes.
      width = el.offsetWidth;
      resize();
    });
    observer.observe(el);
    document.fonts?.addEventListener("loadingdone", resize);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", resize);
    };
  }, [ref, enabled]);
}
