import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BiblePlate } from "@/lib/bible/biblePlates";
import { ScripturePlate } from "./ScripturePlate";

const plate: BiblePlate = {
  id: "dore-001-gen-1",
  bookAbbr: "Gen",
  chapter: 1,
  beforeVerse: 1,
  title: "The Creation of Light",
  referenceLabel: "Genesis 1:3",
  imageUrl: "https://upload.wikimedia.org/example.jpg",
  alt: "Light over creation",
  artist: "Gustave Dore",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
};

describe("ScripturePlate", () => {
  it("renders the local downloaded artwork while preserving source attribution", () => {
    render(<ScripturePlate plate={plate} />);

    expect(screen.getByRole("img", { name: plate.alt })).toHaveAttribute(
      "src",
      "/bible-plates/dore-001-gen-1.webp",
    );
    expect(screen.getByRole("link", { name: "Source" })).toHaveAttribute(
      "href",
      plate.sourceUrl,
    );
  });

  it("keeps the existing unavailable-artwork fallback when a local file is missing", () => {
    render(<ScripturePlate plate={plate} />);

    fireEvent.error(screen.getByRole("img", { name: plate.alt }));

    expect(screen.getByText("Illustration unavailable")).toBeInTheDocument();
  });
});
