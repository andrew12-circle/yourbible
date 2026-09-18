import { afterEach, describe, expect, it, vi } from "vitest";
import { resizeJournalTextarea } from "./useJournalEntryTextareaAutosize";

afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });
function field(boxSizing = "border-box") {
  const el = document.createElement("textarea");
  el.value = "Synthetic journal text";
  Object.assign(el.style, { boxSizing, padding: "10px", border: "2px solid", height: "800px" });
  Object.defineProperty(el, "offsetWidth", { get: () => 400 });
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(300);
  document.body.appendChild(el);
  return el;
}
describe("non-collapsing journal textarea sizing", () => {
  it("measures a separate field without shrinking the live textarea to auto or zero", () => {
    const el = field();
    const append = vi.spyOn(document.body, "appendChild");
    resizeJournalTextarea(el);
    const mirror = append.mock.calls[0][0] as HTMLTextAreaElement;
    expect(mirror).not.toBe(el);
    expect(mirror.value).toBe(el.value);
    expect(mirror.style.position).toBe("fixed");
    expect(el.style.height).toBe("312px");
    expect(el.style.overflow).toBe("hidden");
    expect(document.querySelectorAll("textarea")).toHaveLength(1);
  });
  it("accounts for padding in content-box sizing and clears internal scrolling", () => {
    const el = field("content-box"); el.scrollTop = 30;
    resizeJournalTextarea(el);
    expect(el.style.height).toBe("288px");
    expect(el.scrollTop).toBe(0);
  });
  it("does not measure fields that are not mounted", () => {
    const el = field(); el.remove();
    resizeJournalTextarea(el);
    expect(el.style.height).toBe("800px");
    expect(document.querySelectorAll("textarea")).toHaveLength(0);
  });
});
