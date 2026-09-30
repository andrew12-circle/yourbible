import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceneCoverImage } from "./SceneCoverImage";

describe("SceneCoverImage", () => {
  it("keeps artwork visible when a saved cover fails, then uses a replacement cover", () => {
    const { container, rerender } = render(<SceneCoverImage src="/expired-cover.png" />);
    const cover = container.querySelector("img")!;
    expect(cover.getAttribute("src")).toBe("/expired-cover.png");

    fireEvent.error(cover);
    expect(cover.getAttribute("src")).toBe("/morning-scenes/peaceful-morning.webp");

    rerender(<SceneCoverImage src="/replacement-cover.png" />);
    expect(cover.getAttribute("src")).toBe("/replacement-cover.png");
  });

  it("gives scenes without an upload an illustrated cover", () => {
    const { container } = render(<SceneCoverImage fallbackSrc="/morning-scenes/ace-working.webp" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/morning-scenes/ace-working.webp");
  });
});
