import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { bindVerseOpeningWord } from "./readerVerseLead";

function fixture() {
  const nodes = [<span key="a">{"  Lo"}</span>, <sup key="note">1</sup>, <span key="b" className="red-letter"><span className="scripture-divine-name">rd,</span>{" keep all of these words."}</span>];
  const root = document.createElement("div");
  root.innerHTML = renderToStaticMarkup(<>{bindVerseOpeningWord(nodes, "  Lord, keep all of these words.")}</>);
  return root;
}
describe("verse opening word binding", () => {
  it("binds leading spaces and a word split across formatting without adding UI characters", () => {
    const root = fixture();
    expect(root.querySelector(".reader-verse-first-word")?.textContent).toBe("  Lo1rd,");
    root.querySelectorAll("sup").forEach(n => n.remove());
    expect(root.textContent).toBe("  Lord, keep all of these words.");
    expect(root.textContent).not.toContain("\u2060");
  });
  it("retains note ownership and red-letter styling on both sides of the word boundary", () => {
    const root = fixture();
    expect(root.querySelectorAll("sup")).toHaveLength(1);
    expect(root.querySelector(".reader-verse-first-word .scripture-divine-name")?.textContent).toBe("rd,");
    expect([...root.querySelectorAll(".red-letter")].map(n => n.textContent).join("")).toBe("rd, keep all of these words.");
  });
  it("does not make a long unbroken token impossible to paginate", () => {
    const text = "x".repeat(100), nodes = [text];
    expect(bindVerseOpeningWord(nodes, text)).toBe(nodes);
  });
});
